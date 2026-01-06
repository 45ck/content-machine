/**
 * Publish Schemas
 *
 * Zod schemas for the optional publish stage (`cm publish`).
 */
import { z } from 'zod';
import { PlatformEnum } from '../package/schema';

export const PUBLISH_SCHEMA_VERSION = '1.0.0';

export const ChecklistItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  required: z.boolean().default(true),
});
export type ChecklistItem = z.infer<typeof ChecklistItemSchema>;

export const PublishOutputSchema = z.object({
  schemaVersion: z.string().default(PUBLISH_SCHEMA_VERSION),
  platform: PlatformEnum.default('tiktok'),
  title: z.string().min(1),
  description: z.string().min(1),
  hashtags: z.array(z.string()).default([]),
  coverText: z.string().optional(),
  checklist: z.array(ChecklistItemSchema).min(1),
  createdAt: z.string().datetime(),
  meta: z
    .object({
      model: z.string().optional(),
      promptVersion: z.string().optional(),
      llmCost: z.number().nonnegative().optional(),
    })
    .optional(),
});

export type PublishOutput = z.infer<typeof PublishOutputSchema>;

export const LLMPublishResponseSchema = z.object({
  description: z.string(),
  hashtags: z.array(z.string()).optional(),
  checklist: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        required: z.boolean().optional(),
      })
    )
    .optional(),
});
