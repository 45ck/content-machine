/**
 * Render Schemas
 *
 * Zod schemas for video rendering.
 * Based on SYSTEM-DESIGN §7.4 render command
 */
import { z } from 'zod';
import { GameplayClipSchema, VideoClipSchema, VisualAssetSchema } from '../visuals/schema';
import { WordTimestampSchema } from '../audio/schema';
import { ANIMATION_TYPES } from './presets/animation';
import { CaptionConfigSchema, type CaptionConfig } from './captions/config';

/** Current schema version for migrations */
export const RENDER_SCHEMA_VERSION = '1.0.0';

/**
 * Caption style configuration (matches SYSTEM-DESIGN archetype caption settings)
 * Animation types imported from presets/animation.ts (Single Source of Truth)
 *
 * @deprecated Use CaptionConfig from captions/config.ts instead
 */
export const CaptionStyleSchema = z.object({
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().int().positive().default(80),
  fontWeight: z.enum(['normal', 'bold', '900']).default('bold'),
  color: z.string().default('#FFFFFF'),
  highlightColor: z.string().default('#FFE135'),
  highlightCurrentWord: z.boolean().default(true),
  strokeColor: z.string().default('#000000'),
  strokeWidth: z.number().int().nonnegative().default(4),
  position: z.enum(['bottom', 'center', 'top']).default('bottom'),
  animation: z.enum(ANIMATION_TYPES).default('pop'),
});

export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

// Re-export the new caption config for convenience
export { CaptionConfigSchema, type CaptionConfig };

/**
 * Render input props
 */
export const RenderPropsSchema = z.object({
  schemaVersion: z.string().default(RENDER_SCHEMA_VERSION),
  scenes: z.array(VisualAssetSchema).optional().describe('Per-scene visual assets'),
  clips: z.array(VideoClipSchema).optional().describe('@deprecated Use scenes'),
  gameplayClip: GameplayClipSchema.optional(),
  words: z.array(WordTimestampSchema),
  audioPath: z.string(),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive().default(30),
  splitScreenRatio: z.number().min(0.3).max(0.7).optional(),
  /** @deprecated Use captionConfig instead */
  captionStyle: CaptionStyleSchema.optional(),
  /** New comprehensive caption configuration */
  captionConfig: CaptionConfigSchema.optional(),
  archetype: z.string().optional().describe('Content archetype for style defaults'),
});

export type VideoScene = z.infer<typeof VisualAssetSchema>;
export type VideoClip = z.infer<typeof VideoClipSchema>;
export type RenderProps = z.infer<typeof RenderPropsSchema>;
/** Input type for RenderProps (before Zod transforms apply defaults) */
export type RenderPropsInput = z.input<typeof RenderPropsSchema>;

/**
 * Render output
 */
export const RenderOutputSchema = z.object({
  schemaVersion: z.string().default(RENDER_SCHEMA_VERSION),
  outputPath: z.string(),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  fileSize: z.number().int().nonnegative(),
  codec: z.string(),
  archetype: z.string().optional(),
});

export type RenderOutput = z.infer<typeof RenderOutputSchema>;
