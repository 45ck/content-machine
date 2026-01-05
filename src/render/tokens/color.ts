/**
 * Color Values - Raw color primitives
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §3
 */

/** Raw color values (hex) */
export const COLORS = Object.freeze({
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Earthy Comfort (Pantone 2025)
  // Source: Research §3 "Earthy Comfort"
  mochaMousse: '#A47551',
  warmTaupe: '#8B7355',
  dustyRose: '#D4A5A5',
  oliveGreen: '#6B7B3C',

  // Future Pop (WGSN Future Dusk)
  // Source: Research §3 "Future Pop"
  electricBlue: '#00D4FF',
  neonPink: '#FF2D95',
  cyberPurple: '#9D4EDD',
  limeAccent: '#B8FF00',

  // TikTok Brand
  tikTokPink: '#FF0050',
  tikTokCyan: '#00F2EA',

  // Functional
  highlightYellow: '#FFE135',
  errorRed: '#FF3B30',
  successGreen: '#34C759',
} as const);

export type ColorName = keyof typeof COLORS;
