/**
 * Typography Presets - Composed font configurations
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §2
 */
import { FONT_STACKS, FONT_SIZES, FONT_WEIGHTS } from '../tokens/font';

/** Typography configuration */
export interface TypographyPreset {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight?: number;
  readonly letterSpacing?: number;
}

/** Pre-built typography presets */
export const TYPOGRAPHY_PRESETS = Object.freeze({
  /**
   * Hook Bold - For attention-grabbing hooks
   * Source: Research §2 "Bebas Neue for hooks"
   */
  hookBold: Object.freeze({
    fontFamily: FONT_STACKS.impact,
    fontSize: FONT_SIZES['3xl'],
    fontWeight: FONT_WEIGHTS.black,
    lineHeight: 1.1,
    letterSpacing: -1,
  } as TypographyPreset),

  /**
   * Caption Impact - Standard caption text
   * Source: Research §2 "Montserrat for body"
   */
  captionImpact: Object.freeze({
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 1.2,
  } as TypographyPreset),

  /**
   * Caption Clean - Lighter caption style
   */
  captionClean: Object.freeze({
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 1.3,
  } as TypographyPreset),

  /**
   * Body - Standard body text
   */
  body: Object.freeze({
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: 1.5,
  } as TypographyPreset),

  /**
   * Code - Monospace for technical content
   */
  code: Object.freeze({
    fontFamily: FONT_STACKS.mono,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: 1.4,
  } as TypographyPreset),
} as const);

export type TypographyPresetName = keyof typeof TYPOGRAPHY_PRESETS;
