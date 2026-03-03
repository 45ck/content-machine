# Implementation Plan: Render Style System

**Date:** 2026-01-05  
**Status:** DRAFT - Under Review  
**Author:** AI Assistant  
**Reviewers:** TBD

---

## 1. Problem Statement

The current render system has hardcoded visual values (colors, fonts, timing) scattered across components. This makes it:

- Hard to maintain consistency
- Impossible to swap styles at runtime
- Difficult to add new archetypes
- Not testable in isolation

---

## 2. Design Goals

### Must Have

1. **Modularity** - Each concern (easing, typography, colors) is independent
2. **Composability** - Complex styles built from simple primitives
3. **Type Safety** - Full TypeScript inference, no `any`
4. **Runtime Flexibility** - Styles selectable at render time
5. **Backward Compatible** - Existing code continues to work

### Should Have

1. **User Overrides** - Users can customize defaults via config
2. **Theme System** - Group related styles into coherent themes
3. **Validation** - Invalid style combinations caught early

### Nice to Have

1. **Hot Reload** - Style changes visible in Remotion Studio instantly
2. **CSS Variable Export** - Generate CSS custom properties

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Style System Architecture                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │   Tokens     │  │   Tokens     │  │   Tokens     │  │   Tokens    │  │
│  │   (easing)   │  │ (typography) │  │  (palette)   │  │ (safe-zone) │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                 │                 │                 │         │
│         └────────────┬────┴────────┬────────┴────────┬────────┘         │
│                      │             │                 │                  │
│                      ▼             ▼                 ▼                  │
│               ┌─────────────────────────────────────────┐               │
│               │           Style Composer                 │               │
│               │  (Combines tokens into complete styles) │               │
│               └────────────────────┬────────────────────┘               │
│                                    │                                    │
│                                    ▼                                    │
│               ┌─────────────────────────────────────────┐               │
│               │          Theme Registry                  │               │
│               │  (Named collections: archetype themes)  │               │
│               └────────────────────┬────────────────────┘               │
│                                    │                                    │
│                                    ▼                                    │
│               ┌─────────────────────────────────────────┐               │
│               │          Style Resolver                  │               │
│               │  (Merges: defaults + theme + overrides) │               │
│               └────────────────────┬────────────────────┘               │
│                                    │                                    │
│                                    ▼                                    │
│               ┌─────────────────────────────────────────┐               │
│               │          Remotion Components            │               │
│               │  (Caption, ShortVideo, etc.)            │               │
│               └─────────────────────────────────────────┘               │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Module Design

### 4.1 Token Modules (Primitives)

Each token module exports:

- Type definitions
- Constant values
- Factory functions (if needed)

```
src/render/tokens/
├── index.ts           # Re-exports all tokens
├── easing.ts          # Motion easing curves
├── timing.ts          # Duration constants
├── typography.ts      # Font families, sizes, weights
├── palette.ts         # Color definitions
├── safe-zones.ts      # Platform margins
└── animation.ts       # Animation configuration types
```

### 4.2 Style Composer

Combines tokens into complete, validated style objects.

```
src/render/styles/
├── index.ts           # Re-exports
├── composer.ts        # combineStyles(), mergeWithDefaults()
├── caption-style.ts   # Caption-specific style building
└── video-style.ts     # Video-level style building
```

### 4.3 Theme Registry

Named style collections mapped to archetypes.

```
src/render/themes/
├── index.ts           # Registry + lookup functions
├── types.ts           # Theme type definitions
├── listicle.ts        # Listicle archetype theme
├── versus.ts          # Versus archetype theme
├── howto.ts           # How-to archetype theme
├── myth.ts            # Myth-buster archetype theme
├── story.ts           # Story archetype theme
└── hot-take.ts        # Hot-take archetype theme
```

### 4.4 Style Resolver

Merges theme + user overrides + defaults into final style.

```
src/render/styles/resolver.ts
```

---

## 5. Detailed Module Specifications

### 5.1 Easing Tokens (`tokens/easing.ts`)

```typescript
/**
 * Easing curve definitions using CSS cubic-bezier format.
 *
 * Design rationale:
 * - Object keyed by semantic name (not "ease1", "ease2")
 * - Values are strings for CSS compatibility
 * - Separate Remotion spring configs for frame-based animation
 */

// CSS cubic-bezier curves (for CSS transitions)
export const EASING_CURVES = {
  /** Fast acceleration, smooth settle - main entrance animation */
  snapSettle: 'cubic-bezier(0.16, 1, 0.3, 1)',

  /** Overshoot then return - punchy emphasis */
  punchyPop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  /** Smooth deceleration - secondary motion */
  smooth: 'cubic-bezier(0.33, 1, 0.68, 1)',

  /** Quick settle - faster variant */
  quickSettle: 'cubic-bezier(0.25, 1, 0.5, 1)',

  /** Linear - no easing */
  linear: 'cubic-bezier(0, 0, 1, 1)',
} as const;

export type EasingCurveName = keyof typeof EASING_CURVES;

// Remotion spring configurations (for frame-based animation)
export const SPRING_CONFIGS = {
  /** Snappy with slight overshoot - word pop */
  wordPop: { damping: 12, stiffness: 200, mass: 1 },

  /** Quick and tight - UI elements */
  tight: { damping: 20, stiffness: 300, mass: 1 },

  /** Bouncy - playful animations */
  bouncy: { damping: 8, stiffness: 150, mass: 1 },

  /** Smooth - gentle transitions */
  gentle: { damping: 15, stiffness: 100, mass: 1 },
} as const;

export type SpringConfigName = keyof typeof SPRING_CONFIGS;

// Factory for custom springs
export function createSpringConfig(damping: number, stiffness: number, mass = 1): SpringConfig {
  return { damping, stiffness, mass };
}
```

### 5.2 Typography Tokens (`tokens/typography.ts`)

```typescript
/**
 * Typography system with semantic font stacks.
 *
 * Design rationale:
 * - Stacks ordered by preference (first = ideal, last = fallback)
 * - Semantic names (hook, body) not visual names (big, small)
 * - Sizes in px for Remotion compatibility
 */

export const FONT_STACKS = {
  /** High-impact condensed - hooks, headers */
  impact: "'Bebas Neue', 'Anton', 'Impact', sans-serif",

  /** Clean geometric - body captions */
  body: "'Montserrat', 'Inter', 'Roboto', sans-serif",

  /** Handwriting accent - personality moments */
  accent: "'Permanent Marker', 'Caveat', cursive",

  /** Editorial serif - premium feel */
  editorial: "'Playfair Display', 'Lora', 'Georgia', serif",

  /** Monospace - code, technical */
  mono: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
} as const;

export type FontStackName = keyof typeof FONT_STACKS;

export const FONT_SIZES = {
  xs: 24,
  sm: 32,
  md: 42,
  lg: 56,
  xl: 72,
  xxl: 96,
} as const;

export type FontSizeName = keyof typeof FONT_SIZES;

export const FONT_WEIGHTS = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  black: '900',
} as const;

export type FontWeightName = keyof typeof FONT_WEIGHTS;

// Preset combinations for common use cases
export const TYPOGRAPHY_PRESETS = {
  hookBold: {
    fontFamily: FONT_STACKS.impact,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.bold,
  },
  captionDefault: {
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.lg,
    fontWeight: FONT_WEIGHTS.bold,
  },
  captionClean: {
    fontFamily: FONT_STACKS.body,
    fontSize: FONT_SIZES.md,
    fontWeight: FONT_WEIGHTS.semibold,
  },
  captionImpact: {
    fontFamily: FONT_STACKS.impact,
    fontSize: FONT_SIZES.xl,
    fontWeight: FONT_WEIGHTS.normal,
  },
} as const;

export type TypographyPresetName = keyof typeof TYPOGRAPHY_PRESETS;
```

### 5.3 Palette Tokens (`tokens/palette.ts`)

```typescript
/**
 * Color palette system with named themes.
 *
 * Design rationale:
 * - Each palette is a complete set (not mix-and-match)
 * - Semantic color names (text, background, accent)
 * - Hex values for maximum compatibility
 */

export interface ColorPalette {
  /** Primary background color */
  background: string;
  /** Primary text color */
  text: string;
  /** Caption background (if used) */
  captionBackground: string;
  /** Default caption text */
  captionText: string;
  /** Highlighted/active word */
  highlight: string;
  /** Secondary accent */
  accent: string;
  /** Stroke/outline color */
  stroke: string;
}

export const PALETTES: Record<string, ColorPalette> = {
  /** Warm, grounded - 2025 Pantone Mocha Mousse inspired */
  earthyComfort: {
    background: '#2D2A26',
    text: '#F5E6D3',
    captionBackground: 'rgba(45, 42, 38, 0.85)',
    captionText: '#F5E6D3',
    highlight: '#C17F59',
    accent: '#8B9A7D',
    stroke: '#1A1816',
  },

  /** Tech, futuristic - neon accents on dark */
  futurePop: {
    background: '#1A1A2E',
    text: '#FFFFFF',
    captionBackground: 'rgba(26, 26, 46, 0.9)',
    captionText: '#FFFFFF',
    highlight: '#00D4FF',
    accent: '#FF006E',
    stroke: '#000000',
  },

  /** High contrast - maximum readability */
  boldContrast: {
    background: '#000000',
    text: '#FFFFFF',
    captionBackground: 'rgba(0, 0, 0, 0.8)',
    captionText: '#FFFFFF',
    highlight: '#FFE135',
    accent: '#FF4444',
    stroke: '#000000',
  },

  /** Clean, professional - minimal aesthetic */
  cleanMinimal: {
    background: '#FFFFFF',
    text: '#1A1A1A',
    captionBackground: 'rgba(255, 255, 255, 0.95)',
    captionText: '#1A1A1A',
    highlight: '#2563EB',
    accent: '#10B981',
    stroke: '#E5E7EB',
  },

  /** Playful, energetic - bright colors */
  vibrantPlay: {
    background: '#7C3AED',
    text: '#FFFFFF',
    captionBackground: 'rgba(124, 58, 237, 0.9)',
    captionText: '#FFFFFF',
    highlight: '#FDE047',
    accent: '#F472B6',
    stroke: '#4C1D95',
  },
} as const;

export type PaletteName = keyof typeof PALETTES;

// Allow extending with custom palettes
export function registerPalette(name: string, palette: ColorPalette): void {
  (PALETTES as Record<string, ColorPalette>)[name] = palette;
}
```

### 5.4 Safe Zone Tokens (`tokens/safe-zones.ts`)

```typescript
/**
 * Platform-specific safe zones for text/UI placement.
 *
 * Design rationale:
 * - Margins in pixels for 1080x1920 base resolution
 * - Scales proportionally for other resolutions
 * - Platform names match common usage
 */

export interface SafeZone {
  /** Distance from top edge */
  top: number;
  /** Distance from bottom edge */
  bottom: number;
  /** Distance from left edge */
  left: number;
  /** Distance from right edge */
  right: number;
}

export const SAFE_ZONES: Record<string, SafeZone> = {
  /** TikTok - account for UI overlays */
  tiktok: { top: 150, bottom: 270, left: 40, right: 40 },

  /** Instagram Reels - asymmetric right margin */
  reels: { top: 108, bottom: 320, left: 60, right: 120 },

  /** YouTube Shorts - centered content */
  shorts: { top: 100, bottom: 200, left: 50, right: 50 },

  /** Universal - works reasonably on all platforms */
  universal: { top: 120, bottom: 280, left: 60, right: 60 },

  /** No margins - full bleed */
  none: { top: 0, bottom: 0, left: 0, right: 0 },
} as const;

export type SafeZoneName = keyof typeof SAFE_ZONES;

/**
 * Scale safe zone for different resolutions
 */
export function scaleSafeZone(zone: SafeZone, targetWidth: number, baseWidth = 1080): SafeZone {
  const scale = targetWidth / baseWidth;
  return {
    top: Math.round(zone.top * scale),
    bottom: Math.round(zone.bottom * scale),
    left: Math.round(zone.left * scale),
    right: Math.round(zone.right * scale),
  };
}

/**
 * Get content area dimensions after applying safe zone
 */
export function getContentArea(
  zone: SafeZone,
  width: number,
  height: number
): { width: number; height: number; x: number; y: number } {
  return {
    x: zone.left,
    y: zone.top,
    width: width - zone.left - zone.right,
    height: height - zone.top - zone.bottom,
  };
}
```

### 5.5 Animation Tokens (`tokens/animation.ts`)

```typescript
/**
 * Animation configuration tokens.
 *
 * Design rationale:
 * - Timing in milliseconds for human readability
 * - Frames calculated at render time based on fps
 * - Animation types are semantic, not implementation
 */

export const TIMING = {
  /** Word pop/emphasis - very quick */
  wordPop: 100,

  /** Micro UI accent - quick */
  microAccent: 166,

  /** Title entrance - medium */
  titleEntrance: 333,

  /** Scene transition - slower */
  sceneTransition: 500,

  /** Settle after motion */
  settle: 200,
} as const;

export type TimingName = keyof typeof TIMING;

/**
 * Convert milliseconds to frames
 */
export function msToFrames(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/**
 * Animation type definitions
 */
export type AnimationType =
  | 'none'
  | 'pop' // Scale up then settle
  | 'bounce' // Spring with overshoot
  | 'typewriter' // Characters appear sequentially
  | 'karaoke' // Word-by-word with background wipe
  | 'fade' // Simple opacity fade
  | 'slideUp' // Slide in from bottom
  | 'slideDown'; // Slide in from top

export interface AnimationConfig {
  type: AnimationType;
  duration: number; // ms
  delay: number; // ms (for stagger effects)
  easing: string; // cubic-bezier or spring name
}

export const ANIMATION_PRESETS: Record<string, AnimationConfig> = {
  wordPopDefault: {
    type: 'pop',
    duration: TIMING.wordPop,
    delay: 0,
    easing: 'punchyPop',
  },
  wordBounce: {
    type: 'bounce',
    duration: TIMING.wordPop * 1.5,
    delay: 0,
    easing: 'bouncy',
  },
  typewriterFast: {
    type: 'typewriter',
    duration: 50,
    delay: 30,
    easing: 'linear',
  },
  karaokeSmooth: {
    type: 'karaoke',
    duration: TIMING.wordPop,
    delay: 0,
    easing: 'smooth',
  },
} as const;

export type AnimationPresetName = keyof typeof ANIMATION_PRESETS;
```

### 5.6 Theme Registry (`themes/index.ts`)

```typescript
/**
 * Theme registry - maps archetypes to complete style configurations.
 *
 * Design rationale:
 * - Themes are complete, not partial (no undefined values)
 * - Each archetype has a default theme
 * - Themes can be registered dynamically
 */

import { Archetype } from '../../core/config';
import { PaletteName, PALETTES } from '../tokens/palette';
import { TypographyPresetName, TYPOGRAPHY_PRESETS } from '../tokens/typography';
import { AnimationPresetName, ANIMATION_PRESETS } from '../tokens/animation';
import { SafeZoneName } from '../tokens/safe-zones';
import { SpringConfigName } from '../tokens/easing';

export interface Theme {
  name: string;
  description: string;

  // Token references
  palette: PaletteName;
  typography: TypographyPresetName;
  animation: AnimationPresetName;
  springConfig: SpringConfigName;
  safeZone: SafeZoneName;

  // Caption-specific overrides
  caption: {
    position: 'top' | 'center' | 'bottom';
    showBackground: boolean;
    backgroundRadius: number;
    backgroundPadding: number;
    strokeWidth: number;
    maxWordsVisible: number;
  };
}

const ARCHETYPE_THEMES: Record<Archetype, Theme> = {
  listicle: {
    name: 'Listicle',
    description: 'Bold, numbered, high-energy',
    palette: 'futurePop',
    typography: 'captionImpact',
    animation: 'wordPopDefault',
    springConfig: 'wordPop',
    safeZone: 'universal',
    caption: {
      position: 'center',
      showBackground: false,
      backgroundRadius: 8,
      backgroundPadding: 12,
      strokeWidth: 3,
      maxWordsVisible: 5,
    },
  },

  versus: {
    name: 'Versus',
    description: 'Dramatic comparison',
    palette: 'boldContrast',
    typography: 'captionImpact',
    animation: 'wordBounce',
    springConfig: 'bouncy',
    safeZone: 'universal',
    caption: {
      position: 'center',
      showBackground: false,
      backgroundRadius: 0,
      backgroundPadding: 16,
      strokeWidth: 4,
      maxWordsVisible: 4,
    },
  },

  howto: {
    name: 'How-To',
    description: 'Clean, instructional',
    palette: 'cleanMinimal',
    typography: 'captionClean',
    animation: 'typewriterFast',
    springConfig: 'gentle',
    safeZone: 'universal',
    caption: {
      position: 'bottom',
      showBackground: true,
      backgroundRadius: 4,
      backgroundPadding: 8,
      strokeWidth: 0,
      maxWordsVisible: 8,
    },
  },

  myth: {
    name: 'Myth Buster',
    description: 'Dramatic reveal',
    palette: 'boldContrast',
    typography: 'captionDefault',
    animation: 'wordPopDefault',
    springConfig: 'tight',
    safeZone: 'universal',
    caption: {
      position: 'center',
      showBackground: false,
      backgroundRadius: 0,
      backgroundPadding: 0,
      strokeWidth: 3,
      maxWordsVisible: 5,
    },
  },

  story: {
    name: 'Story',
    description: 'Warm, narrative',
    palette: 'earthyComfort',
    typography: 'captionDefault',
    animation: 'karaokeSmooth',
    springConfig: 'gentle',
    safeZone: 'universal',
    caption: {
      position: 'bottom',
      showBackground: true,
      backgroundRadius: 8,
      backgroundPadding: 12,
      strokeWidth: 0,
      maxWordsVisible: 6,
    },
  },

  'hot-take': {
    name: 'Hot Take',
    description: 'Bold, provocative',
    palette: 'vibrantPlay',
    typography: 'hookBold',
    animation: 'wordBounce',
    springConfig: 'bouncy',
    safeZone: 'universal',
    caption: {
      position: 'center',
      showBackground: false,
      backgroundRadius: 0,
      backgroundPadding: 0,
      strokeWidth: 4,
      maxWordsVisible: 4,
    },
  },
};

/**
 * Get theme for archetype
 */
export function getTheme(archetype: Archetype): Theme {
  return ARCHETYPE_THEMES[archetype];
}

/**
 * Get all registered themes
 */
export function getAllThemes(): Record<Archetype, Theme> {
  return { ...ARCHETYPE_THEMES };
}

/**
 * Register a custom theme (for extension)
 */
export function registerTheme(archetype: Archetype, theme: Theme): void {
  ARCHETYPE_THEMES[archetype] = theme;
}
```

### 5.7 Style Resolver (`styles/resolver.ts`)

```typescript
/**
 * Resolves final styles by merging theme + user overrides.
 *
 * Design rationale:
 * - Deep merge with explicit override rules
 * - Validates final result
 * - Returns fully resolved, ready-to-use styles
 */

import { Theme, getTheme } from '../themes';
import { Archetype } from '../../core/config';
import { PALETTES, ColorPalette } from '../tokens/palette';
import { TYPOGRAPHY_PRESETS } from '../tokens/typography';
import { ANIMATION_PRESETS, AnimationConfig } from '../tokens/animation';
import { SPRING_CONFIGS } from '../tokens/easing';
import { SAFE_ZONES, SafeZone } from '../tokens/safe-zones';
import { CaptionStyle } from '../schema';

export interface ResolvedStyle {
  palette: ColorPalette;
  typography: {
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
  };
  animation: AnimationConfig;
  springConfig: { damping: number; stiffness: number; mass: number };
  safeZone: SafeZone;
  caption: Theme['caption'];
}

export interface StyleOverrides {
  palette?: Partial<ColorPalette>;
  typography?: Partial<ResolvedStyle['typography']>;
  animation?: Partial<AnimationConfig>;
  caption?: Partial<Theme['caption']>;
  safeZone?: string;
}

/**
 * Resolve complete style from archetype + overrides
 */
export function resolveStyle(archetype: Archetype, overrides: StyleOverrides = {}): ResolvedStyle {
  const theme = getTheme(archetype);

  // Resolve each token category
  const basePalette = PALETTES[theme.palette];
  const baseTypography = TYPOGRAPHY_PRESETS[theme.typography];
  const baseAnimation = ANIMATION_PRESETS[theme.animation];
  const baseSpring = SPRING_CONFIGS[theme.springConfig];
  const baseSafeZone = SAFE_ZONES[overrides.safeZone ?? theme.safeZone];

  return {
    palette: { ...basePalette, ...overrides.palette },
    typography: { ...baseTypography, ...overrides.typography },
    animation: { ...baseAnimation, ...overrides.animation },
    springConfig: { ...baseSpring },
    safeZone: baseSafeZone,
    caption: { ...theme.caption, ...overrides.caption },
  };
}

/**
 * Convert ResolvedStyle to CaptionStyle for component props
 */
export function toCaptionStyle(resolved: ResolvedStyle): CaptionStyle {
  return {
    fontFamily: resolved.typography.fontFamily,
    fontSize: resolved.typography.fontSize,
    fontWeight: resolved.typography.fontWeight as 'normal' | 'bold' | '900',
    color: resolved.palette.captionText,
    highlightColor: resolved.palette.highlight,
    highlightCurrentWord: true,
    strokeColor: resolved.palette.stroke,
    strokeWidth: resolved.caption.strokeWidth,
    position: resolved.caption.position,
    animation: resolved.animation.type as CaptionStyle['animation'],
  };
}
```

---

## 6. File Structure Summary

```
src/render/
├── tokens/                    # Primitive design tokens
│   ├── index.ts              # Re-exports all tokens
│   ├── easing.ts             # Easing curves + spring configs
│   ├── timing.ts             # Duration constants
│   ├── typography.ts         # Font stacks, sizes, weights
│   ├── palette.ts            # Color palettes
│   ├── safe-zones.ts         # Platform margins
│   └── animation.ts          # Animation types + presets
│
├── themes/                    # Archetype themes
│   ├── index.ts              # Registry + lookup
│   └── types.ts              # Theme type definitions
│
├── styles/                    # Style composition
│   ├── index.ts              # Re-exports
│   ├── resolver.ts           # Merge theme + overrides
│   └── defaults.ts           # Default style values
│
├── remotion/                  # Remotion components (existing)
│   ├── Caption.tsx           # UPDATE to use resolved styles
│   ├── ShortVideo.tsx        # UPDATE to apply safe zones
│   └── index.ts
│
├── schema.ts                  # UPDATE with new options
└── service.ts                 # UPDATE to wire style resolution
```

---

## 7. Integration Points

### 7.1 Schema Updates (`schema.ts`)

Add to RenderPropsSchema:

```typescript
// New fields
platform: z.enum(['tiktok', 'reels', 'shorts', 'universal']).optional(),
styleOverrides: StyleOverridesSchema.optional(),
```

### 7.2 CLI Updates

Add flags to render command:

```bash
cm render --platform tiktok --palette futurePop --animation bounce
```

### 7.3 Config File Support

Allow in `.content-machine.toml`:

```toml
[render.style]
default_palette = "futurePop"
default_platform = "tiktok"

[render.style.overrides]
highlight_color = "#FF0000"
```

---

## 8. Migration Strategy

### Phase 1: Add New (Non-Breaking)

1. Create all token files
2. Create theme registry
3. Create style resolver
4. All existing code continues to work unchanged

### Phase 2: Wire Up

1. Update Caption.tsx to accept ResolvedStyle
2. Update ShortVideo.tsx to apply safe zones
3. Default behavior unchanged (backward compatible)

### Phase 3: Expose

1. Add CLI flags
2. Add config file support
3. Update documentation

---

## 9. Testing Strategy

### Unit Tests

- Each token file exports expected values
- Palette has all required colors
- Safe zone calculations are correct
- Style resolver merges correctly

### Integration Tests

- Theme lookup returns complete theme
- Style resolution with overrides works
- CaptionStyle conversion is valid

### Visual Tests (Remotion)

- Render sample with each archetype
- Verify safe zones don't clip text
- Compare animation timing to spec

---

## 10. Open Questions

1. **Font Loading:** How do we ensure fonts are available in Remotion?
2. **Color Format:** Should we support HSL/RGB in addition to hex?
3. **Theme Inheritance:** Should themes be able to extend other themes?
4. **Runtime Validation:** How strict should style validation be?

---

## 11. Risks & Mitigations

| Risk                         | Impact             | Mitigation                             |
| ---------------------------- | ------------------ | -------------------------------------- |
| Font not available at render | Broken text        | Fallback fonts in stack                |
| Breaking existing renders    | User frustration   | Backward compatible defaults           |
| Too many options             | Decision paralysis | Good defaults, minimal required config |
| Performance impact           | Slow renders       | Resolve once, pass to components       |

---

## Review Checklist

- [ ] Modularity: Each concern in separate module?
- [ ] Extensibility: Easy to add new archetypes/palettes?
- [ ] Type Safety: No `any`, full inference?
- [ ] Testability: Pure functions, injectable dependencies?
- [ ] Backward Compatible: Existing code works unchanged?
- [ ] Research Aligned: Values match research findings?

---

## Next Steps

1. Review this plan
2. Address open questions
3. Create task breakdown
4. Implement with TDD
