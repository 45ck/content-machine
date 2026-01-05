/**
 * Color Palette Presets - Semantic color compositions
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §3
 */
import { COLORS } from '../tokens/color';

/** Semantic color palette */
export interface ColorPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly background: string;
  readonly text: string;
  readonly textMuted: string;
  readonly highlight: string;
  readonly stroke: string;
}

/** Pre-built palettes */
export const PALETTES = Object.freeze({
  /**
   * Earthy Comfort - Pantone 2025 trend
   * Source: Research §3 "warm, grounding tones"
   */
  earthyComfort: Object.freeze({
    primary: COLORS.mochaMousesse,
    secondary: COLORS.warmTaupe,
    accent: COLORS.dustyRose,
    background: '#1A1410',
    text: COLORS.white,
    textMuted: '#B8A89A',
    highlight: COLORS.dustyRose,
    stroke: COLORS.black,
  } as ColorPalette),

  /**
   * Future Pop - WGSN Future Dusk
   * Source: Research §3 "digital-forward palette"
   */
  futurePop: Object.freeze({
    primary: COLORS.electricBlue,
    secondary: COLORS.neonPink,
    accent: COLORS.cyberPurple,
    background: '#0D0D1A',
    text: COLORS.white,
    textMuted: '#8888AA',
    highlight: COLORS.limeAccent,
    stroke: COLORS.black,
  } as ColorPalette),

  /**
   * TikTok Native - Platform brand colors
   */
  tikTokNative: Object.freeze({
    primary: COLORS.tikTokPink,
    secondary: COLORS.tikTokCyan,
    accent: COLORS.white,
    background: COLORS.black,
    text: COLORS.white,
    textMuted: '#888888',
    highlight: COLORS.tikTokCyan,
    stroke: COLORS.black,
  } as ColorPalette),

  /**
   * Clean Minimal - High contrast
   */
  cleanMinimal: Object.freeze({
    primary: COLORS.white,
    secondary: '#E0E0E0',
    accent: COLORS.highlightYellow,
    background: COLORS.black,
    text: COLORS.white,
    textMuted: '#AAAAAA',
    highlight: COLORS.highlightYellow,
    stroke: COLORS.black,
  } as ColorPalette),

  /**
   * Bold Tech - High energy
   */
  boldTech: Object.freeze({
    primary: COLORS.electricBlue,
    secondary: COLORS.limeAccent,
    accent: COLORS.neonPink,
    background: '#050510',
    text: COLORS.white,
    textMuted: '#7777AA',
    highlight: COLORS.limeAccent,
    stroke: '#1A1A2E',
  } as ColorPalette),
} as const);

export type PaletteName = keyof typeof PALETTES;
