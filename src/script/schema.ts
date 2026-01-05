/**
 * Script Schemas
 * 
 * Zod schemas for script generation output validation.
 */
import { z } from 'zod';

/**
 * A single section of the script
 */
export const ScriptSectionSchema = z.object({
  id: z.string().describe('Unique section identifier'),
  type: z.enum(['hook', 'intro', 'point', 'transition', 'conclusion', 'cta'])
    .describe('Section type'),
  text: z.string().min(1).describe('The spoken text for this section'),
  visualHint: z.string().optional().describe('Hint for visual matching'),
  duration: z.number().positive().optional().describe('Estimated duration in seconds'),
  order: z.number().int().nonnegative().describe('Section order (0-indexed)'),
});

export type ScriptSection = z.infer<typeof ScriptSectionSchema>;

/**
 * Script metadata
 */
export const ScriptMetadataSchema = z.object({
  wordCount: z.number().int().nonnegative(),
  estimatedDuration: z.number().positive().describe('Estimated duration in seconds'),
  archetype: z.string(),
  topic: z.string(),
  generatedAt: z.string().datetime(),
  llmModel: z.string().optional(),
  llmCost: z.number().nonnegative().optional(),
});

export type ScriptMetadata = z.infer<typeof ScriptMetadataSchema>;

/**
 * Complete script output
 */
export const ScriptOutputSchema = z.object({
  title: z.string().min(1).describe('Video title'),
  hook: z.string().min(1).describe('Opening hook (first 3 seconds)'),
  sections: z.array(ScriptSectionSchema).min(1).describe('Script sections'),
  cta: z.string().optional().describe('Call to action'),
  metadata: ScriptMetadataSchema,
});

export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;

/**
 * LLM response schema for script generation
 * (What we expect the LLM to return)
 */
export const LLMScriptResponseSchema = z.object({
  title: z.string(),
  hook: z.string(),
  sections: z.array(z.object({
    type: z.enum(['hook', 'intro', 'point', 'transition', 'conclusion', 'cta']),
    text: z.string(),
    visualHint: z.string().optional(),
  })),
  cta: z.string().optional(),
});

export type LLMScriptResponse = z.infer<typeof LLMScriptResponseSchema>;
