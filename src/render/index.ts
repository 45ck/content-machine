/**
 * Render Module
 *
 * Video rendering pipeline with style system based on research-backed values.
 *
 * @module render
 *
 * @example
 * ```typescript
 * import { resolveStyle, TIMING_MS, SAFE_ZONES } from './render';
 *
 * // Get complete style for an archetype
 * const style = resolveStyle('listicle');
 *
 * // Use tokens directly
 * const popDuration = TIMING_MS.wordPop; // 100ms (research-backed)
 * const tiktokZone = SAFE_ZONES.tiktok; // Platform-specific safe zone
 * ```
 */

// Schema exports
export {
  CaptionStyleSchema,
  RenderPropsSchema,
  RenderOutputSchema,
  RENDER_SCHEMA_VERSION,
  type CaptionStyle,
  type RenderProps,
  type RenderOutput,
} from '../domain';

// Service exports
export { renderVideo } from './service';

// Style system exports
export {
  // Resolver
  resolveStyle,
  createStyleResolver,
  type ResolvedStyle,
  type StyleOverrides,
  type StyleResolverDeps,
} from './styles';

export {
  // Theme registry
  createThemeRegistry,
  defaultThemeRegistry,
  type Theme,
  type ThemeRegistry,
} from './themes';

export {
  // Presets
  ANIMATION_TYPES,
  ANIMATION_PRESETS,
  PALETTES,
  TYPOGRAPHY_PRESETS,
  CAPTION_PRESETS,
  type AnimationType,
  type AnimationPresetName,
  type PaletteName,
  type TypographyPresetName,
  type CaptionPresetName,
  type AnimationConfig,
  type ColorPalette,
} from './presets';

export {
  // Tokens
  EASING_CURVES,
  SPRING_CONFIGS,
  TIMING_MS,
  COLORS,
  FONT_STACKS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SAFE_ZONES,
  // Utilities
  msToFrames,
  framesToMs,
  getContentBounds,
  // Types
  type SafeZone,
  type SpringConfig,
} from './tokens';
