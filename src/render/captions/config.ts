/**
 * Caption Configuration Schema
 *
 * Comprehensive, fully-configurable caption styling system.
 * Based on gyoridavid/short-video-maker patterns.
 *
 * All caption appearance, layout, and behavior is controlled here.
 */
import { z } from 'zod';

/**
 * Highlight mode - how the active word is emphasized
 */
export const HighlightModeSchema = z.enum([
  'color', // Just change text color
  'background', // Background pill/rounded rect (TikTok style)
  'underline', // Underline the active word
  'scale', // Scale up the active word
  'glow', // Glowing effect
]);
export type HighlightMode = z.infer<typeof HighlightModeSchema>;

/**
 * Text transform options
 */
export const TextTransformSchema = z.enum(['none', 'uppercase', 'lowercase', 'capitalize']);
export type TextTransform = z.infer<typeof TextTransformSchema>;

/**
 * Caption position with detailed control
 */
export const CaptionPositionSchema = z.enum(['top', 'center', 'bottom']);
export type CaptionPosition = z.infer<typeof CaptionPositionSchema>;

/**
 * Animation style for page transitions
 */
export const PageAnimationSchema = z.enum([
  'none', // No animation
  'fade', // Fade in/out
  'slideUp', // Slide up from bottom
  'slideDown', // Slide down from top
  'pop', // Scale pop
  'bounce', // Spring bounce
]);
export type PageAnimation = z.infer<typeof PageAnimationSchema>;

/**
 * Caption display mode - controls how words appear on screen
 */
export const CaptionDisplayModeSchema = z.enum([
  'page', // Default: show N words at a time, highlight current (TikTok style)
  'single', // Show only ONE word at a time, replaces on each word
  'buildup', // Words accumulate per sentence, then clear for next sentence
]);
export type CaptionDisplayMode = z.infer<typeof CaptionDisplayModeSchema>;

/**
 * Background pill configuration (for 'background' highlight mode)
 */
export const PillStyleSchema = z.object({
  /** Background color of the pill */
  color: z.string().default('#0066FF'),
  /** Border radius in pixels */
  borderRadius: z.number().nonnegative().default(8),
  /** Horizontal padding inside pill */
  paddingX: z.number().nonnegative().default(12),
  /** Vertical padding inside pill */
  paddingY: z.number().nonnegative().default(6),
  /** Optional border */
  borderWidth: z.number().nonnegative().default(0),
  /** Border color */
  borderColor: z.string().default('transparent'),
});
export type PillStyle = z.infer<typeof PillStyleSchema>;

/**
 * Text stroke/outline configuration
 */
export const StrokeStyleSchema = z.object({
  /** Stroke color */
  color: z.string().default('#000000'),
  /** Stroke width in pixels */
  width: z.number().nonnegative().default(3),
  /** Use WebkitTextStroke (better quality) vs textShadow */
  useWebkitStroke: z.boolean().default(true),
});
export type StrokeStyle = z.infer<typeof StrokeStyleSchema>;

/**
 * Shadow configuration for text
 */
export const TextShadowSchema = z.object({
  /** Enable text shadow */
  enabled: z.boolean().default(true),
  /** Shadow color */
  color: z.string().default('rgba(0,0,0,0.5)'),
  /** Horizontal offset */
  offsetX: z.number().default(0),
  /** Vertical offset */
  offsetY: z.number().default(2),
  /** Blur radius */
  blur: z.number().nonnegative().default(8),
});
export type TextShadow = z.infer<typeof TextShadowSchema>;

/**
 * Layout configuration - controls how words are grouped into pages
 */
export const CaptionLayoutSchema = z.object({
  /** Maximum characters per line (controls line breaks) */
  maxCharsPerLine: z.number().int().positive().default(20),
  /** Maximum lines per page (1 = one line at a time, 2 = two lines) */
  maxLinesPerPage: z.number().int().positive().default(1),
  /** Maximum time gap (ms) before forcing a new page */
  maxGapMs: z.number().int().nonnegative().default(1000),
  /** Minimum words per page */
  minWordsPerPage: z.number().int().positive().default(1),
  /** Maximum words per page (fallback if char limit not hit) */
  maxWordsPerPage: z.number().int().positive().default(6),
});
export type CaptionLayout = z.infer<typeof CaptionLayoutSchema>;

/**
 * Position offset configuration
 */
export const PositionOffsetSchema = z.object({
  /** Distance from edge (percentage of screen height) */
  edgeDistance: z.number().min(0).max(50).default(15),
  /** Horizontal padding from screen edges (pixels) */
  horizontalPadding: z.number().nonnegative().default(40),
});
export type PositionOffset = z.infer<typeof PositionOffsetSchema>;

/**
 * Complete Caption Configuration
 *
 * This is the single source of truth for all caption styling.
 * Can be loaded from JSON/YAML config files.
 */
export const CaptionConfigSchema = z.object({
  /** Schema version for migrations */
  version: z.string().default('1.0.0'),

  // === DISPLAY MODE ===
  /** How words are displayed: page (default), single (one word only), buildup (accumulate per sentence) */
  displayMode: CaptionDisplayModeSchema.default('page'),
  /** Words per page/group - controls how many words appear together (default: 8 for larger sentences) */
  wordsPerPage: z.number().int().positive().default(8),

  // === TYPOGRAPHY ===
  /** Font family (use web-safe or load custom) */
  fontFamily: z.string().default('Inter'),
  /** Font size in pixels */
  fontSize: z.number().int().positive().default(72),
  /** Font weight */
  fontWeight: z
    .union([z.literal('normal'), z.literal('bold'), z.literal('black'), z.number()])
    .default('bold'),
  /** Letter spacing (em units) */
  letterSpacing: z.number().default(0),
  /** Line height multiplier */
  lineHeight: z.number().positive().default(1.2),
  /** Text transform */
  textTransform: TextTransformSchema.default('uppercase'),

  // === COLORS ===
  /** Default text color */
  textColor: z.string().default('#FFFFFF'),
  /** Active/highlighted word color */
  highlightColor: z.string().default('#FFFFFF'),
  /** Inactive/past word color (optional dimming) */
  inactiveColor: z.string().optional(),
  /** Inactive word opacity (0-1) */
  inactiveOpacity: z.number().min(0).max(1).default(1),

  // === HIGHLIGHT STYLE ===
  /** How to highlight the active word */
  highlightMode: HighlightModeSchema.default('background'),
  /** Pill/background style (when highlightMode is 'background') */
  pillStyle: PillStyleSchema.default({}),

  // === STROKE/OUTLINE ===
  /** Text stroke configuration */
  stroke: StrokeStyleSchema.default({}),

  // === SHADOW ===
  /** Text shadow configuration */
  shadow: TextShadowSchema.default({}),

  // === LAYOUT ===
  /** How words are grouped into pages/lines */
  layout: CaptionLayoutSchema.default({}),

  // === POSITION ===
  /** Vertical position on screen */
  position: CaptionPositionSchema.default('bottom'),
  /** Position fine-tuning */
  positionOffset: PositionOffsetSchema.default({}),

  // === ANIMATION ===
  /** Page entrance animation */
  pageAnimation: PageAnimationSchema.default('none'),
  /** Animation duration in ms */
  animationDuration: z.number().int().positive().default(200),
  /** Word transition duration in ms */
  wordTransitionMs: z.number().int().nonnegative().default(50),
});

export type CaptionConfig = z.infer<typeof CaptionConfigSchema>;
/** Input type for CaptionConfig (before Zod transforms apply defaults) */
export type CaptionConfigInput = z.input<typeof CaptionConfigSchema>;
/** Input type for PillStyle (before Zod transforms apply defaults) */
export type PillStyleInput = z.input<typeof PillStyleSchema>;
/** Input type for StrokeStyle (before Zod transforms apply defaults) */
export type StrokeStyleInput = z.input<typeof StrokeStyleSchema>;
/** Input type for CaptionLayout (before Zod transforms apply defaults) */
export type CaptionLayoutInput = z.input<typeof CaptionLayoutSchema>;
/** Input type for TextShadow (before Zod transforms apply defaults) */
export type TextShadowInput = z.input<typeof TextShadowSchema>;
/** Input type for PositionOffset (before Zod transforms apply defaults) */
export type PositionOffsetInput = z.input<typeof PositionOffsetSchema>;

/**
 * Parse and validate caption config with defaults
 */
export function parseCaptionConfig(input: unknown): CaptionConfig {
  return CaptionConfigSchema.parse(input ?? {});
}

/**
 * Merge partial config with defaults
 */
export function mergeCaptionConfig(partial: CaptionConfigInput): CaptionConfig {
  return CaptionConfigSchema.parse(partial);
}
