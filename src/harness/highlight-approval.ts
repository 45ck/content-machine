import { resolve } from 'node:path';
import { z } from 'zod';
import { HighlightApprovalOutputSchema, HighlightSelectionOutputSchema } from '../domain';
import { createHighlightApproval } from '../highlights';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { createJsonlProgressEmitter } from './progress';

export const HighlightApprovalRequestSchema = z
  .object({
    candidatesPath: z.string().min(1),
    outputPath: z
      .string()
      .min(1)
      .default('output/content-machine/highlights/highlight-approval.v1.json'),
    approvedCandidateIds: z.array(z.string().min(1)).optional(),
    rejectedCandidateIds: z.array(z.string().min(1)).optional(),
    notesByCandidateId: z.record(z.string().min(1), z.string().nullable()).optional(),
    actor: z.string().min(1).default('local-agent'),
    progressPath: z.string().min(1).optional(),
  })
  .strict();

export type HighlightApprovalRequest = z.input<typeof HighlightApprovalRequestSchema>;

export async function runHighlightApproval(request: HighlightApprovalRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    approvedCandidateIds: string[];
    rejectedCandidateIds: string[];
    decisionCount: number;
  }>
> {
  const normalized = HighlightApprovalRequestSchema.parse(request);
  const candidatesPath = resolve(normalized.candidatesPath);
  const outputPath = resolve(normalized.outputPath);
  const progress = createJsonlProgressEmitter({ progressPath: normalized.progressPath });

  await progress.emit({
    tool: 'content-machine/highlight-approval',
    stage: 'read-candidates',
    status: 'started',
    progress: 0.2,
  });
  const candidates = await readJsonArtifact(
    candidatesPath,
    HighlightSelectionOutputSchema,
    'highlight candidate artifact'
  );

  const approval = HighlightApprovalOutputSchema.parse(
    createHighlightApproval(candidates, {
      sourceCandidatesPath: candidatesPath,
      approvedCandidateIds: normalized.approvedCandidateIds,
      rejectedCandidateIds: normalized.rejectedCandidateIds,
      notesByCandidateId: normalized.notesByCandidateId,
      actor: normalized.actor,
    })
  );

  await writeJsonArtifact(outputPath, approval);
  await progress.emit({
    tool: 'content-machine/highlight-approval',
    stage: 'write-output',
    status: 'completed',
    progress: 1,
    message: outputPath,
  });

  return {
    result: {
      outputPath,
      approvedCandidateIds: approval.approvedCandidateIds,
      rejectedCandidateIds: approval.rejectedCandidateIds,
      decisionCount: approval.decisions.length,
    },
    artifacts: [artifactFile(outputPath, 'Highlight approval artifact')],
    warnings: approval.warnings,
  };
}
