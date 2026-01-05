/**
 * Visuals Schemas
 * 
 * Zod schemas for visual matching output validation.
 * Based on SYSTEM-DESIGN §6.5 VisualPlanSchema
 */
import { z } from 'zod';

/** Current schema version for migrations */
export const VISUALS_SCHEMA_VERSION = '1.0.0';

/**
 * Match reasoning metadata (SYSTEM-DESIGN §6.5 MatchReasoningSchema)
 */
export const MatchReasoningSchema = z.object({
  reasoning: z.string().describe('LLM explanation for selection'),
  conceptsMatched: z.array(z.string()).optional(),
  moodAlignment: z.string().optional(),
  alternatives: z.array(z.object({
    path: z.string(),
    whyNotChosen: z.string(),
  })).optional(),
});

export type MatchReasoning = z.infer<typeof MatchReasoningSchema>;

/**
 * A visual asset (matches SYSTEM-DESIGN §6.5 VisualAssetSchema)
 */
export const VisualAssetSchema = z.object({
  sceneId: z.string(),
  source: z.enum(['user-footage', 'stock-pexels', 'stock-pixabay', 'fallback-color']),
  assetPath: z.string(),
  embeddingSimilarity: z.number().min(0).max(1).optional(),
  llmConfidence: z.number().min(0).max(1).optional(),
  matchReasoning: MatchReasoningSchema.optional(),
  visualCue: z.string().optional(),
  duration: z.number().positive(),
  trimStart: z.number().nonnegative().optional(),
  trimEnd: z.number().positive().optional(),
  trimReasoning: z.string().optional(),
});

export type VisualAsset = z.infer<typeof VisualAssetSchema>;

/**
 * @deprecated Use VisualAssetSchema instead - kept for backward compatibility
 */
export const VideoClipSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  startTime: z.number().nonnegative().describe('When this clip starts in the video'),
  endTime: z.number().positive().describe('When this clip ends in the video'),
  source: z.enum(['pexels', 'pixabay', 'local']),
  sourceId: z.string(),
  searchQuery: z.string().describe('Query used to find this clip'),
  sectionId: z.string().optional().describe('Reference to script section'),
});

export type VideoClip = z.infer<typeof VideoClipSchema>;

/**
 * Keyword extraction result
 */
export const KeywordSchema = z.object({
  keyword: z.string(),
  sectionId: z.string(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  visualHint: z.string().optional(),
});

export type Keyword = z.infer<typeof KeywordSchema>;

/**
 * Full visuals output (matches SYSTEM-DESIGN §6.5 VisualPlanSchema)
 */
export const VisualsOutputSchema = z.object({
  schemaVersion: z.string().default(VISUALS_SCHEMA_VERSION),
  scenes: z.array(VisualAssetSchema).describe('Per-scene visual assets'),
  totalAssets: z.number().int().nonnegative(),
  fromUserFootage: z.number().int().nonnegative(),
  fromStock: z.number().int().nonnegative(),
  fallbacks: z.number().int().nonnegative(),
  embeddingModel: z.string().optional(),
  reasoningModel: z.string().optional(),
  provider: z.string().optional().describe('@deprecated Use source in scenes'),
  
  // Legacy fields for backward compatibility
  clips: z.array(VideoClipSchema).optional().describe('@deprecated Use scenes'),
  keywords: z.array(KeywordSchema).optional(),
  totalDuration: z.number().positive().optional(),
  fallbacksUsed: z.number().int().nonnegative().optional().describe('@deprecated Use fallbacks'),
});

export type VisualsOutput = z.infer<typeof VisualsOutputSchema>;
