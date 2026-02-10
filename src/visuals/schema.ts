/**
 * Visuals Schemas
 *
 * Zod schemas for visual matching output validation.
 * Based on SYSTEM-DESIGN §6.5 VisualPlanSchema
 *
 * Extended in v1.1 to support AI-generated images and motion strategies.
 * See ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md
 */
import { z } from 'zod';

/** Current schema version for migrations */
export const VISUALS_SCHEMA_VERSION = '1.1.0';

/**
 * All valid visual sources.
 *
 * Video sources (no motion needed):
 * - stock-pexels, stock-pixabay, user-footage
 *
 * Image sources (require motion strategy):
 * - generated-nanobanana, generated-dalle, stock-unsplash
 *
 * Fallbacks:
 * - fallback-color, mock
 */
/**
 * Ubiquitous Language: Visual source discriminator.
 */
export const VisualSourceEnum = z.enum([
  // Video sources (no motion needed)
  'stock-pexels',
  'stock-pixabay',
  'user-footage',

  // Image sources (require motion strategy)
  'generated-nanobanana',
  'generated-dalle',
  'stock-unsplash',

  // Fallbacks
  'fallback-color',
  'mock',
]);

/**
 * Ubiquitous Language: Visual source discriminator.
 */
export type VisualSource = z.infer<typeof VisualSourceEnum>;

/**
 * Motion strategy for animating static images.
 *
 * - none: No motion (pass-through for videos)
 * - kenburns: FFmpeg zoom/pan effect (free)
 * - depthflow: 2.5D parallax animation (free)
 * - veo: Google Veo image-to-video (~$0.50/clip)
 */
/**
 * Ubiquitous Language: Motion strategy for animating static images.
 */
export const MotionStrategyEnum = z.enum(['none', 'kenburns', 'depthflow', 'veo']);

/**
 * Ubiquitous Language: Motion strategy type.
 */
export type MotionStrategyType = z.infer<typeof MotionStrategyEnum>;

/**
 * Match reasoning metadata (SYSTEM-DESIGN §6.5 MatchReasoningSchema)
 */
export const MatchReasoningSchema = z.object({
  reasoning: z.string().describe('LLM explanation for selection'),
  conceptsMatched: z.array(z.string()).optional(),
  moodAlignment: z.string().optional(),
  alternatives: z
    .array(
      z.object({
        path: z.string(),
        whyNotChosen: z.string(),
      })
    )
    .optional(),
});

export type MatchReasoning = z.infer<typeof MatchReasoningSchema>;

/**
 * A visual asset (matches SYSTEM-DESIGN §6.5 VisualAssetSchema)
 *
 * Extended in v1.1 to support:
 * - AI-generated images (generated-nanobanana, generated-dalle)
 * - Motion strategies for static images
 * - Generation metadata (prompt, model, cost)
 */
const VisualAssetBaseSchema = z.object({
  sceneId: z.string(),
  source: VisualSourceEnum,
  assetPath: z.string(),
  duration: z.number().positive(),

  // Asset type discriminator (v1.1) - optional for backward compatibility
  assetType: z.enum(['video', 'image']).optional(),

  // Motion strategy for images (v1.1)
  motionStrategy: MotionStrategyEnum.optional(),
  motionApplied: z.boolean().optional(),

  // AI generation metadata (v1.1)
  generationPrompt: z.string().optional(),
  generationModel: z.string().optional(),
  generationCost: z.number().nonnegative().optional(),

  // Matching metadata
  embeddingSimilarity: z.number().min(0).max(1).optional(),
  llmConfidence: z.number().min(0).max(1).optional(),
  matchReasoning: MatchReasoningSchema.optional(),
  visualCue: z.string().optional(),

  // Trimming
  trimStart: z.number().nonnegative().optional(),
  trimEnd: z.number().positive().optional(),
  trimReasoning: z.string().optional(),
});

/**
 * VisualAssetSchema with defaults applied during parsing.
 * Use VisualAssetInput for creating objects, VisualAsset for parsed objects.
 */
/**
 * Ubiquitous Language: Visual asset (per-scene) contract.
 */
export const VisualAssetSchema = VisualAssetBaseSchema.transform((asset) => ({
  ...asset,
  // Apply defaults for backward compatibility
  assetType: asset.assetType ?? ('video' as const),
  motionApplied: asset.motionApplied ?? false,
}));

/**
 * Input type for creating VisualAsset objects (before parsing).
 * assetType and motionApplied are optional.
 */
export type VisualAssetInput = z.input<typeof VisualAssetSchema>;

/**
 * Output type after parsing VisualAsset (with defaults applied).
 */
export type VisualAsset = z.output<typeof VisualAssetSchema>;

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
  sectionId: z.string().optional().describe('Reference to script scene (legacy field name)'),
});

export type VideoClip = z.infer<typeof VideoClipSchema>;

/**
 * Keyword extraction result
 */
export const KeywordSchema = z.object({
  keyword: z.string(),
  sectionId: z.string().describe('Reference to script scene (legacy field name)'),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  visualHint: z.string().optional(),
});

export type Keyword = z.infer<typeof KeywordSchema>;

/**
 * Gameplay clip metadata (for split-screen templates).
 */
/**
 * Ubiquitous Language: Gameplay clip metadata (for split-screen templates).
 */
export const GameplayClipSchema = z.object({
  path: z.string(),
  duration: z.number().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  style: z.string().optional(),
});

/**
 * Ubiquitous Language: Gameplay clip metadata.
 */
export type GameplayClip = z.infer<typeof GameplayClipSchema>;

/**
 * Full visuals output (matches SYSTEM-DESIGN §6.5 VisualPlanSchema)
 *
 * Extended in v1.1 to support:
 * - fromGenerated count for AI-generated assets
 * - totalGenerationCost for cost tracking
 * - motionStrategy at output level
 */
const VisualsOutputBaseSchema = z.object({
  schemaVersion: z.string().default(VISUALS_SCHEMA_VERSION),
  scenes: z.array(VisualAssetSchema).describe('Per-scene visual assets'),
  totalAssets: z.number().int().nonnegative(),
  fromUserFootage: z.number().int().nonnegative(),
  fromStock: z.number().int().nonnegative(),
  fallbacks: z.number().int().nonnegative(),

  // AI generation tracking (v1.1) - optional for backward compatibility
  fromGenerated: z.number().int().nonnegative().optional(),
  totalGenerationCost: z.number().nonnegative().optional(),
  motionStrategy: MotionStrategyEnum.optional(),
  gameplayClip: GameplayClipSchema.optional(),

  embeddingModel: z.string().optional(),
  reasoningModel: z.string().optional(),
  provider: z.string().optional().describe('@deprecated Use source in scenes'),

  // Legacy fields for backward compatibility
  clips: z.array(VideoClipSchema).optional().describe('@deprecated Use scenes'),
  keywords: z.array(KeywordSchema).optional(),
  totalDuration: z.number().positive().optional(),
  fallbacksUsed: z.number().int().nonnegative().optional().describe('@deprecated Use fallbacks'),
});

/**
 * VisualsOutputSchema with defaults applied during parsing.
 */
/**
 * Ubiquitous Language: Visuals output artifact schema (visuals.json).
 */
export const VisualsOutputSchema = VisualsOutputBaseSchema.transform((output) => ({
  ...output,
  // Apply defaults for backward compatibility
  fromGenerated: output.fromGenerated ?? 0,
}));

/**
 * Input type for creating VisualsOutput objects (before parsing).
 */
export type VisualsOutputInput = z.input<typeof VisualsOutputSchema>;

/**
 * Output type after parsing VisualsOutput (with defaults applied).
 */
export type VisualsOutput = z.output<typeof VisualsOutputSchema>;
