import { join, resolve } from 'node:path';
import { z } from 'zod';
import {
  BoundarySnapOutputSchema,
  HighlightApprovalOutputSchema,
  HighlightSelectionOutputSchema,
  type BoundarySnapOutput,
  type HighlightApprovalOutput,
  type HighlightSelectionOutput,
} from '../domain';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { runBoundarySnap } from './boundary-snap';
import { runHighlightApproval } from './highlight-approval';
import { runLongformHighlightSelect } from './longform-highlight-select';
import { runSourceMediaAnalyze } from './source-media-analyze';
import {
  artifactDirectory,
  artifactFile,
  type HarnessArtifact,
  type HarnessToolResult,
} from './json-stdio';

export const LongformToShortsRequestSchema = z
  .object({
    timestampsPath: z.string().min(1),
    sourceMediaPath: z.string().min(1).optional(),
    outputDir: z.string().min(1).default('output/content-machine/longform-to-shorts'),
    sourceAnalysisPath: z.string().min(1).optional(),
    candidatesPath: z.string().min(1).optional(),
    boundarySnapPath: z.string().min(1).optional(),
    approvalPath: z.string().min(1).optional(),
    renderHandoffPath: z.string().min(1).optional(),
    analyzeSource: z.boolean().default(true),
    snapBoundaries: z.boolean().default(true),
    autoApproveSelected: z.boolean().default(false),
    approvedCandidateIds: z.array(z.string().min(1)).optional(),
    rejectedCandidateIds: z.array(z.string().min(1)).optional(),
    notesByCandidateId: z.record(z.string().min(1), z.string().nullable()).optional(),
    actor: z.string().min(1).default('local-agent'),
    minDuration: z.number().positive().default(20),
    targetDuration: z.number().positive().default(35),
    maxDuration: z.number().positive().default(60),
    maxCandidates: z.number().int().positive().default(5),
    minWords: z.number().int().positive().default(8),
    minGapSeconds: z.number().nonnegative().default(3),
    maxLeadSeconds: z.number().nonnegative().default(0.9),
    maxTailSeconds: z.number().nonnegative().default(1.1),
    sourceDuration: z.number().positive().optional(),
    ffmpegPath: z.string().min(1).optional(),
    ffprobePath: z.string().min(1).optional(),
    progressPath: z.string().min(1).optional(),
  })
  .strict()
  .refine((value) => value.maxDuration >= value.minDuration, {
    message: 'maxDuration must be >= minDuration',
  })
  .refine((value) => value.targetDuration >= value.minDuration, {
    message: 'targetDuration must be >= minDuration',
  })
  .refine((value) => value.targetDuration <= value.maxDuration, {
    message: 'targetDuration must be <= maxDuration',
  });

export type LongformToShortsRequest = z.input<typeof LongformToShortsRequestSchema>;

interface LongformRenderHandoff {
  schemaVersion: '1.0.0';
  createdAt: string;
  status: 'needs-approval' | 'approved-plan';
  source: {
    mediaPath: string | null;
    timestampsPath: string;
    sourceAnalysisPath: string | null;
    candidatesPath: string;
    boundarySnapPath: string | null;
    approvalPath: string | null;
  };
  selectedCandidateId: string | null;
  approvedCandidateIds: string[];
  candidatePlans: Array<{
    id: string;
    rank: number;
    score: number;
    approval: 'pending' | 'approved' | 'rejected';
    approvalNotes: string | null;
    originalStart: number;
    originalEnd: number;
    snappedStart: number;
    snappedEnd: number;
    duration: number;
    wordStartIndex: number;
    wordEndIndex: number;
    text: string;
  }>;
  renderInputsRequired: string[];
  nextSteps: string[];
  warnings: string[];
}

function dedupeArtifacts(artifacts: HarnessArtifact[]): HarnessArtifact[] {
  const unique = new Map<string, HarnessArtifact>();
  for (const artifact of artifacts) {
    unique.set(`${artifact.kind}:${artifact.path}`, artifact);
  }
  return [...unique.values()];
}

function explicitApprovalRequested(input: z.output<typeof LongformToShortsRequestSchema>): boolean {
  return (
    input.autoApproveSelected ||
    input.approvedCandidateIds !== undefined ||
    input.rejectedCandidateIds !== undefined ||
    input.notesByCandidateId !== undefined
  );
}

function buildRenderHandoff(params: {
  sourceMediaPath: string | null;
  timestampsPath: string;
  sourceAnalysisPath: string | null;
  candidatesPath: string;
  boundarySnapPath: string | null;
  approvalPath: string | null;
  selection: HighlightSelectionOutput;
  boundarySnap: BoundarySnapOutput | null;
  approval: HighlightApprovalOutput | null;
  warnings: string[];
}): LongformRenderHandoff {
  const snapById = new Map(
    (params.boundarySnap?.candidates ?? []).map((candidate) => [candidate.id, candidate])
  );
  const approvedById = new Map(
    (params.approval?.candidates ?? []).map((candidate) => [candidate.id, candidate])
  );
  const approvedCandidateIds = params.approval?.approvedCandidateIds ?? [];

  return {
    schemaVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    status: approvedCandidateIds.length > 0 ? 'approved-plan' : 'needs-approval',
    source: {
      mediaPath: params.sourceMediaPath,
      timestampsPath: params.timestampsPath,
      sourceAnalysisPath: params.sourceAnalysisPath,
      candidatesPath: params.candidatesPath,
      boundarySnapPath: params.boundarySnapPath,
      approvalPath: params.approvalPath,
    },
    selectedCandidateId: params.selection.selectedCandidateId,
    approvedCandidateIds,
    candidatePlans: params.selection.candidates.map((candidate) => {
      const snapped = snapById.get(candidate.id);
      const approved = approvedById.get(candidate.id);
      const snappedStart = snapped?.snappedStart ?? candidate.start;
      const snappedEnd = snapped?.snappedEnd ?? candidate.end;

      return {
        id: candidate.id,
        rank: candidate.rank,
        score: candidate.scores.total,
        approval: approved?.approval ?? candidate.approval,
        approvalNotes: approved?.approvalNotes ?? candidate.approvalNotes,
        originalStart: candidate.start,
        originalEnd: candidate.end,
        snappedStart,
        snappedEnd,
        duration: Math.max(0.001, snappedEnd - snappedStart),
        wordStartIndex: snapped?.wordStartIndex ?? candidate.wordStartIndex,
        wordEndIndex: snapped?.wordEndIndex ?? candidate.wordEndIndex,
        text: candidate.text,
      };
    }),
    renderInputsRequired: [
      'source clip or clip-local audioPath',
      'timestampsPath',
      'visualsPath',
      'outputPath',
    ],
    nextSteps: [
      'Review candidatePlans and choose approvedCandidateIds if approval is still pending.',
      'Cut sourceMediaPath to snappedStart/snappedEnd for each approved candidate.',
      'Run reframe-vertical, face-or-screen-reframe, or scene-aware-smart-crop for non-portrait clips.',
      'Create clip-local audio, timestamps, and visuals artifacts before calling video-render.',
      'Run publish-prep-review before calling any rendered MP4 ready.',
    ],
    warnings: params.warnings,
  };
}

/** Execute the longform selection, boundary cleanup, optional approval, and render handoff path. */
export async function runLongformToShorts(request: LongformToShortsRequest): Promise<
  HarnessToolResult<{
    outputDir: string;
    sourceAnalysisPath: string | null;
    candidatesPath: string;
    boundarySnapPath: string | null;
    approvalPath: string | null;
    renderHandoffPath: string;
    candidateCount: number;
    selectedCandidateId: string | null;
    approvedCandidateIds: string[];
    status: 'needs-approval' | 'approved-plan';
    nextAction: string;
  }>
> {
  const normalized = LongformToShortsRequestSchema.parse(request);
  const outputDir = resolve(normalized.outputDir);
  const timestampsPath = resolve(normalized.timestampsPath);
  const sourceMediaPath = normalized.sourceMediaPath ? resolve(normalized.sourceMediaPath) : null;
  const warnings: string[] = [];
  const artifacts: HarnessArtifact[] = [
    artifactDirectory(outputDir, 'Longform-to-shorts output directory'),
  ];

  let sourceAnalysisPath = normalized.sourceAnalysisPath
    ? resolve(normalized.sourceAnalysisPath)
    : null;

  if (sourceMediaPath && normalized.analyzeSource && !sourceAnalysisPath) {
    sourceAnalysisPath = resolve(join(outputDir, 'highlights', 'source-media-analysis.v1.json'));
    const analysis = await runSourceMediaAnalyze({
      mediaPath: sourceMediaPath,
      outputPath: sourceAnalysisPath,
      ffmpegPath: normalized.ffmpegPath,
      ffprobePath: normalized.ffprobePath,
      progressPath: normalized.progressPath,
    });
    artifacts.push(...(analysis.artifacts ?? []));
    warnings.push(...(analysis.warnings ?? []));
  } else if (!sourceMediaPath) {
    warnings.push('No sourceMediaPath provided; source-media-analyze was skipped.');
  } else if (!sourceAnalysisPath) {
    warnings.push(
      'source-media-analyze was skipped by request; candidate scoring will not use media signals.'
    );
  }

  const candidatesPath = resolve(
    normalized.candidatesPath ?? join(outputDir, 'highlights', 'highlight-candidates.v1.json')
  );
  const selectionResult = await runLongformHighlightSelect({
    timestampsPath,
    outputPath: candidatesPath,
    sourceMediaPath: sourceMediaPath ?? undefined,
    sourceAnalysisPath: sourceAnalysisPath ?? undefined,
    minDuration: normalized.minDuration,
    targetDuration: normalized.targetDuration,
    maxDuration: normalized.maxDuration,
    maxCandidates: normalized.maxCandidates,
    minWords: normalized.minWords,
    minGapSeconds: normalized.minGapSeconds,
    sourceDuration: normalized.sourceDuration,
    progressPath: normalized.progressPath,
  });
  artifacts.push(...(selectionResult.artifacts ?? []));
  warnings.push(...(selectionResult.warnings ?? []));

  let boundarySnapPath: string | null = null;
  if (normalized.snapBoundaries) {
    boundarySnapPath = resolve(
      normalized.boundarySnapPath ?? join(outputDir, 'highlights', 'boundary-snap.v1.json')
    );
    const boundaryResult = await runBoundarySnap({
      candidatesPath,
      timestampsPath,
      outputPath: boundarySnapPath,
      maxLeadSeconds: normalized.maxLeadSeconds,
      maxTailSeconds: normalized.maxTailSeconds,
      minDuration: normalized.minDuration,
      maxDuration: normalized.maxDuration,
      progressPath: normalized.progressPath,
    });
    artifacts.push(...(boundaryResult.artifacts ?? []));
    warnings.push(...(boundaryResult.warnings ?? []));
  }

  let approvalPath: string | null = null;
  if (explicitApprovalRequested(normalized)) {
    approvalPath = resolve(
      normalized.approvalPath ?? join(outputDir, 'highlights', 'highlight-approval.v1.json')
    );
    const approvalResult = await runHighlightApproval({
      candidatesPath,
      outputPath: approvalPath,
      approvedCandidateIds: normalized.approvedCandidateIds,
      rejectedCandidateIds: normalized.rejectedCandidateIds,
      notesByCandidateId: normalized.notesByCandidateId,
      actor: normalized.actor,
      progressPath: normalized.progressPath,
    });
    artifacts.push(...(approvalResult.artifacts ?? []));
    warnings.push(...(approvalResult.warnings ?? []));
  } else {
    warnings.push(
      'No highlight approval was written; review candidates before clipping or rendering.'
    );
  }

  const selection = await readJsonArtifact(
    candidatesPath,
    HighlightSelectionOutputSchema,
    'highlight candidate artifact'
  );
  const boundarySnap = boundarySnapPath
    ? await readJsonArtifact(boundarySnapPath, BoundarySnapOutputSchema, 'boundary snap artifact')
    : null;
  const approval = approvalPath
    ? await readJsonArtifact(
        approvalPath,
        HighlightApprovalOutputSchema,
        'highlight approval artifact'
      )
    : null;

  const renderHandoffPath = resolve(
    normalized.renderHandoffPath ?? join(outputDir, 'handoff', 'render-handoff.v1.json')
  );
  const renderHandoff = buildRenderHandoff({
    sourceMediaPath,
    timestampsPath,
    sourceAnalysisPath,
    candidatesPath,
    boundarySnapPath,
    approvalPath,
    selection,
    boundarySnap,
    approval,
    warnings,
  });
  await writeJsonArtifact(renderHandoffPath, renderHandoff);
  artifacts.push(artifactFile(renderHandoffPath, 'Longform render handoff artifact'));

  return {
    result: {
      outputDir,
      sourceAnalysisPath,
      candidatesPath,
      boundarySnapPath,
      approvalPath,
      renderHandoffPath,
      candidateCount: selection.candidates.length,
      selectedCandidateId: selection.selectedCandidateId,
      approvedCandidateIds: renderHandoff.approvedCandidateIds,
      status: renderHandoff.status,
      nextAction:
        renderHandoff.status === 'approved-plan'
          ? 'Cut approved source ranges, reframe if needed, then create render inputs.'
          : 'Review highlight candidates and rerun with approvedCandidateIds before clipping or rendering.',
    },
    artifacts: dedupeArtifacts(artifacts),
    warnings,
  };
}
