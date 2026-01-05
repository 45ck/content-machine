# Research → Action Plan

**Date:** 2026-01-05  
**Purpose:** What to do with the video templates & virality research  
**Status:** Prioritized implementation roadmap

---

## Executive Summary

We have solid foundational code but **significant gaps** compared to late-2025 best practices. The research reveals we're missing:

1. **Motion/easing system** — We use hardcoded values, not the research-backed presets
2. **Caption style presets** — No archetype-specific visual styles
3. **Platform safe zones** — No awareness of Reels/Shorts/TikTok UI overlays
4. **Audio engineering** — No SFX, no auto-ducking, no VO processing chain
5. **Retention hooks** — No 3-second hold mechanics, no loop design
6. **Virality scoring** — No pre-publish quality gate

---

## Gap Analysis: What We Have vs. What Research Says

### ✅ What We Already Have (Good)

| Feature                                     | Location                          | Status               |
| ------------------------------------------- | --------------------------------- | -------------------- |
| Word-by-word captions                       | `src/render/remotion/Caption.tsx` | Working              |
| Basic pop/bounce animations                 | Caption component                 | Working              |
| Caption positioning (top/center/bottom)     | CaptionStyleSchema                | Working              |
| Archetype-based scripts                     | `src/script/prompts/`             | 6 archetypes working |
| Full pipeline (script→audio→visuals→render) | CLI commands                      | Working              |
| Zod schemas everywhere                      | All modules                       | Solid                |
| Remotion TikTok template                    | `templates/template-tiktok-base/` | Reference            |

### ❌ What's Missing (Critical Gaps)

| Gap                             | Research Source       | Impact                                                 |
| ------------------------------- | --------------------- | ------------------------------------------------------ |
| **Easing constants**            | Templates research §1 | Motion feels amateur                                   |
| **Font stack presets**          | Templates research §2 | Typography looks generic                               |
| **Color palettes**              | Templates research §3 | No archetype visual identity                           |
| **Platform safe zones**         | Templates research §4 | Text gets hidden by UI                                 |
| **Advanced caption animations** | Templates research §5 | Missing: typewriter, karaoke working, background pills |
| **SFX micro-cues**              | Templates research §7 | Transitions feel flat                                  |
| **Auto-ducking**                | Templates research §7 | Music competes with VO                                 |
| **3-second hook enforcement**   | Templates research §8 | Low retention                                          |
| **Loop design**                 | Templates research §8 | No replay behavior                                     |
| **SEO keyword slots**           | Templates research §9 | Poor discoverability                                   |
| **Virality scoring**            | Virality research     | No quality gate before publish                         |

---

## Priority Matrix: What SHOULD We Do?

### 🔴 P0 - Must Have (Do First)

These directly impact video quality and are easy to implement:

#### 1. Easing Constants Module

**Effort:** 1 hour | **Impact:** High

```typescript
// NEW FILE: src/render/constants/easing.ts
export const EASING = {
  snapSettle: 'cubic-bezier(0.16, 1, 0.3, 1)', // easeOutExpo
  punchyPop: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // easeOutBack
  smooth: 'cubic-bezier(0.33, 1, 0.68, 1)', // easeOutCubic
} as const;

export const TIMING = {
  wordPop: { frames: 3, ms: 100 },
  titleEntrance: { frames: 10, ms: 333 },
  microAccent: { frames: 5, ms: 166 },
} as const;
```

**Action:** Update Caption.tsx to use these instead of hardcoded interpolate values.

#### 2. Platform Safe Zones

**Effort:** 1 hour | **Impact:** High (prevents text from being hidden)

```typescript
// NEW FILE: src/render/constants/safe-zones.ts
export const SAFE_ZONES = {
  tiktok: { top: 150, bottom: 270, left: 40, right: 40 },
  reels: { top: 108, bottom: 320, left: 60, right: 120 },
  shorts: { top: 100, bottom: 200, left: 50, right: 50 },
  universal: { top: 120, bottom: 280, left: 60, right: 60 },
} as const;

export type Platform = keyof typeof SAFE_ZONES;
```

**Action:** Add `platform` option to render, apply safe zones to caption positioning.

#### 3. Font Stack Presets

**Effort:** 1 hour | **Impact:** Medium (better typography)

```typescript
// NEW FILE: src/render/constants/typography.ts
export const FONTS = {
  hook: "'Bebas Neue', 'Anton', Impact, sans-serif",
  body: "'Montserrat', 'Inter', 'Roboto', sans-serif",
  accent: "'Permanent Marker', cursive",
} as const;

export const CAPTION_PRESETS = {
  bold: { fontFamily: FONTS.body, fontSize: 48, fontWeight: '900' },
  clean: { fontFamily: FONTS.body, fontSize: 42, fontWeight: 'bold' },
  impact: { fontFamily: FONTS.hook, fontSize: 56, fontWeight: 'normal' },
} as const;
```

### 🟠 P1 - Should Have (Do Soon)

These improve quality significantly but require more work:

#### 4. Archetype Visual Presets

**Effort:** 3 hours | **Impact:** High

Map each archetype to a complete visual style:

```typescript
// NEW FILE: src/render/presets/archetypes.ts
export const ARCHETYPE_PRESETS = {
  listicle: {
    palette: 'futurePop',
    captionStyle: 'bold',
    animation: 'pop',
    highlightColor: '#FFE135',
  },
  versus: {
    palette: 'contrast',
    captionStyle: 'impact',
    animation: 'bounce',
    highlightColor: '#FF4444',
  },
  howto: {
    palette: 'earthyComfort',
    captionStyle: 'clean',
    animation: 'typewriter',
    highlightColor: '#4CAF50',
  },
  // ... etc
} as const;
```

#### 5. Color Palette System

**Effort:** 2 hours | **Impact:** Medium

```typescript
// NEW FILE: src/render/constants/palettes.ts
export const PALETTES = {
  earthyComfort: {
    background: '#F5E6D3',
    text: '#2D2A26',
    accent: '#C17F59',
    highlight: '#8B9A7D',
  },
  futurePop: {
    background: '#1A1A2E',
    text: '#FFFFFF',
    accent: '#00D4FF',
    highlight: '#FF006E',
  },
  // ...
} as const;
```

#### 6. Improved Caption Animations

**Effort:** 4 hours | **Impact:** High

Current Caption.tsx has basic pop/bounce. Add:

- **Typewriter:** Characters appear sequentially
- **Karaoke:** Background pill wipes word-by-word
- **Scale cascade:** Words pop in sequence with delay

### 🟡 P2 - Nice to Have (Later)

#### 7. SFX Micro-Cues Layer

**Effort:** 6 hours | **Impact:** Medium

Add a new audio layer for:

- Text entrance whoosh
- Transition swoosh
- Emphasis ding

Requires: Audio mixing capability, SFX asset library.

#### 8. Auto-Ducking

**Effort:** 4 hours | **Impact:** Medium

Duck background music when VO is playing:

- Detect VO segments from timestamps
- Apply gain envelope to music track
- Mix in Remotion

#### 9. Virality Scoring Gate

**Effort:** 8 hours | **Impact:** High (but complex)

Integrate MVP model for pre-publish scoring:

- Python subprocess to run XCLIP + CatBoost
- Score threshold check before final export
- CLI flag: `--min-virality 70`

### 🟢 P3 - Future Enhancements

#### 10. Loop Design Validation

Check if video end connects to start for replay behavior.

#### 11. SEO Keyword Enforcement

Ensure topic keywords appear in:

- Spoken audio (script)
- On-screen text (captions)
- Metadata output (hashtags)

#### 12. 3-Second Hook Analysis

Use LLM-as-judge to score hook strength.

---

## Implementation Roadmap

### Week 1: Foundation Constants

| Day | Task                                  | Files                   |
| --- | ------------------------------------- | ----------------------- |
| 1   | Create easing.ts, timing constants    | `src/render/constants/` |
| 1   | Create safe-zones.ts                  | `src/render/constants/` |
| 2   | Create typography.ts with font stacks | `src/render/constants/` |
| 2   | Create palettes.ts with color presets | `src/render/constants/` |
| 3   | Update Caption.tsx to use constants   | `src/render/remotion/`  |
| 3   | Add platform option to render schema  | `src/render/schema.ts`  |
| 4   | Create archetype presets file         | `src/render/presets/`   |
| 4   | Wire archetypes to visual presets     | `src/render/service.ts` |
| 5   | Test all archetypes render correctly  | Tests                   |

### Week 2: Enhanced Animations

| Day | Task                                | Files         |
| --- | ----------------------------------- | ------------- |
| 1-2 | Implement typewriter animation      | Caption.tsx   |
| 2-3 | Implement background pill effect    | New component |
| 3-4 | Implement scale cascade animation   | Caption.tsx   |
| 5   | Add animation presets per archetype | archetypes.ts |

### Week 3: Audio Layer (Stretch)

| Day | Task                        | Files          |
| --- | --------------------------- | -------------- |
| 1-2 | SFX asset library setup     | `assets/sfx/`  |
| 2-3 | SFX trigger integration     | ShortVideo.tsx |
| 4-5 | Auto-ducking implementation | Audio mixing   |

### Week 4: Virality Integration (Stretch)

| Day | Task                   | Files              |
| --- | ---------------------- | ------------------ |
| 1-3 | MVP model setup        | Python environment |
| 3-4 | Integration bridge     | `src/virality/`    |
| 5   | CLI `cm score` command | CLI                |

---

## Specific Code Changes

### Caption.tsx Improvements

Current issues:

1. Hardcoded `interpolate` frame ranges
2. No easing function awareness
3. No background pill option
4. No typewriter animation

```typescript
// BEFORE (line 92-98)
if (style.animation === 'pop') {
  scale = interpolate(frame % 10, [0, 5, 10], [1, 1.15, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// AFTER (use spring with research-backed config)
if (style.animation === 'pop') {
  const progress = spring({
    frame: isActive ? 0 : frame,
    fps,
    config: {
      damping: 12, // Research: quick settle
      stiffness: 200, // Research: snappy
      overshootClamping: false, // Allow overshoot
    },
  });
  scale = interpolate(progress, [0, 1], [1.15, 1]);
}
```

### Schema Updates

Add to `CaptionStyleSchema`:

```typescript
export const CaptionStyleSchema = z.object({
  // ... existing

  // NEW: Background pill
  backgroundEnabled: z.boolean().default(false),
  backgroundColor: z.string().default('rgba(0,0,0,0.7)'),
  backgroundPadding: z.number().default(8),
  backgroundRadius: z.number().default(4),

  // NEW: Platform awareness
  platform: z.enum(['tiktok', 'reels', 'shorts', 'universal']).default('universal'),

  // NEW: Animation timing
  animationDuration: z.number().default(100), // ms
  animationDelay: z.number().default(0), // ms per word cascade
});
```

---

## Decision: What We SHOULD Do First

Based on **effort vs. impact**:

### Do Immediately (This Week)

1. **Constants files** (easing, safe-zones, typography, palettes) — 4 hours total
2. **Update Caption.tsx** to use constants — 2 hours
3. **Add platform safe zone support** — 2 hours

**Total: ~8 hours of work for significant quality improvement**

### Do Next Sprint

4. **Archetype visual presets** — 3 hours
5. **Background pill animation** — 3 hours
6. **Typewriter animation** — 2 hours

### Defer (But Document)

7. SFX micro-cues (needs asset library)
8. Auto-ducking (needs audio mixing work)
9. Virality scoring (needs Python bridge)

---

## Files to Create

```
src/render/
├── constants/
│   ├── index.ts          # Re-exports all constants
│   ├── easing.ts         # Motion easing presets
│   ├── timing.ts         # Animation duration defaults
│   ├── safe-zones.ts     # Platform-specific margins
│   ├── typography.ts     # Font stacks and sizes
│   └── palettes.ts       # Color palette definitions
├── presets/
│   ├── index.ts          # Re-exports all presets
│   └── archetypes.ts     # Per-archetype visual settings
└── remotion/
    ├── Caption.tsx       # UPDATE: use constants
    ├── BackgroundPill.tsx # NEW: animated pill background
    └── ShortVideo.tsx    # UPDATE: apply safe zones
```

---

## Success Metrics

After implementation, videos should:

1. ✅ Have motion that feels "professional" (using research-backed easing)
2. ✅ Keep captions visible on all platforms (safe zones)
3. ✅ Have archetype-appropriate visual styles (presets)
4. ✅ Use typography that matches 2025 trends (font stacks)
5. ✅ Have color palettes that feel current (Earthy Comfort / Future Pop)

---

## Summary

**Do this week:**

- Create constants/ folder with easing, timing, safe-zones, typography, palettes
- Update Caption.tsx to use these constants
- Add platform option to render

**Do next:**

- Create archetype visual presets
- Add background pill animation
- Add typewriter animation

**Defer but plan:**

- SFX layer
- Auto-ducking
- Virality scoring

This gives us 80% of the research value with 20% of the effort.
