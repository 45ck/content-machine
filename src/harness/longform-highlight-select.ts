import { resolve } from 'node:path';
import { z } from 'zod';
import {
  HighlightSelectionOutputSchema,
  SourceMediaAnalysisOutputSchema,
  TimestampsOutputSchema,
} from '../domain';
import { selectHighlightCandidates } from '../highlights';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { createJsonlProgressEmitter } from './progress';

export const LongformHighlightSelectRequestSchema = z
  .object({
    timestampsPath: z.string().min(1),
    outputPath: z
      .string()
      .min(1)
      .default('output/content-machine/highlights/highlight-candidates.v1.json'),
    sourceMediaPath: z.string().min(1).optional(),
    minDuration: z.number().positive().default(20),
    targetDuration: z.number().positive().default(35),
    maxDuration: z.number().positive().default(60),
    maxCandidates: z.number().int().positive().default(5),
    minWords: z.number().int().positive().default(8),
    minGapSeconds: z.number().nonnegative().default(3),
    sourceDuration: z.number().positive().optional(),
    sourceAnalysisPath: z.string().min(1).optional(),
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

export type LongformHighlightSelectRequest = z.input<typeof LongformHighlightSelectRequestSchema>;

export async function runLongformHighlightSelect(request: LongformHighlightSelectRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    selectedCandidateId: string | null;
    candidateCount: number;
    topScore: number | null;
    topStart: number | null;
    topEnd: number | null;
  }>
> {
  const normalized = LongformHighlightSelectRequestSchema.parse(request);
  const timestampsPath = resolve(normalized.timestampsPath);
  const outputPath = resolve(normalized.outputPath);
  const progress = createJsonlProgressEmitter({ progressPath: normalized.progressPath });

  await progress.emit({
    tool: 'content-machine/longform-highlight-select',
    stage: 'read-timestamps',
    status: 'started',
    progress: 0.1,
  });
  const timestamps = await readJsonArtifact(
    timestampsPath,
    TimestampsOutputSchema,
    'timestamps artifact'
  );
  const sourceAnalysis = normalized.sourceAnalysisPath
    ? await readJsonArtifact(
        resolve(normalized.sourceAnalysisPath),
        SourceMediaAnalysisOutputSchema,
        'source media analysis artifact'
      )
    : null;

  await progress.emit({
    tool: 'content-machine/longform-highlight-select',
    stage: 'select-candidates',
    status: 'progress',
    progress: 0.45,
  });
  const selection = HighlightSelectionOutputSchema.parse(
    selectHighlightCandidates(timestamps, {
      timestampsPath,
      sourceMediaPath: normalized.sourceMediaPath ? resolve(normalized.sourceMediaPath) : null,
      sourceDuration: normalized.sourceDuration ?? sourceAnalysis?.probe.durationSeconds ?? null,
      sourceAnalysis,
      minDuration: normalized.minDuration,
      targetDuration: normalized.targetDuration,
      maxDuration: normalized.maxDuration,
      maxCandidates: normalized.maxCandidates,
      minWords: normalized.minWords,
      minGapSeconds: normalized.minGapSeconds,
    })
  );

  await writeJsonArtifact(outputPath, selection);
  await progress.emit({
    tool: 'content-machine/longform-highlight-select',
    stage: 'write-output',
    status: 'completed',
    progress: 1,
    message: outputPath,
  });

  const top = selection.candidates[0] ?? null;
  return {
    result: {
      outputPath,
      selectedCandidateId: selection.selectedCandidateId,
      candidateCount: selection.candidates.length,
      topScore: top?.scores.total ?? null,
      topStart: top?.start ?? null,
      topEnd: top?.end ?? null,
    },
    artifacts: [artifactFile(outputPath, 'Highlight candidate artifact')],
    warnings: selection.warnings,
  };
}
