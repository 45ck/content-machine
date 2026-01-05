# Short-Form Video Templates & Trends (2025–2026)

**Research Date:** 2026-01-05  
**Status:** Active Research  
**Purpose:** Design reference for content-machine template system  
**Sources:** ChatGPT Deep Research, PDF analysis, industry documentation

---

## Executive Summary

This document consolidates research on modern short-form video editing trends, templates, and techniques. The goal is to inform content-machine's Remotion template system with production-proven patterns for captions, motion graphics, color, typography, and retention engineering.

**Key Finding:** Late-2025 short-form editing is defined by **maximum engagement** — bold captions, constant motion, quick cuts, and deliberate hooks. Success comes from template-driven workflows with reusable, optimized components.

---

## Table of Contents

1. [Motion/Easing Standards](#1-motioneasing-standards)
2. [Typography & Font Stack](#2-typography--font-stack)
3. [Color Palettes](#3-color-palettes)
4. [Safe Zones by Platform](#4-safe-zones-by-platform)
5. [Caption Animation Patterns](#5-caption-animation-patterns)
6. [Transition Libraries](#6-transition-libraries)
7. [Audio Engineering](#7-audio-engineering)
8. [Retention Engineering](#8-retention-engineering)
9. [SEO/Discoverability Layer](#9-seodiscoverability-layer)
10. [Template Sources for Analysis](#10-template-sources-for-analysis)
11. [Implementation Recommendations](#11-implementation-recommendations)

---

## 1. Motion/Easing Standards

### Core Motion Feel: "Snap → Settle"

Modern short-form motion uses **fast acceleration + clean settle** for entrances, with **tiny overshoot** for emphasis pops.

### Easing Presets (CSS cubic-bezier)

```typescript
// src/render/constants/easing.ts
export const EASING = {
  // Main entrance - fast in, smooth settle
  easeOutExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',

  // Secondary motion
  easeOutCubic: 'cubic-bezier(0.33, 1, 0.68, 1)',

  // Slightly faster settle
  easeOutQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',

  // Punchy pop with overshoot (word emphasis)
  easeOutBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;
```

**Why easeOutBack works:** Y values outside [0,1] create overshoot then return, reading as punchy/expressive on captions.

### Timing Defaults (30fps baseline)

| Animation Type                    | Frames | Duration (ms) | Easing       |
| --------------------------------- | ------ | ------------- | ------------ |
| Word pop (scale/opacity)          | 2–4    | 70–130        | easeOutBack  |
| Title/lower-third entrance        | 6–10   | 200–350       | easeOutExpo  |
| Micro UI accent (underline, pill) | 4–6    | 120–200       | easeOutBack  |
| Settle after pop                  | 6–10   | 200–333       | easeOutCubic |

### Lottie JSON Structure

Lottie easing is stored as **Bezier "in/out" handles per keyframe** (`i` and `o` properties). This is the exact format for extracting "timing curve DNA" from professional templates.

```json
{
  "i": { "x": [0.16], "y": [1] },
  "o": { "x": [0.3], "y": [1] }
}
```

---

## 2. Typography & Font Stack

### Caption Font Hierarchy

| Role                 | Primary Fonts     | Fallback         | Notes                  |
| -------------------- | ----------------- | ---------------- | ---------------------- |
| **Hook words**       | Bebas Neue, Anton | Impact           | Condensed, high-impact |
| **Body captions**    | Montserrat, Inter | Roboto           | Clean geometric        |
| **Accent/signature** | Rosalía.vt style  | Handwriting font | 1-2 words max          |
| **Editorial**        | Lora (serif)      | Georgia          | Style moments only     |

### Platform-Specific Typography

- **TikTok native:** Helvetica, Bebas Neue, Montserrat frequently cited
- **Instagram Reels (2025):** Rosalía.vt handwriting-style font introduced
- **Meta Edits app:** New text options + creator-collab fonts

### High-Signal Pairings

1. **Condensed + Neutral:** Bebas Neue/Anton (hooks) + Montserrat/Roboto (body)
2. **Clean + Accent:** Inter/Montserrat (body) + handwriting sparingly
3. **Editorial:** Lora serif for style + modern sans for UI labels

### Readability Constraints

- Keep captions **short (1–2 lines)**
- Max ~42 characters per line (Shorts best practice)
- Always add stroke OR pill background (never naked text)
- All-caps white text with black outline = "CapCut style"

---

## 3. Color Palettes

### 2025-2026 Dominant Directions

#### A) "Earthy Comfort" (Warm, Grounded)

| Role             | Hex          | Description                     |
| ---------------- | ------------ | ------------------------------- |
| Background grade | Warm neutral | Slightly desaturated warm tones |
| Caption pill     | `#F5E6D3`    | Cream/coffee                    |
| Primary accent   | `#C17F59`    | Terracotta                      |
| Secondary accent | `#8B9A7D`    | Sage green                      |
| Text             | `#2D2A26`    | Warm dark brown                 |

Aligned with Pantone 2025 "Mocha Mousse" trend.

#### B) "Future Pop" (Tech/Metallic)

| Role             | Hex       | Description            |
| ---------------- | --------- | ---------------------- |
| Background grade | `#1A1A2E` | Deep moody blue-purple |
| Caption base     | `#FFFFFF` | High-contrast white    |
| Primary accent   | `#00D4FF` | Electric blue          |
| Secondary accent | `#FF006E` | Hot pink               |
| Tertiary accent  | `#39FF14` | Neon lime              |

Influenced by WGSN/Coloro "Future Dusk" direction.

### Application Pattern

- **Dark/neutral video grade** + **high-saturation caption accent**
- OR: **Warm neutral grade** + **cream caption blocks** + **one strong accent**

---

## 4. Safe Zones by Platform

### Instagram Reels (1080×1920)

```typescript
export const REELS_SAFE_ZONE = {
  top: 108, // px from top
  bottom: 320, // px from bottom
  left: 60, // px from left
  right: 120, // px from right (asymmetric for UI)
};
```

### YouTube Shorts

```typescript
export const SHORTS_SAFE_ZONE = {
  top: 100,
  bottom: 200,
  left: 50,
  right: 50,
  // Keep in central 4:5-ish area
};
```

### TikTok

```typescript
export const TIKTOK_SAFE_ZONE = {
  top: 150,
  bottom: 270,
  left: 40,
  right: 40,
  // Effective content area: ~1080×1500 within 1080×1920
};
```

### Grid Crop Consideration (Reels)

Reels often needs a **3:4 grid crop** separate from 9:16 playback. Design text so it survives both views:

- Titles move slightly upward/center
- Text becomes more "poster-like"

---

## 5. Caption Animation Patterns

### The "CapCut Standard" (2025 Default)

1. **High contrast** — stroke, shadow, or solid background pill
2. **Word-by-word emphasis** — highlight color, scale pop, or background wipe
3. **Animated presets** — font + background treatment + highlight effects as a unit

### Word-by-Word Highlight Animation

```typescript
// Per-word animation sequence
const wordAnimation = {
  // Entry
  opacity: { from: 0, to: 1, duration: 70, easing: 'easeOutExpo' },
  scale: { from: 1.2, to: 1.0, duration: 100, easing: 'easeOutBack' },

  // Highlight moment (when word is spoken)
  highlight: {
    backgroundColor: { from: 'transparent', to: '#FFFF00' },
    scale: { from: 1.0, to: 1.05, to: 1.0 }, // Quick pop
    duration: 130,
  },
};
```

### Caption Style as Brand System

Modern approach: caption style = consistent identity choice

- Preset combos: font + background treatment + highlight effects
- Per-word styling becoming common
- Saved as reusable "caption looks"

### Specific Techniques

| Technique           | Description                           | Use Case      |
| ------------------- | ------------------------------------- | ------------- |
| **Color swap**      | One word changes color on emphasis    | Key terms     |
| **Scale pop**       | 2-4 frame scale up then settle        | Punchlines    |
| **Background wipe** | Pill background animates word-by-word | Full captions |
| **Bounce entrance** | Spring physics on word entry          | Casual/fun    |
| **Typewriter**      | Characters appear sequentially        | Tutorials     |

---

## 6. Transition Libraries

### Late-2025 Transitions (Motivated Motion)

Less "flashy pack," more **functional transitions**:

| Transition      | Description                          | Energy Level |
| --------------- | ------------------------------------ | ------------ |
| **Whip pan**    | Fast blur pan between scenes         | High         |
| **Snap zoom**   | Sudden scale emphasis                | Medium-High  |
| **Match cut**   | Cut on motion/gesture alignment      | Medium       |
| **Speed ramp**  | Fast-forward then normal             | Variable     |
| **Mask wipe**   | Foreground object passes → new scene | Medium       |
| **Glitch**      | Intentional digital artifacts        | Edgy         |
| **Flash frame** | Brief white/black frame              | Punctuation  |

### In-App Native Transitions (Reference)

TikTok/Reels built-in transitions set expectations:

- Swipes, spins, zooms
- Creators mimic these in pro editors

---

## 7. Audio Engineering

### Voice Chain (VO Processing)

The reason phone-recorded VO sounds "studio":

```
Noise Reduction (hard)
    → Compression (light, 2:1-4:1)
    → Presence EQ (boost 2-5kHz)
    → Limiter (-1dB ceiling)
```

### SFX Micro-Cues

Subtle sounds that make motion feel intentional:

- **Whooshes** on text entrances
- **Clicks/pops** on transitions
- **Swoosh** on zooms
- **Ding** on emphasis points

Often more important than the visual transition itself.

### Auto-Ducking Pattern

```
Music baseline: -18dB to -12dB
During VO: Duck to -24dB to -18dB
Between phrases: Rise back to baseline
Transition: 200-400ms fade
```

---

## 8. Retention Engineering

### 3-Second Hold Mechanics

First frame MUST be "answer-shaped":

- **Result shown** (end state visible)
- **Promise stated** (what viewer will learn)
- **Surprise visual** (unexpected element)

### Loop Design

End frame/line naturally resets into the start:

- YouTube explicitly rewards replay/loop behavior
- Last word → connects to first word
- Visual composition mirrors start

### Pattern Interrupts

Deliberate "scene grammar breaks" to stop scroll fatigue:

- Angle flip every 2-3 seconds
- Cutaway to B-roll
- Sudden text reframe
- Zoom punch-in on subject

### B-Roll Cadence

Hyper-fast B-roll style:

- Cut every **1-3 seconds** to avoid monotony
- Stock videos, screenshots, zoomed punch-ins
- Ken Burns effect on static images
- Quick pop-up graphics (icons, text labels)

---

## 9. SEO/Discoverability Layer

### Triple-Hit Keyword Strategy

Late-2025: TikTok/Reels/Shorts are **search platforms**.

Place core keyword in ALL THREE:

1. **Spoken audio** (in VO script)
2. **On-screen text** (visible caption/title)
3. **Caption/description** (post metadata)

### TikTok Keyword Workflow

```
Topic research
    → TikTok Keyword Insights
    → Phrasing selection
    → Script integration
    → On-screen text placement
```

### Platform SEO Notes

- **TikTok:** Keyword Insights tool increasingly used
- **Instagram:** Keywords in captions/profile (less hashtag-focused)
- **YouTube:** Title, description, spoken words all indexed

---

## 10. Template Sources for Analysis

### Priority Downloads (Remotion-Native)

| Source                   | URL                                       | What to Extract                                |
| ------------------------ | ----------------------------------------- | ---------------------------------------------- |
| Remotion TikTok Template | `github.com/remotion-dev/template-tiktok` | Word-by-word captions, Whisper.cpp integration |
| karaoke-remotion         | `github.com/binhkid2/karaoke-remotion`    | Word-timed highlighting                        |
| remotion-lyrics          | `github.com/rayanfer32/remotion-lyrics`   | Subtitle parsing → render pipeline             |
| TikTok-Forge             | `github.com/ezedinff/TikTok-Forge`        | AI + Remotion pipeline                         |

### Free MOGRTs/AE Templates

| Source            | URL                                                | What to Extract                     |
| ----------------- | -------------------------------------------------- | ----------------------------------- |
| Mixkit Vertical   | `mixkit.co/free-after-effects-templates/vertical/` | Text timing, effects                |
| Sonduck Duck Pack | `sonduckfilm.com/tutorials/duck-pack/`             | 100+ free templates, comp structure |
| Motion Array      | `motionarray.com`                                  | MOGRT structure, lower-thirds       |

### Lottie Animations

| Category          | Use Case                          |
| ----------------- | --------------------------------- |
| Text reveals      | Entrance timing curves            |
| Subscribe buttons | Scale + rotation + opacity combos |
| Emoji reactions   | Burst effects, attention getters  |
| Progress bars     | Duration-based easing             |

### DaVinci Resolve

| Source            | What to Get              |
| ----------------- | ------------------------ |
| Mixkit Resolve    | Free macros, transitions |
| Reddit DRFX packs | 50+ community presets    |

### Design Reference

| Platform               | What to Study                         |
| ---------------------- | ------------------------------------- |
| Canva TikTok templates | Typography choices, layout grids      |
| Figma Community        | Layer structure, animation prototypes |
| CapCut trending        | One-tap template patterns             |

---

## 11. Implementation Recommendations

### Phase 1: Core Constants

Create `src/render/constants/` with:

```typescript
// easing.ts - Motion presets
// typography.ts - Font stacks
// colors.ts - Palette presets
// safe-zones.ts - Platform margins
// timing.ts - Animation durations
```

### Phase 2: Caption Component Enhancement

Enhance existing caption system with:

- Word-by-word animation (scale pop + color highlight)
- Background pill that follows word timing
- Stroke + shadow for contrast
- Multiple "caption looks" as presets

### Phase 3: Audio Layer

Add to audio pipeline:

- SFX micro-cue triggers (whoosh on text entrance)
- Auto-ducking music under VO
- Audio normalization chain

### Phase 4: Retention Primitives

Add to script/render pipeline:

- Hook template (first 3 seconds)
- Loop design validation
- Pattern interrupt markers
- B-roll cut timing suggestions

### Phase 5: Template Presets

Create archetype-specific template packs:

| Archetype  | Caption Style         | Color Palette  | Motion Feel     |
| ---------- | --------------------- | -------------- | --------------- |
| `listicle` | Bold numbered         | Future Pop     | Snap + bounce   |
| `versus`   | Split comparison      | High contrast  | Side swipe      |
| `howto`    | Clean minimal         | Earthy Comfort | Smooth settle   |
| `myth`     | Strike-through reveal | Dramatic dark  | Glitch accent   |
| `story`    | Narrative flow        | Warm tones     | Gentle motion   |
| `hot-take` | Impact bold           | Neon accents   | Aggressive snap |

---

## Source References

### Primary Research

- ChatGPT Deep Research (January 2026)
- "Short-Form Video Templates & Trends (2025–2026)" PDF

### Template Sources

- Envato Elements: `elements.envato.com`
- Motion Array: `motionarray.com`
- Mixkit: `mixkit.co`
- LottieFiles: `lottiefiles.com`
- Remotion: `remotion.dev`

### Trend Documentation

- Adobe Design Trends 2025-2026
- Pantone Color of the Year 2025 (Mocha Mousse)
- WGSN/Coloro Future Dusk
- CapCut Caption Style Guide
- Opus.pro TikTok Best Practices

### Platform Documentation

- Google Ads video specs (safe zones)
- Meta Business Help (text overlays)
- TikTok Creator Portal
- YouTube Shorts creation tools announcement

---

## Appendix: Quick Reference

### Easing Cheat Sheet

```css
/* Main entrances */
--ease-snap: cubic-bezier(0.16, 1, 0.3, 1);

/* Word pops */
--ease-pop: cubic-bezier(0.34, 1.56, 0.64, 1);

/* Smooth secondary */
--ease-smooth: cubic-bezier(0.33, 1, 0.68, 1);
```

### Font Quick Pick

```css
/* Headlines */
font-family: 'Bebas Neue', 'Anton', Impact, sans-serif;

/* Body */
font-family: 'Montserrat', 'Inter', 'Roboto', sans-serif;
```

### Safe Zone Quick Pick

```typescript
const UNIVERSAL_SAFE = {
  top: 120,
  bottom: 280,
  left: 60,
  right: 60,
}; // Works reasonably on all platforms
```

---

**Last Updated:** 2026-01-05  
**Next Review:** After template implementation begins
