/**
 * Caption Configuration Schema
 *
 * Comprehensive, fully-configurable caption styling system.
 * Based on gyoridavid/short-video-maker patterns.
 *
 * All caption appearance, layout, and behavior is controlled here.
 */
import { z } from 'zod';
import { FONT_STACKS } from '../tokens/font';

/**
 * Highlight mode - how the active word is emphasized
 */
export const HighlightModeSchema = z.enum([
  'none', // No active-word highlighting
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
 * Animation style for active word emphasis
 */
export const WordAnimationSchema = z.enum([
  'none', // No per-word animation
  'pop', // Scale pop when word becomes active
  'bounce', // Bouncy pop when word becomes active
  'rise', // Rise from below when word becomes active
  'shake', // Quick shake when word becomes active
]);
export type WordAnimation = z.infer<typeof WordAnimationSchema>;

/**
 * Caption display mode - controls how words appear on screen
 */
export const CaptionDisplayModeSchema = z.enum([
  'page', // Default: show N words at a time, highlight current (TikTok style)
  'single', // Show only ONE word at a time, replaces on each word
  'buildup', // Words accumulate per sentence, then clear for next sentence
  'chunk', // CapCut-style chunks with natural phrase grouping
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
 * Emphasis type - what makes a word emphasized
 */
export const EmphasisTypeSchema = z.enum([
  'number', // "5", "100%", "$50"
  'power', // "never", "always", "best", "worst"
  'negation', // "don't", "can't", "won't", "no"
  'pause', // Last word before a significant pause
  'punctuation', // Word before ! or ?
]);
export type EmphasisType = z.infer<typeof EmphasisTypeSchema>;

/**
 * Emphasis style configuration
 */
export const EmphasisStyleSchema = z.object({
  /** Enable emphasis detection */
  enabled: z.boolean().default(true),
  /** Scale factor for emphasized words (1.0 = no scale) */
  scale: z.number().min(1).max(2).default(1.15),
  /** Different color for emphasized words (null = use highlight color) */
  color: z.string().nullable().default(null),
  /** Stronger stroke for emphasis */
  strokeMultiplier: z.number().min(1).max(3).default(1.5),
  /** Pop animation on emphasis */
  animatePop: z.boolean().default(true),
  /** Types of emphasis to detect */
  detectTypes: z.array(EmphasisTypeSchema).default(['number', 'power', 'negation', 'pause']),
});
export type EmphasisStyle = z.infer<typeof EmphasisStyleSchema>;

/**
 * Cleanup configuration (optional word filtering)
 */
export const CaptionCleanupSchema = z.object({
  /** Drop filler words (e.g., um, uh) */
  dropFillers: z.boolean().default(false),
  /** Custom filler word list */
  fillerWords: z.array(z.string()).default([]),
  /** Drop list markers like "1:" / "2." / "#3" from captions */
  dropListMarkers: z.boolean().default(false),
});
export type CaptionCleanup = z.infer<typeof CaptionCleanupSchema>;

/**
 * Layout configuration - controls how words are grouped into pages
 *
 * IMPORTANT: Words are NEVER broken mid-word. Full words only.
 * Lines wrap at word boundaries when maxCharsPerLine is exceeded.
 */
export const CaptionLayoutSchema = z.object({
  /** Maximum characters per line before wrapping to next line (default: 25) */
  maxCharsPerLine: z.number().int().positive().default(25),
  /** Maximum lines per page (1 = single line, 2+ = multi-line captions) */
  maxLinesPerPage: z.number().int().positive().default(2),
  /** Maximum time gap (ms) before forcing a new page */
  maxGapMs: z.number().int().nonnegative().default(1000),
  /** Minimum words per page */
  minWordsPerPage: z.number().int().positive().default(1),
  /** Target words per chunk (used for chunk display mode) */
  targetWordsPerChunk: z.number().int().positive().default(5),
  /** Maximum words per page (fallback if char limit not hit) */
  maxWordsPerPage: z.number().int().positive().default(8),
  /** Maximum words per minute for readability */
  maxWordsPerMinute: z.number().positive().default(180),
  /** Maximum characters per second for readability (TikTok native: ~15 CPS) */
  maxCharsPerSecond: z.number().positive().default(15),
  /** Minimum on-screen time for short chunks (1-2 words) in ms */
  minOnScreenMsShort: z.number().int().positive().default(800),
  /** Minimum on-screen time in ms (prevents flashing chunks) */
  minOnScreenMs: z.number().int().positive().default(1100),
  /** Max words treated as a "short punch" chunk */
  shortChunkMaxWords: z.number().int().positive().default(2),
  /** Minimum gap between chunks in ms (breathing room) */
  chunkGapMs: z.number().int().nonnegative().default(50),
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
 * Safe zone configuration (platform UI overlays)
 */
export const SafeZoneConfigSchema = z.object({
  /** Enable safe zone padding */
  enabled: z.boolean().default(true),
  /** Platform safe zone preset */
  platform: z.enum(['tiktok', 'reels', 'shorts', 'universal']).default('universal'),
});
export type SafeZoneConfig = z.infer<typeof SafeZoneConfigSchema>;

/**
 * List badge overlay configuration (e.g., "#1" marker for listicles)
 *
 * This is intentionally conservative by default: it reserves extra space around
 * caption bands so badges don't visually collide with captions.
 */
export const ListBadgesConfigSchema = z.object({
  /** Enable/disable list badges overlay. */
  enabled: z.boolean().default(true),
  /** Total time a badge stays on screen (ms). */
  durationMs: z.number().int().positive().default(1200),
  /** Fade in duration (ms). */
  fadeInMs: z.number().int().nonnegative().default(160),
  /** Fade out duration (ms). */
  fadeOutMs: z.number().int().nonnegative().default(220),
  /** Starting scale for pop-in. */
  scaleFrom: z.number().min(0.1).max(3).default(0.75),
  /** Target scale after pop-in. */
  scaleTo: z.number().min(0.1).max(3).default(1),
  /** Badge circle size (px). */
  sizePx: z.number().int().positive().default(110),
  /** Badge text size (px). */
  fontSizePx: z.number().int().positive().default(54),
  /** Additional reserved padding above caption block (px). */
  captionSafetyPx: z.number().int().nonnegative().default(80),
  /** Gap between caption block and badge (px). */
  gapPx: z.number().int().nonnegative().default(110),
  /** Background color for the badge. */
  backgroundColor: z.string().default('rgba(0,0,0,0.65)'),
  /** Border width (px). */
  borderWidthPx: z.number().int().nonnegative().default(4),
  /** Border color. */
  borderColor: z.string().default('rgba(255,255,255,0.85)'),
  /** Text color. */
  textColor: z.string().default('#FFFFFF'),
  /** Text shadow CSS string. */
  textShadow: z.string().default('0 6px 16px rgba(0,0,0,0.6)'),
});
export type ListBadgesConfig = z.infer<typeof ListBadgesConfigSchema>;

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
  /** How words are displayed: chunk (default), page, single (one word only), buildup (accumulate per sentence) */
  displayMode: CaptionDisplayModeSchema.default('chunk'),
  /** Words per page/group - controls how many words appear together (default: 8 for larger sentences) */
  wordsPerPage: z.number().int().positive().default(8),

  // === TYPOGRAPHY ===
  /** Font family (use web-safe or load custom) */
  fontFamily: z.string().default(FONT_STACKS.body),
  /** Font size in pixels */
  fontSize: z.number().int().positive().default(72),
  /** Font weight */
  fontWeight: z
    .union([z.literal('normal'), z.literal('bold'), z.literal('black'), z.number()])
    .default('bold'),
  /** Letter spacing (em units) */
  letterSpacing: z.number().default(0),
  /** Space between words (em units, scales with font size) */
  wordSpacing: z.number().nonnegative().default(1.0),
  /** Line height multiplier */
  lineHeight: z.number().positive().default(1.25),
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

  // === EMPHASIS ===
  /** Emphasis styling for power words, numbers, etc. */
  emphasis: EmphasisStyleSchema.default({}),

  // === CLEANUP ===
  /** Optional filtering rules for caption words */
  cleanup: CaptionCleanupSchema.default({}),

  // === LAYOUT ===
  /** How words are grouped into pages/lines */
  layout: CaptionLayoutSchema.default({}),

  // === POSITION ===
  /** Vertical position on screen */
  position: CaptionPositionSchema.default('bottom'),
  /** Position fine-tuning */
  positionOffset: PositionOffsetSchema.default({}),
  /** Safe zone padding to avoid platform UI overlays */
  safeZone: SafeZoneConfigSchema.default({}),

  // === OVERLAYS ===
  /** List item number badges overlay (e.g., "#1") */
  listBadges: ListBadgesConfigSchema.default({}),

  // === ANIMATION ===
  /** Page entrance animation */
  pageAnimation: PageAnimationSchema.default('none'),
  /** Animation duration in ms */
  animationDuration: z.number().int().positive().default(200),
  /** Word transition duration in ms */
  wordTransitionMs: z.number().int().nonnegative().default(50),
  /** Active word animation (per-word) */
  wordAnimation: WordAnimationSchema.default('none'),
  /** Active word animation duration in ms */
  wordAnimationMs: z.number().int().nonnegative().default(120),
  /** Active word animation intensity (0..1) */
  wordAnimationIntensity: z.number().min(0).max(1).default(0.6),

  // === TIMING ===
  /**
   * Global timing offset applied to caption word timestamps (ms).
   * Negative values make captions appear slightly earlier (useful if captions feel late).
   */
  timingOffsetMs: z.number().int().min(-2000).max(2000).default(0),
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
/** Input type for EmphasisStyle (before Zod transforms apply defaults) */
export type EmphasisStyleInput = z.input<typeof EmphasisStyleSchema>;
/** Input type for PositionOffset (before Zod transforms apply defaults) */
export type PositionOffsetInput = z.input<typeof PositionOffsetSchema>;
/** Input type for SafeZoneConfig (before Zod transforms apply defaults) */
export type SafeZoneConfigInput = z.input<typeof SafeZoneConfigSchema>;
/** Input type for ListBadgesConfig (before Zod transforms apply defaults) */
export type ListBadgesConfigInput = z.input<typeof ListBadgesConfigSchema>;

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
