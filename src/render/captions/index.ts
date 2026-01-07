/**
 * Captions Module
 *
 * Comprehensive, configurable caption system for short-form video.
 *
 * Usage:
 * ```tsx
 * import { Caption, CAPTION_STYLE_PRESETS, getCaptionPreset } from './captions';
 *
 * // Use default TikTok style
 * <Caption words={words} />
 *
 * // Use a preset
 * <Caption words={words} config={getCaptionPreset('reels')} />
 *
 * // Custom config
 * <Caption words={words} config={{
 *   fontSize: 80,
 *   highlightMode: 'background',
 *   pillStyle: { color: '#FF0000' }
 * }} />
 * ```
 */

// Main component
export { Caption, type CaptionProps } from './Caption';

// Configuration
export {
  CaptionConfigSchema,
  type CaptionConfig,
  type CaptionDisplayMode,
  type HighlightMode,
  type CaptionPosition,
  type PageAnimation,
  type PillStyle,
  type StrokeStyle,
  type TextShadow,
  type CaptionLayout,
  parseCaptionConfig,
  mergeCaptionConfig,
} from './config';

// Presets
export {
  CAPTION_STYLE_PRESETS,
  PRESET_TIKTOK,
  PRESET_YOUTUBE_SHORTS,
  PRESET_REELS,
  PRESET_BOLD_IMPACT,
  PRESET_MINIMAL,
  PRESET_NEON,
  PRESET_CAPCUT_BOLD,
  PRESET_HORMOZI,
  PRESET_KARAOKE,
  type CaptionPresetName,
  getCaptionPreset,
  getCaptionPresetWithOverrides,
} from './presets';

// Paging utilities
export {
  createCaptionPages,
  toTimedWords,
  sanitizeTimedWords,
  isDisplayableWord,
  isTtsMarker,
  isAsrArtifact,
  type TimedWord,
  type CaptionLine,
  type CaptionPage,
} from './paging';

// Chunking utilities (TikTok-native)
export {
  createCaptionChunks,
  detectEmphasis,
  layoutToChunkingConfig,
  chunkToPage,
  type ChunkedWord,
  type CaptionChunk,
  type ChunkingConfig,
} from './chunking';

// Emphasis types
export { type EmphasisType, type EmphasisStyle } from './config';
