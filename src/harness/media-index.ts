import { resolve } from 'node:path';
import { z } from 'zod';
import { MediaIndexSchema, SourceMediaAnalysisOutputSchema } from '../domain';
import { buildMediaIndex } from '../library';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';

const MediaIndexInputItemSchema = z
  .object({
    path: z.string().min(1),
    analysisPath: z.string().min(1).optional(),
    category: z.string().nullable().optional(),
    tags: z.array(z.string().min(1)).default([]),
    transcriptPath: z.string().min(1).nullable().optional(),
    metadata: z.record(z.unknown()).default({}),
  })
  .strict();

export const MediaIndexRequestSchema = z
  .object({
    indexPath: z.string().min(1).default('output/content-machine/library/media-index.v1.json'),
    items: z.array(MediaIndexInputItemSchema).min(1),
    existingIndexPath: z.string().min(1).optional(),
  })
  .strict();

export type MediaIndexRequest = z.input<typeof MediaIndexRequestSchema>;

export async function runMediaIndex(request: MediaIndexRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    itemCount: number;
  }>
> {
  const normalized = MediaIndexRequestSchema.parse(request);
  const outputPath = resolve(normalized.indexPath);
  const existing = normalized.existingIndexPath
    ? await readJsonArtifact(resolve(normalized.existingIndexPath), MediaIndexSchema, 'media index')
    : null;
  const items = await Promise.all(
    normalized.items.map(async (item) => ({
      path: resolve(item.path),
      category: item.category,
      tags: item.tags,
      transcriptPath: item.transcriptPath ? resolve(item.transcriptPath) : null,
      metadata: item.metadata,
      analysis: item.analysisPath
        ? await readJsonArtifact(
            resolve(item.analysisPath),
            SourceMediaAnalysisOutputSchema,
            'source media analysis'
          )
        : null,
    }))
  );
  const index = buildMediaIndex(items, existing);

  await writeJsonArtifact(outputPath, index);

  return {
    result: {
      outputPath,
      itemCount: index.items.length,
    },
    artifacts: [artifactFile(outputPath, 'Media index artifact')],
    warnings: index.warnings,
  };
}
