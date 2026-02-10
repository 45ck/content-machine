/**
 * Render Schemas
 *
 * Zod schemas for video rendering.
 * Based on SYSTEM-DESIGN §7.4 render command
 */
import { z } from 'zod';
import { GameplayClipSchema, VideoClipSchema, VisualAssetSchema } from '../visuals/schema';
import { HookClipSchema } from '../hooks/schema';
import { WordTimestampSchema } from '../audio/schema';
import { AudioMixOutputSchema } from '../audio/mix/schema';
import { ANIMATION_TYPES } from './presets/animation';
import { CaptionConfigSchema, type CaptionConfig } from './captions/config';
import { FONT_STACKS } from './tokens/font';

/** Current schema version for migrations */
export const RENDER_SCHEMA_VERSION = '1.0.0';

/**
 * Caption style configuration (matches SYSTEM-DESIGN archetype caption settings)
 * Animation types imported from presets/animation.ts (Single Source of Truth)
 *
 * @deprecated Use CaptionConfig from captions/config.ts instead
 */
export const CaptionStyleSchema = z.object({
  fontFamily: z.string().default(FONT_STACKS.body),
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

export const FontSourceSchema = z.object({
  family: z.string(),
  src: z.string(),
  weight: z.union([z.number(), z.string()]).optional(),
  style: z.enum(['normal', 'italic', 'oblique']).optional(),
});

export type FontSource = z.infer<typeof FontSourceSchema>;

export const OverlayLayerSchema = z.enum(['below-captions', 'above-captions']);
export type OverlayLayer = z.infer<typeof OverlayLayerSchema>;

export const OverlayKindSchema = z.enum(['image', 'video']);
export type OverlayKind = z.infer<typeof OverlayKindSchema>;

export const OverlayPositionSchema = z.enum([
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
]);
export type OverlayPosition = z.infer<typeof OverlayPositionSchema>;

export const OverlayAssetSchema = z
  .object({
    /** Bundle-relative path or remote URL. */
    src: z.string().min(1),
    kind: OverlayKindSchema.optional(),
    layer: OverlayLayerSchema.optional(),
    position: OverlayPositionSchema.optional(),
    /** Seconds from start of the composition. */
    start: z.number().nonnegative().optional(),
    /** Seconds from start of the composition. */
    end: z.number().nonnegative().optional(),
    opacity: z.number().min(0).max(1).optional(),
    marginPx: z.number().int().nonnegative().optional(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    fit: z.enum(['contain', 'cover']).optional(),
    /** For video overlays. Default: true. */
    muted: z.boolean().optional(),
  })
  .strict()
  .refine((val) => !(val.start !== undefined && val.end !== undefined && val.end < val.start), {
    message: 'Overlay end must be >= start',
    path: ['end'],
  });

export type OverlayAsset = z.infer<typeof OverlayAssetSchema>;

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
  hook: HookClipSchema.optional(),
  overlays: z.array(OverlayAssetSchema).optional(),
  words: z.array(WordTimestampSchema),
  audioPath: z.string(),
  audioMix: AudioMixOutputSchema.optional(),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive().default(30),
  splitScreenRatio: z.number().min(0.3).max(0.7).optional(),
  gameplayPosition: z.enum(['top', 'bottom', 'full']).optional(),
  contentPosition: z.enum(['top', 'bottom', 'full']).optional(),
  fonts: z.array(FontSourceSchema).optional(),
  /** Optional template metadata (useful for code templates). */
  templateId: z.string().optional(),
  templateSource: z.string().optional(),
  templateParams: z.record(z.unknown()).optional(),
  /** @deprecated Use captionConfig instead */
  captionStyle: CaptionStyleSchema.optional(),
  /** New comprehensive caption configuration */
  captionConfig: CaptionConfigSchema.optional(),
  archetype: z.string().optional().describe('Script archetype id (used for style defaults)'),
});

export type VideoScene = z.infer<typeof VisualAssetSchema>;
export type VideoClip = z.infer<typeof VideoClipSchema>;
/**
 * Ubiquitous Language: Hook clip (intro hook overlay video).
 */
export type HookClip = z.infer<typeof HookClipSchema>;
export type HookClipInput = z.input<typeof HookClipSchema>;
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
