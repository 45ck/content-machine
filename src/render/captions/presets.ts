/**
 * Caption Presets - Ready-to-use caption style configurations
 *
 * These are complete, tested styles that work well for short-form content.
 * Users can use these as-is or as a starting point for customization.
 */
import { CaptionConfig, CaptionConfigSchema } from './config';

/**
 * TikTok Native Style
 *
 * The classic TikTok look: bold uppercase text with blue pill highlight.
 * High readability, proven engagement.
 */
export const PRESET_TIKTOK: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: 'Inter',
  fontSize: 72,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  textColor: '#FFFFFF',
  highlightColor: '#FFFFFF',
  highlightMode: 'background',
  pillStyle: {
    color: '#0066FF',
    borderRadius: 8,
    paddingX: 14,
    paddingY: 8,
  },
  stroke: {
    color: '#000000',
    width: 3,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.6)',
    offsetX: 0,
    offsetY: 2,
    blur: 10,
  },
  layout: {
    maxCharsPerLine: 18,
    maxLinesPerPage: 1,
    maxGapMs: 1000,
    maxWordsPerPage: 4,
  },
  position: 'bottom',
  positionOffset: {
    edgeDistance: 20,
    horizontalPadding: 40,
  },
  pageAnimation: 'pop',
  animationDuration: 150,
});

/**
 * YouTube Shorts Style
 *
 * Clean, modern look with color-only highlight (no pill).
 * Good for educational/informative content.
 */
export const PRESET_YOUTUBE_SHORTS: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: 'Inter',
  fontSize: 64,
  fontWeight: 'bold',
  textTransform: 'none',
  textColor: '#FFFFFF',
  highlightColor: '#FFCC00',
  highlightMode: 'color',
  stroke: {
    color: '#000000',
    width: 4,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.8)',
    offsetX: 0,
    offsetY: 3,
    blur: 12,
  },
  layout: {
    maxCharsPerLine: 25,
    maxLinesPerPage: 2,
    maxGapMs: 800,
    maxWordsPerPage: 6,
  },
  position: 'center',
  positionOffset: {
    edgeDistance: 0,
    horizontalPadding: 60,
  },
  pageAnimation: 'fade',
  animationDuration: 200,
});

/**
 * Instagram Reels Style
 *
 * Trendy, vibrant with gradient-friendly colors.
 * Pink/coral highlight for lifestyle content.
 */
export const PRESET_REELS: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: 'Inter',
  fontSize: 68,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  textColor: '#FFFFFF',
  highlightColor: '#FFFFFF',
  highlightMode: 'background',
  pillStyle: {
    color: '#FF3366',
    borderRadius: 12,
    paddingX: 16,
    paddingY: 10,
  },
  stroke: {
    color: '#000000',
    width: 2,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.4)',
    offsetX: 0,
    offsetY: 2,
    blur: 8,
  },
  layout: {
    maxCharsPerLine: 16,
    maxLinesPerPage: 1,
    maxGapMs: 1200,
    maxWordsPerPage: 3,
  },
  position: 'bottom',
  positionOffset: {
    edgeDistance: 25,
    horizontalPadding: 50,
  },
  pageAnimation: 'slideUp',
  animationDuration: 180,
});

/**
 * Bold Impact Style
 *
 * Maximum visual impact, extra large text.
 * Great for hooks and key moments.
 */
export const PRESET_BOLD_IMPACT: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: 'Inter',
  fontSize: 96,
  fontWeight: 'black',
  textTransform: 'uppercase',
  textColor: '#FFFFFF',
  highlightColor: '#00FF00',
  highlightMode: 'color',
  stroke: {
    color: '#000000',
    width: 6,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.9)',
    offsetX: 0,
    offsetY: 4,
    blur: 0,
  },
  layout: {
    maxCharsPerLine: 12,
    maxLinesPerPage: 1,
    maxGapMs: 800,
    maxWordsPerPage: 2,
  },
  position: 'center',
  positionOffset: {
    edgeDistance: 0,
    horizontalPadding: 40,
  },
  pageAnimation: 'bounce',
  animationDuration: 250,
});

/**
 * Clean Minimal Style
 *
 * Subtle, professional look.
 * Good for business/corporate content.
 */
export const PRESET_MINIMAL: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: 'Inter',
  fontSize: 56,
  fontWeight: 'normal',
  textTransform: 'none',
  textColor: '#FFFFFF',
  highlightColor: '#4A9EFF',
  highlightMode: 'color',
  inactiveOpacity: 0.7,
  stroke: {
    color: '#000000',
    width: 2,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.5)',
    offsetX: 0,
    offsetY: 1,
    blur: 6,
  },
  layout: {
    maxCharsPerLine: 30,
    maxLinesPerPage: 2,
    maxGapMs: 1500,
    maxWordsPerPage: 8,
  },
  position: 'bottom',
  positionOffset: {
    edgeDistance: 12,
    horizontalPadding: 80,
  },
  pageAnimation: 'fade',
  animationDuration: 300,
});

/**
 * Neon Glow Style
 *
 * Vibrant, attention-grabbing with glow effect.
 * Great for entertainment/gaming content.
 */
export const PRESET_NEON: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: 'Inter',
  fontSize: 72,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  textColor: '#FFFFFF',
  highlightColor: '#00FFFF',
  highlightMode: 'glow',
  stroke: {
    color: '#000000',
    width: 3,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: '#00FFFF',
    offsetX: 0,
    offsetY: 0,
    blur: 20,
  },
  layout: {
    maxCharsPerLine: 18,
    maxLinesPerPage: 1,
    maxGapMs: 1000,
    maxWordsPerPage: 4,
  },
  position: 'center',
  positionOffset: {
    edgeDistance: 0,
    horizontalPadding: 50,
  },
  pageAnimation: 'pop',
  animationDuration: 150,
});

/**
 * All available presets
 */
export const CAPTION_STYLE_PRESETS = {
  tiktok: PRESET_TIKTOK,
  youtube: PRESET_YOUTUBE_SHORTS,
  reels: PRESET_REELS,
  bold: PRESET_BOLD_IMPACT,
  minimal: PRESET_MINIMAL,
  neon: PRESET_NEON,
} as const;

export type CaptionPresetName = keyof typeof CAPTION_STYLE_PRESETS;

/**
 * Default caption config (TikTok style)
 */
export const DEFAULT_CAPTION_CONFIG: CaptionConfig = PRESET_TIKTOK;

/**
 * Get a preset by name
 */
export function getCaptionPreset(name: CaptionPresetName): CaptionConfig {
  return CAPTION_STYLE_PRESETS[name];
}

/**
 * Get preset with overrides
 */
export function getCaptionPresetWithOverrides(
  name: CaptionPresetName,
  overrides: Partial<CaptionConfig>
): CaptionConfig {
  const preset = CAPTION_STYLE_PRESETS[name];
  return CaptionConfigSchema.parse({
    ...preset,
    ...overrides,
    // Deep merge nested objects
    pillStyle: { ...preset.pillStyle, ...overrides.pillStyle },
    stroke: { ...preset.stroke, ...overrides.stroke },
    shadow: { ...preset.shadow, ...overrides.shadow },
    layout: { ...preset.layout, ...overrides.layout },
    positionOffset: { ...preset.positionOffset, ...overrides.positionOffset },
  });
}
