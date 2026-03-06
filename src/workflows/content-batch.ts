import { readFile } from 'fs/promises';
import { z } from 'zod';
import { ArchetypeEnum } from '../core/config';
import { SchemaError } from '../core/errors';
import { WorkflowIdSchema } from '../domain/ids';

export const CONTENT_BATCH_SCHEMA_VERSION = '1.0.0';

export const ContentBatchItemSchema = z.object({
  id: WorkflowIdSchema,
  topic: z.string().min(1),
  workflow: WorkflowIdSchema,
  archetype: ArchetypeEnum,
  template: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export type ContentBatchItem = z.infer<typeof ContentBatchItemSchema>;

export const ContentBatchSchema = z.object({
  schemaVersion: z.literal(CONTENT_BATCH_SCHEMA_VERSION).default(CONTENT_BATCH_SCHEMA_VERSION),
  id: WorkflowIdSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  items: z.array(ContentBatchItemSchema).min(1),
});

export type ContentBatch = z.infer<typeof ContentBatchSchema>;

export async function loadContentBatch(path: string): Promise<ContentBatch> {
  const raw = await readFile(path, 'utf-8');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new SchemaError('Invalid content batch JSON', {
      path,
      error: error instanceof Error ? error.message : String(error),
      fix: 'Fix JSON syntax in the content batch fixture',
    });
  }

  const parsed = ContentBatchSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new SchemaError('Invalid content batch fixture', {
      path,
      issues: parsed.error.issues,
      fix: 'Fix schema issues in the content batch fixture',
    });
  }

  return parsed.data;
}
