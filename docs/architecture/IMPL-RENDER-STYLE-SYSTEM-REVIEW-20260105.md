# Code Review: Render Style System Implementation Plan

**Reviewer:** Self-Review  
**Date:** 2026-01-05  
**Status:** ITERATION 1

---

## Overall Assessment

**Score: 7/10** - Good foundation but has architectural issues that will cause pain at scale.

---

## 🔴 Critical Issues

### Issue 1: Mutable Global State in Registries

**Location:** `tokens/palette.ts`, `themes/index.ts`

**Problem:**

```typescript
export function registerPalette(name: string, palette: ColorPalette): void {
  (PALETTES as Record<string, ColorPalette>)[name] = palette;
}
```

This mutates a module-level constant, causing:

- Test pollution (tests affect each other)
- Race conditions in concurrent renders
- Unpredictable behavior

**Fix:** Use immutable pattern with factory:

```typescript
export function createPaletteRegistry(initial = PALETTES) {
  const palettes = new Map(Object.entries(initial));
  return {
    get: (name: string) => palettes.get(name),
    register: (name: string, palette: ColorPalette) => {
      const next = new Map(palettes);
      next.set(name, palette);
      return createPaletteRegistry(Object.fromEntries(next));
    },
    all: () => Object.fromEntries(palettes),
  };
}
```

### Issue 2: Theme Registry Couples to Archetype Enum

**Location:** `themes/index.ts`

**Problem:**

```typescript
const ARCHETYPE_THEMES: Record<Archetype, Theme> = { ... }
```

This hard-couples themes to archetypes, preventing:

- Custom themes without modifying core enum
- Multiple themes per archetype
- Theme-only customization (no archetype)

**Fix:** Separate theme registry from archetype mapping:

```typescript
// themes/registry.ts - Pure theme storage
const THEMES: Record<string, Theme> = { ... };

// themes/archetype-defaults.ts - Maps archetypes to theme names
const ARCHETYPE_THEME_DEFAULTS: Record<Archetype, string> = {
  listicle: 'bold-tech',
  versus: 'dramatic',
  // ...
};
```

### Issue 3: No Validation of Token References

**Location:** `themes/index.ts`

**Problem:**

```typescript
listicle: {
  palette: 'futurePop',  // String reference, not validated!
  typography: 'captionImpact',
  // ...
}
```

If someone typos `'futurPop'`, it fails at runtime, not compile time.

**Fix:** Use branded types or Zod validation:

```typescript
// Option A: Branded types
type PaletteName = keyof typeof PALETTES;

// Option B: Zod schema validation at module load
const ThemeSchema = z.object({
  palette: z.enum(Object.keys(PALETTES) as [string, ...string[]]),
  // ...
});
```

---

## 🟠 Significant Issues

### Issue 4: Missing Dependency Injection

**Location:** `styles/resolver.ts`

**Problem:**

```typescript
export function resolveStyle(archetype: Archetype, overrides: StyleOverrides = {}): ResolvedStyle {
  const theme = getTheme(archetype); // Direct import dependency
  const basePalette = PALETTES[theme.palette]; // Direct import
  // ...
}
```

Hard to test, hard to mock, hard to swap implementations.

**Fix:** Inject dependencies:

```typescript
export interface StyleResolverDeps {
  getTheme: (archetype: Archetype) => Theme;
  palettes: Record<string, ColorPalette>;
  typography: Record<string, TypographyPreset>;
  // ...
}

export function createStyleResolver(deps: StyleResolverDeps) {
  return function resolveStyle(
    archetype: Archetype,
    overrides: StyleOverrides = {}
  ): ResolvedStyle {
    const theme = deps.getTheme(archetype);
    const basePalette = deps.palettes[theme.palette];
    // ...
  };
}

// Default export for convenience
export const resolveStyle = createStyleResolver({
  getTheme,
  palettes: PALETTES,
  typography: TYPOGRAPHY_PRESETS,
  // ...
});
```

### Issue 5: Token Files Do Too Much

**Location:** `tokens/typography.ts`

**Problem:** Mixes primitive tokens with preset compositions:

```typescript
// Primitives
export const FONT_STACKS = { ... };
export const FONT_SIZES = { ... };

// Compositions (should be separate!)
export const TYPOGRAPHY_PRESETS = {
  hookBold: {
    fontFamily: FONT_STACKS.impact,
    // ...
  },
};
```

**Fix:** Separate layers:

```
tokens/
├── primitives/
│   ├── fonts.ts       # Just FONT_STACKS
│   ├── sizes.ts       # Just FONT_SIZES
│   └── colors.ts      # Just raw colors
└── presets/
    ├── typography.ts  # Composed typography presets
    ├── animation.ts   # Composed animation presets
    └── caption.ts     # Caption style presets
```

### Issue 6: Animation Type Mismatch with Existing Schema

**Location:** `tokens/animation.ts` vs existing `schema.ts`

**Problem:**

```typescript
// New (animation.ts)
export type AnimationType = 'none' | 'pop' | 'bounce' | 'typewriter' | 'karaoke' | 'fade' | 'slideUp' | 'slideDown';

// Existing (schema.ts)
animation: z.enum(['none', 'pop', 'bounce', 'karaoke', 'typewriter']).default('pop'),
```

These must stay in sync or validation fails.

**Fix:** Single source of truth:

```typescript
// tokens/animation.ts
export const ANIMATION_TYPES = ['none', 'pop', 'bounce', 'typewriter', 'karaoke', 'fade', 'slideUp', 'slideDown'] as const;
export type AnimationType = typeof ANIMATION_TYPES[number];

// schema.ts
import { ANIMATION_TYPES } from './tokens/animation';
animation: z.enum(ANIMATION_TYPES).default('pop'),
```

---

## 🟡 Minor Issues

### Issue 7: Inconsistent Naming

**Problem:**

- `palette.ts` vs `palettes.ts` (singular vs plural)
- `safe-zones.ts` (kebab-case) vs `safeZones` (camelCase in code)
- `EASING_CURVES` vs `SPRING_CONFIGS` (one is noun, other implies configs)

**Fix:** Consistent convention:

- Files: `palette.ts`, `typography.ts`, `safe-zone.ts` (singular)
- Exports: `PALETTE_*`, `TYPOGRAPHY_*`, `SAFE_ZONE_*` (prefix matching file)

### Issue 8: Magic Numbers in Safe Zones

**Location:** `tokens/safe-zones.ts`

**Problem:**

```typescript
tiktok: { top: 150, bottom: 270, left: 40, right: 40 },
```

No source citation. Where do these numbers come from?

**Fix:** Add source comments:

```typescript
/**
 * TikTok safe zone (2025)
 * Source: Research doc SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §4
 * Validated against: TikTok iOS app v32.1
 */
tiktok: { top: 150, bottom: 270, left: 40, right: 40 },
```

### Issue 9: No Default Export Strategy

**Problem:** Some files use `export const`, others use `export default`. No pattern.

**Fix:** Convention: Named exports only. Re-export via index.ts:

```typescript
// tokens/index.ts
export * from './easing';
export * from './typography';
// ...
```

---

## 🟢 Suggestions (Nice to Have)

### Suggestion 1: Add JSDoc Examples

Every token should have usage example:

````typescript
/**
 * Snap-settle easing - fast in, smooth out
 * @example
 * ```tsx
 * <div style={{ transition: `transform 300ms ${EASING_CURVES.snapSettle}` }} />
 * ```
 */
export const snapSettle = 'cubic-bezier(0.16, 1, 0.3, 1)';
````

### Suggestion 2: Add Token Visualization Tool

Create a simple Remotion composition that renders all tokens for visual QA:

```typescript
// src/render/remotion/TokenShowcase.tsx
export const TokenShowcase = () => (
  <>
    {Object.entries(PALETTES).map(([name, palette]) => (
      <PaletteCard key={name} name={name} palette={palette} />
    ))}
  </>
);
```

### Suggestion 3: Freeze Objects

Prevent accidental mutation:

```typescript
export const PALETTES = Object.freeze({
  earthyComfort: Object.freeze({ ... }),
  futurePop: Object.freeze({ ... }),
});
```

---

## Research Fact-Check

| Claim in Plan                                  | Research Source                   | Verified?            |
| ---------------------------------------------- | --------------------------------- | -------------------- |
| `snapSettle: cubic-bezier(0.16, 1, 0.3, 1)`    | Templates §1 easeOutExpo          | ✅ Matches           |
| `punchyPop: cubic-bezier(0.34, 1.56, 0.64, 1)` | Templates §1 easeOutBack          | ✅ Matches           |
| Bebas Neue for hooks                           | Templates §2                      | ✅ Matches           |
| Montserrat for body                            | Templates §2                      | ✅ Matches           |
| TikTok bottom: 270px                           | Templates §4 (says "bottom: 270") | ✅ Matches           |
| Reels right: 120px (asymmetric)                | Templates §4                      | ✅ Matches           |
| Earthy Comfort palette                         | Templates §3 (Pantone 2025)       | ✅ Matches           |
| Future Pop palette                             | Templates §3 (WGSN Future Dusk)   | ✅ Matches           |
| Word pop 70-130ms                              | Templates §1                      | ✅ 100ms is in range |

**All values verified against research.**

---

## Revised Architecture

Based on review, revised structure:

```
src/render/
├── tokens/
│   ├── index.ts              # Re-exports primitives only
│   ├── easing.ts             # EASING_CURVES, SPRING_CONFIGS
│   ├── color.ts              # Raw color values
│   ├── font.ts               # FONT_STACKS, FONT_SIZES, FONT_WEIGHTS
│   ├── spacing.ts            # Margin/padding scale
│   ├── timing.ts             # Duration values in ms
│   └── safe-zone.ts          # Platform-specific margins
│
├── presets/
│   ├── index.ts              # Re-exports presets
│   ├── palette.ts            # ColorPalette compositions
│   ├── typography.ts         # Typography compositions
│   ├── animation.ts          # Animation configurations
│   └── caption.ts            # Caption style presets
│
├── themes/
│   ├── index.ts              # Theme registry (factory pattern)
│   ├── types.ts              # Theme interface
│   ├── defaults.ts           # ARCHETYPE_THEME_DEFAULTS
│   └── builtin/              # Built-in theme definitions
│       ├── bold-tech.ts
│       ├── clean-minimal.ts
│       └── ...
│
├── styles/
│   ├── index.ts              # Re-exports
│   ├── resolver.ts           # Style resolution (DI pattern)
│   └── converter.ts          # Convert to component props
│
├── remotion/                  # (existing, updated)
│   ├── Caption.tsx
│   ├── ShortVideo.tsx
│   └── index.ts
│
├── schema.ts                  # (updated, single source of truth)
└── service.ts                 # (updated)
```

---

## Updated Review Checklist

- [x] Modularity: Each concern in separate module? → **Now yes**
- [x] Extensibility: Easy to add new archetypes/palettes? → **Factory pattern enables**
- [x] Type Safety: No `any`, full inference? → **Branded types + Zod**
- [x] Testability: Pure functions, injectable dependencies? → **DI pattern added**
- [x] Backward Compatible: Existing code works unchanged? → **Default exports**
- [x] Research Aligned: Values match research findings? → **All verified**
- [x] No Mutable Global State? → **Factory pattern**
- [x] Single Source of Truth for Types? → **Schema imports from tokens**

---

## Iteration 2 Required Changes

1. **Add factory pattern** for registries (no mutation)
2. **Separate primitives from presets**
3. **Add DI to resolver**
4. **Single source of truth** for animation types
5. **Add source citations** for magic numbers
6. **Freeze all exports**

---

## Ready for Implementation?

**Not yet.** Need one more iteration to:

1. Finalize file structure with primitive/preset split
2. Write the actual type definitions with DI
3. Confirm integration with existing schema.ts

Shall I produce the final iteration?
