# Render Style System - Implementation Plan v2 (FINAL)

**Date:** 2026-01-05  
**Status:** READY FOR IMPLEMENTATION  
**Review:** Iteration 2 - All critical issues addressed

---

## Overview

This document defines the final architecture for the render style system with:

- ✅ Factory pattern for immutable registries
- ✅ Primitives/presets separation
- ✅ Dependency injection for testability
- ✅ Single source of truth for types
- ✅ Source citations for all values
- ✅ Object freezing for immutability

---

## File Structure (Final)

```
src/render/
├── tokens/                     # PRIMITIVES (atomic values)
│   ├── index.ts                # Re-exports
│   ├── easing.ts               # Cubic-bezier curves, spring configs
│   ├── color.ts                # Raw color values
│   ├── font.ts                 # Font stacks, sizes, weights
│   ├── timing.ts               # Duration values (ms)
│   └── safe-zone.ts            # Platform margins
│
├── presets/                    # COMPOSITIONS (combined tokens)
│   ├── index.ts                # Re-exports
│   ├── palette.ts              # ColorPalette compositions
│   ├── typography.ts           # Typography compositions
│   ├── animation.ts            # Animation configs + types (SSoT)
│   └── caption.ts              # Caption style presets
│
├── themes/                     # THEME SYSTEM
│   ├── index.ts                # Factory-based registry
│   ├── types.ts                # Theme interface
│   └── defaults.ts             # Archetype → theme mapping
│
├── styles/                     # RESOLUTION
│   ├── index.ts                # Re-exports + default resolver
│   ├── resolver.ts             # DI-based style resolver
│   └── types.ts                # ResolvedStyle, StyleOverrides
│
├── schema.ts                   # Updated (imports from presets)
└── remotion/                   # Updated components
    └── Caption.tsx
```

---

## Phase 1: Token Primitives (TDD)

### 1.1 `tokens/easing.ts`

```typescript
/**
 * Easing Curves - Primitive timing functions
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §1
 */

/** CSS cubic-bezier easing curves */
export const EASING_CURVES = Object.freeze({
  /**
   * Snap-settle: Fast attack, smooth deceleration
   * Use for: Word pops, element entrances
   * Source: Research §1 "easeOutExpo variant"
   */
  snapSettle: 'cubic-bezier(0.16, 1, 0.3, 1)',

  /**
   * Punchy pop: Slight overshoot for emphasis
   * Use for: Highlighted words, attention grabbers
   * Source: Research §1 "easeOutBack variant"
   */
  punchyPop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  /**
   * Smooth glide: Gentle ease-in-out
   * Use for: Transitions, subtle movements
   */
  smoothGlide: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /**
   * Linear: No easing
   * Use for: Progress bars, constant motion
   */
  linear: 'cubic-bezier(0, 0, 1, 1)',
} as const);

export type EasingCurveName = keyof typeof EASING_CURVES;

/** Remotion spring configurations */
export const SPRING_CONFIGS = Object.freeze({
  /**
   * Snappy: Quick response with slight bounce
   * Source: Research §1 spring physics
   */
  snappy: Object.freeze({ damping: 15, stiffness: 200, mass: 1 }),

  /**
   * Bouncy: More pronounced overshoot
   */
  bouncy: Object.freeze({ damping: 10, stiffness: 150, mass: 1 }),

  /**
   * Gentle: Slow, smooth motion
   */
  gentle: Object.freeze({ damping: 20, stiffness: 100, mass: 1 }),
} as const);

export type SpringConfigName = keyof typeof SPRING_CONFIGS;

export interface SpringConfig {
  readonly damping: number;
  readonly stiffness: number;
  readonly mass: number;
}
```

### 1.2 `tokens/timing.ts`

```typescript
/**
 * Timing Values - Duration primitives in milliseconds
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §1
 */

/** Duration values in milliseconds */
export const TIMING_MS = Object.freeze({
  /**
   * Word pop animation duration
   * Source: Research §1 "70-130ms word pop"
   */
  wordPop: 100,

  /**
   * Title entrance animation
   * Source: Research §1 "200-350ms title entrance"
   */
  titleEntrance: 280,

  /**
   * Scene transition duration
   */
  sceneTransition: 400,

  /**
   * Highlight color transition
   */
  highlightTransition: 100,

  /**
   * Quick micro-interaction
   */
  micro: 50,
} as const);

export type TimingName = keyof typeof TIMING_MS;

/** Convert ms to frames at given FPS */
export function msToFrames(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/** Convert frames to ms at given FPS */
export function framesToMs(frames: number, fps: number): number {
  return Math.round((frames / fps) * 1000);
}
```

### 1.3 `tokens/color.ts`

```typescript
/**
 * Color Values - Raw color primitives
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §3
 */

/** Raw color values (hex, rgba) */
export const COLORS = Object.freeze({
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',

  // Earthy Comfort (Pantone 2025)
  // Source: Research §3 "Earthy Comfort"
  mochaMousesse: '#A47551',
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
```

### 1.4 `tokens/font.ts`

```typescript
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
```

### 1.5 `tokens/safe-zone.ts`

```typescript
/**
 * Safe Zones - Platform-specific margin primitives
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §4
 */

export interface SafeZone {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/** Platform safe zones (in pixels for 1080x1920) */
export const SAFE_ZONES = Object.freeze({
  /**
   * TikTok safe zone
   * Source: Research §4 "top: 150, bottom: 270"
   * Validated: TikTok iOS app 2025
   */
  tiktok: Object.freeze({ top: 150, bottom: 270, left: 40, right: 40 }),

  /**
   * Instagram Reels safe zone (asymmetric)
   * Source: Research §4 "right: 120 asymmetric for icons"
   */
  reels: Object.freeze({ top: 120, bottom: 200, left: 40, right: 120 }),

  /**
   * YouTube Shorts safe zone
   * Source: Research §4
   */
  shorts: Object.freeze({ top: 100, bottom: 180, left: 40, right: 40 }),

  /**
   * Generic safe zone for multi-platform
   */
  universal: Object.freeze({ top: 150, bottom: 270, left: 40, right: 120 }),
} as const);

export type PlatformName = keyof typeof SAFE_ZONES;

/** Get content-safe dimensions for a platform */
export function getContentBounds(
  platform: PlatformName,
  width: number = 1080,
  height: number = 1920
): { width: number; height: number; x: number; y: number } {
  const zone = SAFE_ZONES[platform];
  return {
    x: zone.left,
    y: zone.top,
    width: width - zone.left - zone.right,
    height: height - zone.top - zone.bottom,
  };
}
```

### 1.6 `tokens/index.ts`

```typescript
/**
 * Token Primitives - Re-exports
 */
export * from './easing';
export * from './timing';
export * from './color';
export * from './font';
export * from './safe-zone';
```

---

## Phase 2: Preset Compositions (TDD)

### 2.1 `presets/animation.ts` (Single Source of Truth)

```typescript
/**
 * Animation Presets - Composed animation configurations
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR ANIMATION TYPES
 * schema.ts imports from here
 */
import { SPRING_CONFIGS, EASING_CURVES, type SpringConfig } from '../tokens';
import { TIMING_MS } from '../tokens/timing';

/** Animation type enum - SSoT for all animation references */
export const ANIMATION_TYPES = [
  'none',
  'pop',
  'bounce',
  'karaoke',
  'typewriter',
  'fade',
  'slideUp',
  'slideDown',
] as const;

export type AnimationType = (typeof ANIMATION_TYPES)[number];

/** Animation configuration */
export interface AnimationConfig {
  readonly type: AnimationType;
  readonly duration: number;
  readonly easing: string;
  readonly spring?: SpringConfig;
  readonly scale?: { from: number; to: number };
  readonly opacity?: { from: number; to: number };
}

/** Pre-built animation presets */
export const ANIMATION_PRESETS = Object.freeze({
  /** No animation */
  none: Object.freeze({
    type: 'none' as const,
    duration: 0,
    easing: EASING_CURVES.linear,
  }),

  /**
   * Pop: Quick scale burst
   * Source: Research §1 "70-130ms word pop"
   */
  pop: Object.freeze({
    type: 'pop' as const,
    duration: TIMING_MS.wordPop,
    easing: EASING_CURVES.punchyPop,
    scale: { from: 1, to: 1.15 },
  }),

  /**
   * Bounce: Spring-based pop with overshoot
   */
  bounce: Object.freeze({
    type: 'bounce' as const,
    duration: TIMING_MS.wordPop,
    easing: EASING_CURVES.snapSettle,
    spring: SPRING_CONFIGS.bouncy,
    scale: { from: 1, to: 1.2 },
  }),

  /**
   * Karaoke: Highlight progression
   */
  karaoke: Object.freeze({
    type: 'karaoke' as const,
    duration: TIMING_MS.highlightTransition,
    easing: EASING_CURVES.smoothGlide,
  }),

  /**
   * Typewriter: Character-by-character reveal
   */
  typewriter: Object.freeze({
    type: 'typewriter' as const,
    duration: TIMING_MS.micro,
    easing: EASING_CURVES.linear,
  }),

  /**
   * Fade: Opacity transition
   */
  fade: Object.freeze({
    type: 'fade' as const,
    duration: TIMING_MS.wordPop,
    easing: EASING_CURVES.smoothGlide,
    opacity: { from: 0, to: 1 },
  }),

  /**
   * Slide Up: Vertical entrance
   */
  slideUp: Object.freeze({
    type: 'slideUp' as const,
    duration: TIMING_MS.titleEntrance,
    easing: EASING_CURVES.snapSettle,
    spring: SPRING_CONFIGS.snappy,
  }),

  /**
   * Slide Down: Vertical exit
   */
  slideDown: Object.freeze({
    type: 'slideDown' as const,
    duration: TIMING_MS.titleEntrance,
    easing: EASING_CURVES.snapSettle,
  }),
} as const);

export type AnimationPresetName = keyof typeof ANIMATION_PRESETS;
```

### 2.2 `presets/palette.ts`

```typescript
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
  }),

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
  }),

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
  }),

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
  }),

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
  }),
} as const);

export type PaletteName = keyof typeof PALETTES;
```

### 2.3 `presets/typography.ts`

```typescript
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
  }),

  /**
   * Caption Impact - Standard caption text
   * Source: Research §2 "Montserrat for body"
   */
  captionImpact: Object.freeze({
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
    lineHeight: 1.2,
  }),

  /**
   * Caption Clean - Lighter caption style
   */
  captionClean: Object.freeze({
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.semibold,
    lineHeight: 1.3,
  }),

  /**
   * Body - Standard body text
   */
  body: Object.freeze({
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: 1.5,
  }),

  /**
   * Code - Monospace for technical content
   */
  code: Object.freeze({
    fontFamily: FONT_STACKS.mono,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.normal,
    lineHeight: 1.4,
  }),
} as const);

export type TypographyPresetName = keyof typeof TYPOGRAPHY_PRESETS;
```

### 2.4 `presets/caption.ts`

```typescript
/**
 * Caption Style Presets - Complete caption configurations
 */
import { PALETTES, type ColorPalette } from './palette';
import { TYPOGRAPHY_PRESETS, type TypographyPreset } from './typography';
import { ANIMATION_PRESETS, type AnimationType } from './animation';

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
    colors: {
      text: PALETTES.futurePop.text,
      highlight: PALETTES.futurePop.highlight,
      stroke: PALETTES.futurePop.stroke,
    },
    animation: 'pop' as const,
    strokeWidth: 3,
    position: 'center' as const,
  }),

  /** Clean minimal - understated */
  cleanKaraoke: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.captionClean,
    colors: {
      text: PALETTES.cleanMinimal.text,
      highlight: PALETTES.cleanMinimal.highlight,
      stroke: PALETTES.cleanMinimal.stroke,
    },
    animation: 'karaoke' as const,
    strokeWidth: 2,
    position: 'bottom' as const,
  }),

  /** Earthy warm - softer feel */
  warmBounce: Object.freeze({
    typography: TYPOGRAPHY_PRESETS.captionImpact,
    colors: {
      text: PALETTES.earthyComfort.text,
      highlight: PALETTES.earthyComfort.highlight,
      stroke: PALETTES.earthyComfort.stroke,
    },
    animation: 'bounce' as const,
    strokeWidth: 3,
    position: 'center' as const,
  }),
} as const);

export type CaptionPresetName = keyof typeof CAPTION_PRESETS;
```

### 2.5 `presets/index.ts`

```typescript
/**
 * Presets - Re-exports
 */
export * from './animation';
export * from './palette';
export * from './typography';
export * from './caption';
```

---

## Phase 3: Theme System (TDD)

### 3.1 `themes/types.ts`

```typescript
/**
 * Theme Types
 */
import type { PaletteName } from '../presets/palette';
import type { TypographyPresetName } from '../presets/typography';
import type { AnimationPresetName } from '../presets/animation';
import type { CaptionPresetName } from '../presets/caption';
import type { PlatformName } from '../tokens/safe-zone';

/** Theme definition */
export interface Theme {
  readonly name: string;
  readonly description?: string;
  readonly palette: PaletteName;
  readonly typography: {
    readonly hook: TypographyPresetName;
    readonly caption: TypographyPresetName;
  };
  readonly animation: AnimationPresetName;
  readonly caption: CaptionPresetName;
  readonly platform: PlatformName;
}
```

### 3.2 `themes/index.ts` (Factory Pattern)

```typescript
/**
 * Theme Registry - Factory pattern for immutability
 */
import type { Theme } from './types';
import type { Archetype } from '../../core/config';

/** Built-in themes */
const BUILTIN_THEMES: Record<string, Theme> = Object.freeze({
  'bold-tech': {
    name: 'Bold Tech',
    description: 'High-energy tech content',
    palette: 'boldTech',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'pop',
    caption: 'boldPop',
    platform: 'tiktok',
  },
  'clean-minimal': {
    name: 'Clean Minimal',
    description: 'Professional, understated',
    palette: 'cleanMinimal',
    typography: { hook: 'hookBold', caption: 'captionClean' },
    animation: 'karaoke',
    caption: 'cleanKaraoke',
    platform: 'universal',
  },
  'earthy-warm': {
    name: 'Earthy Warm',
    description: 'Soft, approachable feel',
    palette: 'earthyComfort',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'bounce',
    caption: 'warmBounce',
    platform: 'tiktok',
  },
  'future-pop': {
    name: 'Future Pop',
    description: 'Trendy, digital-forward',
    palette: 'futurePop',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'pop',
    caption: 'boldPop',
    platform: 'reels',
  },
});

/** Default archetype → theme mapping */
const ARCHETYPE_DEFAULTS: Record<Archetype, string> = {
  listicle: 'bold-tech',
  versus: 'future-pop',
  howto: 'clean-minimal',
  myth: 'earthy-warm',
  story: 'earthy-warm',
  'hot-take': 'future-pop',
};

/** Theme registry interface */
export interface ThemeRegistry {
  get(name: string): Theme | undefined;
  getForArchetype(archetype: Archetype): Theme;
  list(): string[];
  register(name: string, theme: Theme): ThemeRegistry;
}

/**
 * Create a theme registry (factory pattern)
 * Returns immutable registry - register returns new instance
 */
export function createThemeRegistry(
  themes: Record<string, Theme> = BUILTIN_THEMES,
  archetypeDefaults: Record<Archetype, string> = ARCHETYPE_DEFAULTS
): ThemeRegistry {
  const frozenThemes = Object.freeze({ ...themes });

  return {
    get(name: string): Theme | undefined {
      return frozenThemes[name];
    },

    getForArchetype(archetype: Archetype): Theme {
      const themeName = archetypeDefaults[archetype];
      const theme = frozenThemes[themeName];
      if (!theme) {
        throw new Error(`No theme found for archetype: ${archetype}`);
      }
      return theme;
    },

    list(): string[] {
      return Object.keys(frozenThemes);
    },

    register(name: string, theme: Theme): ThemeRegistry {
      return createThemeRegistry({ ...frozenThemes, [name]: theme }, archetypeDefaults);
    },
  };
}

/** Default registry instance */
export const defaultThemeRegistry = createThemeRegistry();
```

### 3.3 `themes/defaults.ts`

```typescript
/**
 * Archetype Theme Defaults
 *
 * Maps content archetypes to default theme names.
 * Separate from registry for clear separation of concerns.
 */
import type { Archetype } from '../../core/config';

export const ARCHETYPE_THEME_DEFAULTS: Record<Archetype, string> = {
  listicle: 'bold-tech',
  versus: 'future-pop',
  howto: 'clean-minimal',
  myth: 'earthy-warm',
  story: 'earthy-warm',
  'hot-take': 'future-pop',
};
```

---

## Phase 4: Style Resolver (TDD)

### 4.1 `styles/types.ts`

```typescript
/**
 * Style System Types
 */
import type { ColorPalette } from '../presets/palette';
import type { TypographyPreset } from '../presets/typography';
import type { AnimationConfig } from '../presets/animation';
import type { SafeZone } from '../tokens/safe-zone';

/** Style overrides from user/config */
export interface StyleOverrides {
  palette?: Partial<ColorPalette>;
  typography?: Partial<TypographyPreset>;
  animation?: string;
  platform?: string;
}

/** Fully resolved style (no references, all values) */
export interface ResolvedStyle {
  readonly palette: ColorPalette;
  readonly typography: {
    readonly hook: TypographyPreset;
    readonly caption: TypographyPreset;
  };
  readonly animation: AnimationConfig;
  readonly safeZone: SafeZone;
  readonly caption: {
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontWeight: number;
    readonly color: string;
    readonly highlightColor: string;
    readonly strokeColor: string;
    readonly strokeWidth: number;
    readonly position: 'top' | 'center' | 'bottom';
    readonly animation: string;
  };
}
```

### 4.2 `styles/resolver.ts` (DI Pattern)

```typescript
/**
 * Style Resolver - DI-based style resolution
 */
import type { Archetype } from '../../core/config';
import type { Theme } from '../themes/types';
import type { ColorPalette } from '../presets/palette';
import type { TypographyPreset } from '../presets/typography';
import type { AnimationConfig } from '../presets/animation';
import type { CaptionPreset } from '../presets/caption';
import type { SafeZone } from '../tokens/safe-zone';
import type { ResolvedStyle, StyleOverrides } from './types';

/** Dependencies for style resolver */
export interface StyleResolverDeps {
  getTheme: (archetype: Archetype) => Theme;
  palettes: Record<string, ColorPalette>;
  typography: Record<string, TypographyPreset>;
  animations: Record<string, AnimationConfig>;
  captions: Record<string, CaptionPreset>;
  safeZones: Record<string, SafeZone>;
}

/** Create a style resolver with injected dependencies */
export function createStyleResolver(deps: StyleResolverDeps) {
  return function resolveStyle(
    archetype: Archetype,
    overrides: StyleOverrides = {}
  ): ResolvedStyle {
    const theme = deps.getTheme(archetype);

    // Resolve palette
    const basePalette = deps.palettes[theme.palette];
    if (!basePalette) {
      throw new Error(`Palette not found: ${theme.palette}`);
    }
    const palette: ColorPalette = overrides.palette
      ? { ...basePalette, ...overrides.palette }
      : basePalette;

    // Resolve typography
    const hookTypo = deps.typography[theme.typography.hook];
    const captionTypo = deps.typography[theme.typography.caption];
    if (!hookTypo || !captionTypo) {
      throw new Error(`Typography preset not found`);
    }
    const typography = {
      hook: overrides.typography ? { ...hookTypo, ...overrides.typography } : hookTypo,
      caption: overrides.typography ? { ...captionTypo, ...overrides.typography } : captionTypo,
    };

    // Resolve animation
    const animName = overrides.animation || theme.animation;
    const animation = deps.animations[animName];
    if (!animation) {
      throw new Error(`Animation not found: ${animName}`);
    }

    // Resolve safe zone
    const platformName = overrides.platform || theme.platform;
    const safeZone = deps.safeZones[platformName];
    if (!safeZone) {
      throw new Error(`Safe zone not found: ${platformName}`);
    }

    // Resolve caption preset
    const captionPreset = deps.captions[theme.caption];
    if (!captionPreset) {
      throw new Error(`Caption preset not found: ${theme.caption}`);
    }

    return {
      palette,
      typography,
      animation,
      safeZone,
      caption: {
        fontFamily: captionPreset.typography.fontFamily,
        fontSize: captionPreset.typography.fontSize,
        fontWeight: captionPreset.typography.fontWeight,
        color: palette.text,
        highlightColor: palette.highlight,
        strokeColor: palette.stroke,
        strokeWidth: captionPreset.strokeWidth,
        position: captionPreset.position,
        animation: animation.type,
      },
    };
  };
}
```

### 4.3 `styles/index.ts`

```typescript
/**
 * Styles - Re-exports and default resolver
 */
import { createStyleResolver, type StyleResolverDeps } from './resolver';
import { defaultThemeRegistry } from '../themes';
import { PALETTES } from '../presets/palette';
import { TYPOGRAPHY_PRESETS } from '../presets/typography';
import { ANIMATION_PRESETS } from '../presets/animation';
import { CAPTION_PRESETS } from '../presets/caption';
import { SAFE_ZONES } from '../tokens/safe-zone';

export * from './types';
export * from './resolver';

/** Default dependencies */
const defaultDeps: StyleResolverDeps = {
  getTheme: (archetype) => defaultThemeRegistry.getForArchetype(archetype),
  palettes: PALETTES,
  typography: TYPOGRAPHY_PRESETS,
  animations: ANIMATION_PRESETS,
  captions: CAPTION_PRESETS,
  safeZones: SAFE_ZONES,
};

/** Default style resolver */
export const resolveStyle = createStyleResolver(defaultDeps);
```

---

## Phase 5: Schema Update (SSoT)

### Updated `schema.ts`

```typescript
// Add import at top
import { ANIMATION_TYPES } from './presets/animation';

// Update CaptionStyleSchema to use SSoT
export const CaptionStyleSchema = z.object({
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().int().positive().default(48),
  fontWeight: z.enum(['normal', 'bold', '900']).default('bold'),
  color: z.string().default('#FFFFFF'),
  highlightColor: z.string().default('#FFE135'),
  highlightCurrentWord: z.boolean().default(true),
  strokeColor: z.string().default('#000000'),
  strokeWidth: z.number().int().nonnegative().default(3),
  position: z.enum(['bottom', 'center', 'top']).default('center'),
  animation: z.enum(ANIMATION_TYPES).default('pop'), // SSoT!
});
```

---

## Phase 6: Caption.tsx Update

### Key Changes

1. Import resolved style from resolver
2. Use easing curves from tokens
3. Use spring configs from tokens
4. Use timing values from tokens

```typescript
import { SPRING_CONFIGS, EASING_CURVES } from '../tokens';
import { TIMING_MS, msToFrames } from '../tokens/timing';
import { ANIMATION_PRESETS } from '../presets/animation';
```

---

## Testing Strategy

### Unit Tests Per Module

| Module            | Test File                 | Key Tests                   |
| ----------------- | ------------------------- | --------------------------- |
| tokens/easing     | tokens/easing.test.ts     | Curve values, freeze, types |
| tokens/timing     | tokens/timing.test.ts     | msToFrames conversion       |
| tokens/safe-zone  | tokens/safe-zone.test.ts  | getContentBounds            |
| presets/animation | presets/animation.test.ts | SSoT for types              |
| presets/palette   | presets/palette.test.ts   | Freeze, all colors valid    |
| themes/index      | themes/index.test.ts      | Factory pattern, register   |
| styles/resolver   | styles/resolver.test.ts   | DI, override merging        |

### Test Order (TDD)

1. ✅ Write failing test for easing.ts
2. ✅ Implement easing.ts → pass
3. ✅ Write failing test for timing.ts
4. ✅ Implement timing.ts → pass
5. Continue for all modules...

---

## Implementation Order

```
Week 1: Tokens + Presets
├── Day 1: tokens/easing.ts, tokens/timing.ts (TDD)
├── Day 2: tokens/color.ts, tokens/font.ts, tokens/safe-zone.ts (TDD)
├── Day 3: presets/animation.ts (SSoT), presets/palette.ts (TDD)
├── Day 4: presets/typography.ts, presets/caption.ts (TDD)
└── Day 5: tokens/index.ts, presets/index.ts, integration

Week 2: Themes + Styles + Integration
├── Day 1: themes/types.ts, themes/index.ts (factory) (TDD)
├── Day 2: styles/types.ts, styles/resolver.ts (DI) (TDD)
├── Day 3: schema.ts update, styles/index.ts
├── Day 4: Caption.tsx update (TDD)
└── Day 5: Integration tests, cleanup
```

---

## Ready for Implementation

✅ All critical issues from v1 addressed  
✅ Factory pattern for immutability  
✅ DI for testability  
✅ SSoT for animation types  
✅ Source citations included  
✅ Clear file structure  
✅ TDD test plan defined

**Proceed to implementation.**
