/**
 * Caption Style Presets - Complete caption configurations
 */
import { PALETTES } from './palette';
import { TYPOGRAPHY_PRESETS, type TypographyPreset } from './typography';
import type { AnimationType } from './animation';

/** Complete caption style */
export interface CaptionPreset {
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

/** Pre-built caption presets */
export const CAPTION_PRESETS = Object.freeze({
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
  } as CaptionPreset),

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
  } as CaptionPreset),

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
  } as CaptionPreset),

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
  } as CaptionPreset),

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
  } as CaptionPreset),

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
  } as CaptionPreset),

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
  } as CaptionPreset),
} as const);

export type CaptionPresetName = keyof typeof CAPTION_PRESETS;
