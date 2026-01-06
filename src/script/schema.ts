/**
 * Script Schemas
 *
 * Zod schemas for script generation output validation.
 * Based on SYSTEM-DESIGN §6.3 GeneratedScriptSchema
 */
import { z } from 'zod';

/** Current schema version for migrations */
export const SCRIPT_SCHEMA_VERSION = '1.0.0';

/**
 * A single scene in the script (maps to SYSTEM-DESIGN §6.3 SceneSchema)
 */
export const SceneSchema = z.object({
  id: z.string().describe('Unique scene identifier'),
  text: z.string().min(1).describe('The spoken text for this scene'),
  visualDirection: z.string().describe('Direction for visual matching'),
  duration: z.number().positive().optional().describe('Estimated duration in seconds'),
  mood: z.string().optional().describe('Emotional mood of the scene'),
  sources: z.array(z.string().url()).optional().describe('Evidence URLs cited in this scene'),
  extra: z.record(z.unknown()).optional().describe('Freeform LLM extension data'),
});

export type Scene = z.infer<typeof SceneSchema>;

/**
 * @deprecated Use SceneSchema instead - kept for backward compatibility
 */
export const ScriptSectionSchema = z.object({
  id: z.string().describe('Unique section identifier'),
  type: z
    .enum(['hook', 'intro', 'point', 'transition', 'conclusion', 'cta'])
    .describe('Section type'),
  text: z.string().min(1).describe('The spoken text for this section'),
  visualHint: z.string().optional().describe('Hint for visual matching'),
  duration: z.number().positive().optional().describe('Estimated duration in seconds'),
  order: z.number().int().nonnegative().describe('Section order (0-indexed)'),
});

export type ScriptSection = z.infer<typeof ScriptSectionSchema>;

/**
 * Script metadata (matches SYSTEM-DESIGN §6.3 meta object)
 */
export const ScriptMetadataSchema = z.object({
  estimatedDuration: z.number().positive().optional().describe('Estimated duration in seconds'),
  wordCount: z.number().int().nonnegative().optional(),
  archetype: z.string(),
  topic: z.string(),
  generatedAt: z.string().datetime(),
  model: z.string().optional().describe('LLM model used'),
  promptVersion: z.string().optional().describe('Version of prompt template used'),
  llmCost: z.number().nonnegative().optional(),
});

export type ScriptMetadata = z.infer<typeof ScriptMetadataSchema>;

/**
 * Complete script output (matches SYSTEM-DESIGN §6.3 GeneratedScriptSchema)
 */
export const ScriptOutputSchema = z.object({
  schemaVersion: z.string().default(SCRIPT_SCHEMA_VERSION),
  scenes: z.array(SceneSchema).min(1).describe('Video scenes'),
  reasoning: z.string().describe('LLM reasoning for debugging'),
  title: z.string().optional().describe('Video title'),
  hook: z.string().optional().describe('Opening hook'),
  cta: z.string().optional().describe('Call to action'),
  hashtags: z.array(z.string()).optional().describe('Suggested hashtags'),
  meta: ScriptMetadataSchema.optional(),
  extra: z.record(z.unknown()).optional().describe('Freeform LLM extension data'),

  // Legacy fields for backward compatibility
  sections: z.array(ScriptSectionSchema).optional().describe('@deprecated Use scenes'),
  metadata: ScriptMetadataSchema.optional().describe('@deprecated Use meta'),
});

export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;

/**
 * LLM response schema for script generation
 * (What we expect the LLM to return - minimal structure)
 */
export const LLMScriptResponseSchema = z.object({
  scenes: z.array(
    z.object({
      text: z.string(),
      visualDirection: z.string(),
      mood: z.string().optional(),
    })
  ),
  reasoning: z.string(),
  title: z.string().optional(),
  hook: z.string().optional(),
  cta: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
});

export type LLMScriptResponse = z.infer<typeof LLMScriptResponseSchema>;
