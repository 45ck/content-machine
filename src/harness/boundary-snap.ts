import { resolve } from 'node:path';
import { z } from 'zod';
import {
  BoundarySnapOutputSchema,
  HighlightSelectionOutputSchema,
  TimestampsOutputSchema,
} from '../domain';
import { snapHighlightBoundaries } from '../highlights';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { createJsonlProgressEmitter } from './progress';

export const BoundarySnapRequestSchema = z
  .object({
    candidatesPath: z.string().min(1),
    timestampsPath: z.string().min(1),
    outputPath: z
      .string()
      .min(1)
      .default('output/content-machine/highlights/boundary-snap.v1.json'),
    maxLeadSeconds: z.number().nonnegative().default(0.9),
    maxTailSeconds: z.number().nonnegative().default(1.1),
    minDuration: z.number().positive().optional(),
    maxDuration: z.number().positive().optional(),
    progressPath: z.string().min(1).optional(),
  })
  .strict();

export type BoundarySnapRequest = z.input<typeof BoundarySnapRequestSchema>;

export async function runBoundarySnap(request: BoundarySnapRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    snappedCandidateCount: number;
  }>
> {
  const normalized = BoundarySnapRequestSchema.parse(request);
  const candidatesPath = resolve(normalized.candidatesPath);
  const timestampsPath = resolve(normalized.timestampsPath);
  const outputPath = resolve(normalized.outputPath);
  const progress = createJsonlProgressEmitter({ progressPath: normalized.progressPath });

  await progress.emit({
    tool: 'content-machine/boundary-snap',
    stage: 'read-inputs',
    status: 'started',
    progress: 0.2,
  });
  const [candidates, timestamps] = await Promise.all([
    readJsonArtifact(
      candidatesPath,
      HighlightSelectionOutputSchema,
      'highlight candidate artifact'
    ),
    readJsonArtifact(timestampsPath, TimestampsOutputSchema, 'timestamps artifact'),
  ]);

  const snapped = BoundarySnapOutputSchema.parse(
    snapHighlightBoundaries(timestamps, candidates, {
      sourceCandidatesPath: candidatesPath,
      sourceTimestampsPath: timestampsPath,
      maxLeadSeconds: normalized.maxLeadSeconds,
      maxTailSeconds: normalized.maxTailSeconds,
      minDuration: normalized.minDuration,
      maxDuration: normalized.maxDuration,
    })
  );

  await writeJsonArtifact(outputPath, snapped);
  await progress.emit({
    tool: 'content-machine/boundary-snap',
    stage: 'write-output',
    status: 'completed',
    progress: 1,
    message: outputPath,
  });

  return {
    result: {
      outputPath,
      snappedCandidateCount: snapped.candidates.length,
    },
    artifacts: [artifactFile(outputPath, 'Boundary snap artifact')],
    warnings: snapped.warnings,
  };
}
