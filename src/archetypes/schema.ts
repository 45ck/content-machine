import { z } from 'zod';

export const ArchetypeScriptSpecSchema = z.object({
  template: z.string().min(1),
  systemPrompt: z.string().min(1).optional(),
});

export const ArchetypeSpecSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/i, 'id must be kebab-case (letters/digits/hyphens)'),
  name: z.string().min(1),
  description: z.string().min(1).optional(),
  version: z.number().int().positive().optional(),
  script: ArchetypeScriptSpecSchema,
});

export type ArchetypeSpecInput = z.input<typeof ArchetypeSpecSchema>;
export type ArchetypeSpec = z.infer<typeof ArchetypeSpecSchema>;
