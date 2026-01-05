/**
 * Font Values - Typography primitives
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §2
 */

/** Font family stacks */
export const FONT_STACKS = Object.freeze({
  /**
   * Impact/hooks - Bold condensed for attention
   * Source: Research §2 "Bebas Neue for hooks"
   */
  impact: '"Bebas Neue", "Anton", "Impact", sans-serif',

  /**
   * Body - Clean readable sans-serif
   * Source: Research §2 "Montserrat for body"
   */
  body: '"Montserrat", "Inter", "Helvetica Neue", sans-serif',

  /**
   * System - Native platform fonts
   */
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',

  /**
   * Mono - Code/technical content
   */
  mono: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
} as const);

export type FontStackName = keyof typeof FONT_STACKS;

/** Font size scale (px) */
export const FONT_SIZES = Object.freeze({
  xs: 14,
  sm: 18,
  md: 24,
  lg: 32,
  xl: 48,
  '2xl': 64,
  '3xl': 80,
  '4xl': 96,
} as const);

export type FontSizeName = keyof typeof FONT_SIZES;

/** Font weight values */
export const FONT_WEIGHTS = Object.freeze({
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 900,
} as const);

export type FontWeightName = keyof typeof FONT_WEIGHTS;
