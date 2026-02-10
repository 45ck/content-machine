import { z } from 'zod';
import { ArchetypeIdSchema } from '../domain/ids';

export const ArchetypeScriptSpecSchema = z.object({
  template: z.string().min(1),
  systemPrompt: z.string().min(1).optional(),
});

/**
 * Ubiquitous Language: Script archetype schema (data-defined script format).
 */
export const ArchetypeSpecSchema = z.object({
  id: ArchetypeIdSchema,
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  version: z.number().int().positive().optional(),
  script: ArchetypeScriptSpecSchema,
});

export type ArchetypeSpecInput = z.input<typeof ArchetypeSpecSchema>;

/**
 * Ubiquitous Language: Script archetype.
 */
export type ArchetypeSpec = z.infer<typeof ArchetypeSpecSchema>;
