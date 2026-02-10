/**
 * Caption Presets - Ready-to-use caption style configurations
 *
 * These are complete, tested styles that work well for short-form content.
 * Users can use these as-is or as a starting point for customization.
 *
 * NEW: CapCut-native presets use smaller chunks (3-4 words) with emphasis
 */
import { CaptionConfig, CaptionConfigSchema } from './config';
import { FONT_STACKS } from '../tokens/font';

/**
 * TikTok Native Style
 *
 * The classic TikTok look: bold uppercase text with blue pill highlight.
 * High readability, proven engagement.
 * Now with 2-line support for better sentence flow.
 */
export const PRESET_TIKTOK: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: FONT_STACKS.body,
  // Slightly smaller by default to avoid oversized caption blocks in chunk mode.
  fontSize: 66,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  wordSpacing: 1.0,
  lineHeight: 1.25,
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
    maxCharsPerLine: 23,
    maxLinesPerPage: 2,
    maxGapMs: 800,
    maxWordsPerPage: 5,
    minWordsPerPage: 2,
    targetWordsPerChunk: 3,
    // Slightly higher than schema default (15) to avoid false negatives in V&V
    // after shortening chunk sizes.
    maxCharsPerSecond: 16,
  },
  position: 'bottom',
  positionOffset: {
    edgeDistance: 20,
    horizontalPadding: 40,
  },
  safeZone: {
    enabled: true,
    platform: 'tiktok',
  },
  cleanup: {
    // We render list numbering via badges, so hide "1:"/"2:" tokens in captions by default for TikTok.
    dropListMarkers: true,
  },
  listBadges: {
    enabled: true,
    durationMs: 1200,
    fadeInMs: 160,
    fadeOutMs: 240,
    scaleFrom: 0.72,
    scaleTo: 1,
    sizePx: 110,
    fontSizePx: 54,
    captionSafetyPx: 80,
    gapPx: 110,
  },
  pageAnimation: 'pop',
  animationDuration: 150,
  wordAnimation: 'pop',
  wordAnimationMs: 110,
  wordAnimationIntensity: 0.65,
  // Slight lead to counteract perceived audio decode latency during rendering.
  timingOffsetMs: -50,
});

/**
 * YouTube Shorts Style
 *
 * Clean, modern look with color-only highlight (no pill).
 * Good for educational/informative content.
 * 2-line support for smooth sentence flow.
 */
export const PRESET_YOUTUBE_SHORTS: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: FONT_STACKS.body,
  fontSize: 64,
  fontWeight: 'bold',
  textTransform: 'none',
  wordSpacing: 1.0,
  lineHeight: 1.25,
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
    minWordsPerPage: 2,
    targetWordsPerChunk: 4,
  },
  position: 'center',
  positionOffset: {
    edgeDistance: 0,
    horizontalPadding: 60,
  },
  safeZone: {
    enabled: true,
    platform: 'shorts',
  },
  pageAnimation: 'fade',
  animationDuration: 200,
});

/**
 * Instagram Reels Style
 *
 * Trendy, vibrant with gradient-friendly colors.
 * Pink/coral highlight for lifestyle content.
 * Now with 2-line support for better sentence flow.
 */
export const PRESET_REELS: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: FONT_STACKS.body,
  fontSize: 68,
  fontWeight: 'bold',
  textTransform: 'uppercase',
  wordSpacing: 1.0,
  lineHeight: 1.25,
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
    maxCharsPerLine: 22,
    maxLinesPerPage: 2,
    maxGapMs: 800,
    maxWordsPerPage: 6,
    minWordsPerPage: 2,
    targetWordsPerChunk: 4,
  },
  position: 'bottom',
  positionOffset: {
    edgeDistance: 25,
    horizontalPadding: 50,
  },
  safeZone: {
    enabled: true,
    platform: 'reels',
  },
  pageAnimation: 'slideUp',
  animationDuration: 180,
  wordAnimation: 'pop',
  wordAnimationMs: 110,
  wordAnimationIntensity: 0.6,
});

/**
 * Bold Impact Style
 *
 * Maximum visual impact, extra large text.
 * Great for hooks and key moments.
 */
export const PRESET_BOLD_IMPACT: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: FONT_STACKS.body,
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
  fontFamily: FONT_STACKS.body,
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
 * Now with 2-line support for better sentence flow.
 */
export const PRESET_NEON: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: FONT_STACKS.body,
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
    maxCharsPerLine: 25,
    maxLinesPerPage: 2,
    maxGapMs: 800,
    maxWordsPerPage: 8,
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
 * CapCut Bold Style
 *
 * Native CapCut look: bold, tight chunks, kinetic feel.
 * Small word groups (3-4 words) for rapid reading.
 * Emphasis on power words with scale animation.
 */
export const PRESET_CAPCUT_BOLD: CaptionConfig = CaptionConfigSchema.parse({
  displayMode: 'page',
  fontFamily: FONT_STACKS.body,
  fontSize: 80,
  fontWeight: 'black',
  textTransform: 'uppercase',
  wordSpacing: 1.0,
  lineHeight: 1.3,
  textColor: '#FFFFFF',
  highlightColor: '#FFE600',
  highlightMode: 'color',
  stroke: {
    color: '#000000',
    width: 10,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.8)',
    offsetX: 0,
    offsetY: 4,
    blur: 0,
  },
  emphasis: {
    enabled: true,
    scale: 1.2,
    color: '#FFE600',
    strokeMultiplier: 1.5,
    animatePop: true,
    detectTypes: ['number', 'power', 'negation', 'pause'],
  },
  layout: {
    maxCharsPerLine: 24,
    maxLinesPerPage: 2,
    maxGapMs: 300,
    minWordsPerPage: 3,
    targetWordsPerChunk: 3,
    maxWordsPerPage: 7,
    maxWordsPerMinute: 180,
    maxCharsPerSecond: 15,
    minOnScreenMsShort: 800,
    minOnScreenMs: 1000,
    shortChunkMaxWords: 2,
    chunkGapMs: 80,
  },
  position: 'bottom',
  positionOffset: {
    edgeDistance: 12,
    horizontalPadding: 40,
  },
  safeZone: {
    enabled: true,
    platform: 'universal',
  },
  pageAnimation: 'pop',
  animationDuration: 180,
  wordTransitionMs: 80,
  wordAnimation: 'pop',
  wordAnimationMs: 120,
  wordAnimationIntensity: 0.55,
});

/**
 * Hormozi Style
 *
 * Alex Hormozi-inspired captions: high impact, centered,
 * one powerful phrase at a time. Maximum emphasis on numbers
 * and power words.
 */
export const PRESET_HORMOZI: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: FONT_STACKS.body,
  fontSize: 88,
  fontWeight: 'black',
  textTransform: 'uppercase',
  textColor: '#FFFFFF',
  highlightColor: '#FFE600',
  highlightMode: 'color',
  stroke: {
    color: '#000000',
    width: 5,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.9)',
    offsetX: 0,
    offsetY: 5,
    blur: 0,
  },
  emphasis: {
    enabled: true,
    scale: 1.25,
    color: '#00FF00',
    strokeMultiplier: 1.8,
    animatePop: true,
    detectTypes: ['number', 'power', 'negation'],
  },
  layout: {
    maxCharsPerLine: 15,
    maxLinesPerPage: 1,
    maxGapMs: 400,
    minWordsPerPage: 1,
    maxWordsPerPage: 3,
    maxCharsPerSecond: 10,
    minOnScreenMs: 450,
    chunkGapMs: 80,
  },
  position: 'center',
  positionOffset: {
    edgeDistance: 0,
    horizontalPadding: 60,
  },
  pageAnimation: 'bounce',
  animationDuration: 220,
});

/**
 * Karaoke Pill Style
 *
 * Word-by-word highlighting like karaoke apps.
 * Each word gets its moment with a smooth color transition.
 */
export const PRESET_KARAOKE: CaptionConfig = CaptionConfigSchema.parse({
  fontFamily: FONT_STACKS.body,
  fontSize: 68,
  fontWeight: 'bold',
  textTransform: 'none',
  textColor: 'rgba(255,255,255,0.6)',
  highlightColor: '#FFFFFF',
  highlightMode: 'background',
  inactiveOpacity: 0.6,
  pillStyle: {
    color: '#6C5CE7',
    borderRadius: 8,
    paddingX: 12,
    paddingY: 6,
  },
  stroke: {
    color: '#000000',
    width: 2,
    useWebkitStroke: true,
  },
  shadow: {
    enabled: true,
    color: 'rgba(0,0,0,0.5)',
    offsetX: 0,
    offsetY: 2,
    blur: 8,
  },
  emphasis: {
    enabled: false,
    scale: 1.0,
    color: null,
    strokeMultiplier: 1.0,
    animatePop: false,
    detectTypes: [],
  },
  layout: {
    maxCharsPerLine: 28,
    maxLinesPerPage: 2,
    maxGapMs: 1000,
    minWordsPerPage: 3,
    maxWordsPerPage: 8,
    maxCharsPerSecond: 18,
    minOnScreenMs: 300,
    chunkGapMs: 30,
  },
  position: 'bottom',
  positionOffset: {
    edgeDistance: 18,
    horizontalPadding: 50,
  },
  pageAnimation: 'fade',
  animationDuration: 150,
  wordTransitionMs: 80,
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
  capcut: PRESET_CAPCUT_BOLD,
  hormozi: PRESET_HORMOZI,
  karaoke: PRESET_KARAOKE,
} as const;

/**
 * Ubiquitous Language: Caption preset name.
 */
export type CaptionPresetName = keyof typeof CAPTION_STYLE_PRESETS;

/**
 * Default caption config (CapCut style)
 */
export const DEFAULT_CAPTION_CONFIG: CaptionConfig = PRESET_CAPCUT_BOLD;

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
    safeZone: { ...preset.safeZone, ...overrides.safeZone },
    emphasis: { ...preset.emphasis, ...overrides.emphasis },
  });
}
