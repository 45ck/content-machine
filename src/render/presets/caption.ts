/**
 * Theme Caption Presets
 *
 * These presets are inputs to the *style system* (themes -> tokens).
 * They are NOT the same as `CAPTION_STYLE_PRESETS` in `render/captions/presets.ts`,
 * which are the actual burned-in caption rendering configs.
 */
import { PALETTES } from './palette';
import { TYPOGRAPHY_PRESETS, type TypographyPreset } from './typography';
import type { AnimationType } from './animation';

/** Complete caption style */
/**
 * Ubiquitous Language: Theme caption preset.
 *
 * An input to the render *style system* (themes -> tokens). This is distinct from
 * `CaptionConfig` / `CAPTION_STYLE_PRESETS`, which affect burned-in captions.
 *
 * @cmTerm theme-caption-preset
 */
export interface ThemeCaptionPreset {
  readonly typography: TypographyPreset;
  readonly colors: {
    readonly text: string;
    readonly highlight: string;
    readonly stroke: string;
  };
  readonly animation: AnimationType;
  readonly strokeWidth: number;
  readonly position: 'top' | 'center' | 'bottom';
}

/** Pre-built theme caption presets */
export const THEME_CAPTION_PRESETS = Object.freeze({
  /** Bold pop style - high energy */
  boldPop: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.captionImpact,
    colors: Object.freeze({
      text: PALETTES.futurePop.text,
      highlight: PALETTES.futurePop.highlight,
      stroke: PALETTES.futurePop.stroke,
    }),
    animation: 'pop' as const,
    strokeWidth: 3,
    position: 'center' as const,
  } as ThemeCaptionPreset),

  /** Clean minimal - understated */
  cleanKaraoke: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.captionClean,
    colors: Object.freeze({
      text: PALETTES.cleanMinimal.text,
      highlight: PALETTES.cleanMinimal.highlight,
      stroke: PALETTES.cleanMinimal.stroke,
    }),
    animation: 'karaoke' as const,
    strokeWidth: 2,
    position: 'bottom' as const,
  } as ThemeCaptionPreset),

  /** Earthy warm - softer feel */
  warmBounce: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.captionImpact,
    colors: Object.freeze({
      text: PALETTES.earthyComfort.text,
      highlight: PALETTES.earthyComfort.highlight,
      stroke: PALETTES.earthyComfort.stroke,
    }),
    animation: 'bounce' as const,
    strokeWidth: 3,
    position: 'center' as const,
  } as ThemeCaptionPreset),

  /** TikTok native - platform brand colors */
  tikTokNative: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.captionImpact,
    colors: Object.freeze({
      text: PALETTES.tikTokNative.text,
      highlight: PALETTES.tikTokNative.highlight,
      stroke: PALETTES.tikTokNative.stroke,
    }),
    animation: 'pop' as const,
    strokeWidth: 3,
    position: 'center' as const,
  } as ThemeCaptionPreset),

  /** Fade subtle - elegant transition */
  fadeSubtle: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.captionClean,
    colors: Object.freeze({
      text: PALETTES.cleanMinimal.text,
      highlight: PALETTES.cleanMinimal.highlight,
      stroke: PALETTES.cleanMinimal.stroke,
    }),
    animation: 'fade' as const,
    strokeWidth: 1,
    position: 'bottom' as const,
  } as ThemeCaptionPreset),

  /** Slide impact - dramatic entrance */
  slideImpact: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.hookBold,
    colors: Object.freeze({
      text: PALETTES.boldTech.text,
      highlight: PALETTES.boldTech.highlight,
      stroke: PALETTES.boldTech.stroke,
    }),
    animation: 'slideUp' as const,
    strokeWidth: 4,
    position: 'center' as const,
  } as ThemeCaptionPreset),

  /** Typewriter code - technical content */
  typewriterCode: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.code,
    colors: Object.freeze({
      text: PALETTES.boldTech.text,
      highlight: PALETTES.boldTech.highlight,
      stroke: 'transparent',
    }),
    animation: 'typewriter' as const,
    strokeWidth: 0,
    position: 'bottom' as const,
  } as ThemeCaptionPreset),
} as const);

/**
 * Ubiquitous Language: Theme caption preset name.
 *
 * @cmTerm theme-caption-preset
 */
export type ThemeCaptionPresetName = keyof typeof THEME_CAPTION_PRESETS;
