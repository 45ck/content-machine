# Style System Usage Guide

**Date:** 2026-01-05  
**Version:** 1.0.0  
**Status:** Complete

---

## Overview

The content-machine style system provides a layered, research-backed approach to video styling. It follows a **token → preset → theme → resolver** architecture with full TypeScript type safety, immutability via `Object.freeze()`, and dependency injection for testability.

## Architecture Layers

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            Style System Layers                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. TOKENS (Primitives)                                                     │
│     └─ Raw values: timing, easing, colors, fonts, safe zones                │
│                                                                              │
│  2. PRESETS (Compositions)                                                  │
│     └─ Composed settings: animation, palette, typography, caption           │
│                                                                              │
│  3. THEMES (Named bundles)                                                  │
│     └─ Reference presets by name: "bold-tech", "earthy-warm"                │
│                                                                              │
│  4. RESOLVER (Runtime)                                                      │
│     └─ Archetype → Theme → Resolved values + Overrides                      │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Basic Usage

```typescript
import { resolveStyle, TIMING_MS, SAFE_ZONES } from '../render';

// Get complete style for an archetype
const style = resolveStyle('listicle');

// Use in Remotion component
const captionProps = {
  fontFamily: style.caption.fontFamily, // "Bebas Neue, Impact, ..."
  fontSize: style.caption.fontSize, // 56
  highlightColor: style.palette.highlight, // "#C4A484"
  animation: style.animation.type, // "pop"
};
```

### With Overrides

```typescript
// Override specific values while keeping defaults
const style = resolveStyle('versus', {
  palette: { highlight: '#FF0000' }, // Custom highlight color
  platform: 'reels', // Use Reels safe zones
  animation: 'bounce', // Override animation type
});

// Palette is merged - other colors from theme preserved
console.log(style.palette.primary); // Theme default
console.log(style.palette.highlight); // '#FF0000' (overridden)
```

## Token Reference

### Timing (`TIMING_MS`)

Research-backed timing values in milliseconds.

| Token                 | Value | Research Source               |
| --------------------- | ----- | ----------------------------- |
| `micro`               | 50ms  | UI micro-interactions         |
| `wordPop`             | 100ms | §1 "70-130ms word pop"        |
| `highlightTransition` | 150ms | Karaoke word transitions      |
| `sceneTransition`     | 200ms | Scene crossfades              |
| `titleEntrance`       | 280ms | §1 "200-350ms title entrance" |
| `elementEntrance`     | 350ms | Full element animations       |
| `contemplation`       | 500ms | Pause before next element     |

```typescript
import { TIMING_MS, msToFrames } from '../render';

// Convert to frames for Remotion
const popFrames = msToFrames(TIMING_MS.wordPop, 30); // 3 frames at 30fps
```

### Easing Curves (`EASING_CURVES`)

| Curve         | CSS Cubic-Bezier      | Purpose                       |
| ------------- | --------------------- | ----------------------------- |
| `snapSettle`  | `0.16, 1, 0.3, 1`     | Quick snap with smooth settle |
| `punchyPop`   | `0.34, 1.56, 0.64, 1` | Overshoot for word pops       |
| `smoothGlide` | `0.4, 0, 0.2, 1`      | Gentle entrance/exit          |
| `linear`      | `0, 0, 1, 1`          | Constant speed                |

### Spring Configs (`SPRING_CONFIGS`)

For Remotion's `spring()` function.

| Config   | Damping | Mass | Stiffness | Use Case          |
| -------- | ------- | ---- | --------- | ----------------- |
| `snappy` | 10      | 0.5  | 180       | Quick UI response |
| `bouncy` | 6       | 0.8  | 100       | Playful pops      |
| `gentle` | 15      | 1.0  | 80        | Smooth entrances  |

```typescript
import { spring } from 'remotion';
import { SPRING_CONFIGS } from '../render';

const bounceScale = spring({
  fps: 30,
  frame: currentFrame - startFrame,
  config: SPRING_CONFIGS.bouncy,
});
```

### Safe Zones (`SAFE_ZONES`)

Platform-specific content margins (pixels at 1080x1920).

| Platform    | Top | Right | Bottom | Left | Notes                   |
| ----------- | --- | ----- | ------ | ---- | ----------------------- |
| `tiktok`    | 150 | 100   | 270    | 100  | Larger bottom for UI    |
| `reels`     | 120 | 120   | 200    | 80   | Asymmetric right margin |
| `shorts`    | 120 | 100   | 200    | 100  | Balanced margins        |
| `universal` | 150 | 120   | 270    | 120  | Works on all platforms  |

```typescript
import { SAFE_ZONES, getContentBounds } from '../render';

const bounds = getContentBounds(SAFE_ZONES.tiktok, 1080, 1920);
// { x: 100, y: 150, width: 880, height: 1500 }
```

### Colors (`COLORS`)

| Category              | Key               | Value     | Description       |
| --------------------- | ----------------- | --------- | ----------------- |
| Neutrals              | `white`           | `#FFFFFF` | Pure white        |
| Neutrals              | `black`           | `#000000` | Pure black        |
| Earthy (Pantone 2025) | `mochaMousesse`   | `#8B6F47` | Primary brown     |
| Earthy                | `warmTaupe`       | `#A08570` | Secondary warm    |
| Earthy                | `dustyRose`       | `#C4A484` | Accent blush      |
| Future Pop (WGSN)     | `electricBlue`    | `#00D4FF` | Cyan highlight    |
| Future Pop            | `neonPink`        | `#FF00FF` | Magenta accent    |
| Future Pop            | `cyberPurple`     | `#9D4EDD` | Deep purple       |
| TikTok Brand          | `tikTokPink`      | `#FE2C55` | TikTok red        |
| TikTok Brand          | `tikTokCyan`      | `#25F4EE` | TikTok blue       |
| Functional            | `highlightYellow` | `#FFE135` | Caption highlight |

### Fonts (`FONT_STACKS`)

| Stack    | Fonts                           | Use Case            |
| -------- | ------------------------------- | ------------------- |
| `impact` | Bebas Neue, Impact, ...         | Hooks, titles       |
| `body`   | Montserrat, Helvetica Neue, ... | Captions, body text |
| `mono`   | JetBrains Mono, Menlo, ...      | Code, technical     |

## Preset Reference

### Animation Presets (`ANIMATION_PRESETS`)

| Preset       | Duration | Easing        | Effect                     |
| ------------ | -------- | ------------- | -------------------------- |
| `none`       | 0ms      | linear        | Static                     |
| `pop`        | 100ms    | punchyPop     | Scale 1→1.15               |
| `bounce`     | 100ms    | bouncy spring | Scale 1→1.2 with overshoot |
| `karaoke`    | 150ms    | smoothGlide   | Progressive highlight      |
| `typewriter` | 50ms     | linear        | Character reveal           |
| `fade`       | 100ms    | smoothGlide   | Opacity 0→1                |
| `slideUp`    | 280ms    | snappy spring | Vertical entrance          |
| `slideDown`  | 280ms    | snapSettle    | Vertical exit              |

### Palette Presets (`PALETTES`)

| Preset          | Trend            | Primary       | Highlight   |
| --------------- | ---------------- | ------------- | ----------- |
| `earthyComfort` | Pantone 2025     | Mocha brown   | Dusty rose  |
| `futurePop`     | WGSN Future Dusk | Electric blue | Lime green  |
| `tikTokNative`  | Platform         | TikTok pink   | TikTok cyan |
| `cleanMinimal`  | Classic          | White         | Yellow      |
| `boldTech`      | High-energy      | Electric blue | Lime green  |

### Caption Presets (`CAPTION_PRESETS`)

| Preset         | Animation | Colors           | Font            |
| -------------- | --------- | ---------------- | --------------- |
| `boldPop`      | pop       | White/Yellow     | Impact 56px 900 |
| `cleanKaraoke` | karaoke   | White/Yellow     | Body 48px 700   |
| `warmBounce`   | bounce    | White/Dusty rose | Impact 52px 900 |

## Theme System

### Built-in Themes

```typescript
import { defaultThemeRegistry } from '../render';

// List available themes
console.log(defaultThemeRegistry.list());
// ['bold-tech', 'clean-minimal', 'earthy-warm', 'future-pop']

// Get theme by name
const theme = defaultThemeRegistry.get('bold-tech');
```

### Archetype Defaults

Each content archetype maps to a default theme:

| Archetype  | Default Theme |
| ---------- | ------------- |
| `listicle` | bold-tech     |
| `versus`   | bold-tech     |
| `howto`    | clean-minimal |
| `myth`     | earthy-warm   |
| `story`    | earthy-warm   |
| `hot-take` | future-pop    |

### Custom Theme Registration

Themes are immutable - registration returns a new registry:

```typescript
import { createThemeRegistry, defaultThemeRegistry } from '../render';

// Create custom theme
const customTheme = {
  name: 'Neon Nights',
  description: 'High contrast neon aesthetic',
  palette: 'futurePop',
  typography: { hook: 'hookBold', caption: 'captionImpact' },
  animation: 'bounce',
  caption: 'boldPop',
  platform: 'tiktok',
};

// Register returns NEW registry (original unchanged)
const extendedRegistry = defaultThemeRegistry.register('neon-nights', customTheme);

// Use with custom resolver
const resolver = createStyleResolver({
  getTheme: (archetype) =>
    archetype === 'hot-take'
      ? extendedRegistry.get('neon-nights')!
      : defaultThemeRegistry.getForArchetype(archetype),
  palettes: PALETTES,
  typography: TYPOGRAPHY_PRESETS,
  animations: ANIMATION_PRESETS,
  captions: CAPTION_PRESETS,
  safeZones: SAFE_ZONES,
});
```

## Integration with Caption.tsx

The `Caption.tsx` component already imports from the style system:

```typescript
// In Caption.tsx
import { SPRING_CONFIGS, TIMING_MS, msToFrames, ANIMATION_PRESETS } from '../tokens';

// Uses research-backed timing
const popDuration = msToFrames(TIMING_MS.wordPop, fps);

// Uses spring config for bounce
const bounceScale = spring({
  fps,
  frame: currentFrame - wordStart,
  config: SPRING_CONFIGS.bouncy,
});
```

## Testing

### Unit Testing with Fake Dependencies

```typescript
import { createStyleResolver } from '../render';

describe('Custom Styling', () => {
  it('should use injected palettes', () => {
    const fakePalettes = {
      test: { primary: '#FF0000' /* ... */ },
    };

    const resolver = createStyleResolver({
      getTheme: () => ({ palette: 'test' /* ... */ }),
      palettes: fakePalettes,
      // ... other deps
    });

    const style = resolver('listicle');
    expect(style.palette.primary).toBe('#FF0000');
  });
});
```

### Verifying Research Values

```typescript
import { TIMING_MS, EASING_CURVES } from '../render';

describe('Research Compliance', () => {
  it('should use word pop timing in 70-130ms range', () => {
    expect(TIMING_MS.wordPop).toBeGreaterThanOrEqual(70);
    expect(TIMING_MS.wordPop).toBeLessThanOrEqual(130);
  });

  it('should have correct punchyPop curve', () => {
    expect(EASING_CURVES.punchyPop).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
  });
});
```

## Research Sources

All values are sourced from:

- **§1 Motion & Timing:** `docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md`
- **§2 Typography:** Late-2025 short-form video typography trends
- **§3 Color Palettes:** Pantone 2025, WGSN Future Dusk, TikTok brand
- **§4 Platform Safe Zones:** Official platform design guidelines

## File Structure

```
src/render/
├── tokens/           # Primitive values
│   ├── easing.ts     # Curves + spring configs
│   ├── timing.ts     # Duration values + conversions
│   ├── color.ts      # Color palette values
│   ├── font.ts       # Font stacks + sizes
│   └── safe-zone.ts  # Platform margins
├── presets/          # Composed configurations
│   ├── animation.ts  # Animation configs (SSoT for types)
│   ├── palette.ts    # Color palette compositions
│   ├── typography.ts # Typography compositions
│   └── caption.ts    # Caption style compositions
├── themes/           # Named theme bundles
│   ├── types.ts      # Theme interface
│   ├── defaults.ts   # Archetype → theme mapping
│   └── index.ts      # Registry factory
├── styles/           # Runtime resolver
│   ├── types.ts      # Override + result interfaces
│   ├── resolver.ts   # DI-enabled resolver
│   └── index.ts      # Default instance + exports
└── index.ts          # Module public API
```

---

**Next Steps:**

1. Add more caption presets for variety
2. Create platform-specific style variants
3. Add visual theme preview tooling
