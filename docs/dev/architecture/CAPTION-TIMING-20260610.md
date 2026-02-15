# Caption Timing & Highlighting System

**Date:** 2026-06-10  
**Version:** 1.0.0  
**Status:** Design Complete  
**Related:** RQ-28, SYNC-ARCHITECTURE

---

## 1. Problem Statement

The current caption highlighting system in `Caption.tsx` is broken due to Remotion's Sequence frame reset behavior:

```tsx
// Current (BROKEN):
const currentTimeMs = (frame / fps) * 1000; // frame is Sequence-relative
const isActive = currentTimeMs >= word.startMs; // word.startMs is absolute
// This comparison is incorrect!
```

This document defines the correct architecture for caption timing.

---

## 2. Remotion Frame Behavior

### 2.1 Understanding Sequence Frame Reset

```
Video Timeline:
0s ──────────────────────────────────────────────────────> 25s
Frame:  0    150    300    450    600    750

Page 1 Sequence (from=0, duration=60):
  Inside frame: 0 ──▶ 59
  Absolute:     0 ──▶ 59

Page 2 Sequence (from=60, duration=60):
  Inside frame: 0 ──▶ 59  ◀── RESETS TO 0!
  Absolute:     60 ──▶ 119

Page 3 Sequence (from=120, duration=60):
  Inside frame: 0 ──▶ 59  ◀── RESETS TO 0!
  Absolute:     120 ──▶ 179
```

### 2.2 The Fix: Convert Word Times to Page-Relative

```
Word: "productivity" at 1.0s - 1.3s (absolute)
Page 1: 0.0s - 2.0s

Inside Page 1 Sequence:
  - currentTimeMs = (frame / fps) * 1000  // e.g., 30 frames = 1000ms
  - word.startMs (absolute) = 1000ms
  - word.endMs (absolute) = 1300ms

  WRONG: currentTimeMs >= 1000 && currentTimeMs < 1300
         1000ms >= 1000ms ✓ (works for Page 1 only)

Inside Page 2 Sequence (from=60):
  - currentTimeMs = (frame / fps) * 1000  // e.g., 30 frames = 1000ms
  - But this is Page 2, so actual time is 3000ms!
  - word.startMs = 3200ms (Page 2 word)

  WRONG: 1000ms >= 3200ms = FALSE (never highlights!)

  CORRECT (page-relative):
    wordStartRelative = 3200 - 2000 (page.startMs) = 1200ms
    wordEndRelative = 3400 - 2000 = 1400ms
    1000ms >= 1200ms = FALSE (not yet)
    At frame 36: currentTimeMs = 1200ms
    1200ms >= 1200ms && < 1400ms = TRUE ✓
```

---

## 3. Implementation

### 3.1 Types

```typescript
// src/render/captions/types.ts

/**
 * Word with timing in milliseconds (absolute from video start)
 */
export interface TimedWord {
  text: string;
  startMs: number; // Absolute time from video start
  endMs: number; // Absolute time from video start
}

/**
 * A page of words to display together
 */
export interface CaptionPage {
  index: number;
  startMs: number; // Page start (absolute)
  endMs: number; // Page end (absolute)
  lines: CaptionLine[];
}

/**
 * A line of words
 */
export interface CaptionLine {
  words: TimedWord[];
}
```

### 3.2 Helper Function

```typescript
// src/render/captions/timing.ts

/**
 * Check if a word should be highlighted based on current time
 *
 * @param word - The word with absolute timing
 * @param pageStartMs - When this page starts (absolute)
 * @param sequenceTimeMs - Current time within the Sequence (relative to Sequence start)
 * @returns true if word should be highlighted
 */
export function isWordActive(
  word: TimedWord,
  pageStartMs: number,
  sequenceTimeMs: number
): boolean {
  // Convert absolute word times to page-relative
  const wordStartRelative = word.startMs - pageStartMs;
  const wordEndRelative = word.endMs - pageStartMs;

  // Compare with Sequence-relative current time
  return sequenceTimeMs >= wordStartRelative && sequenceTimeMs < wordEndRelative;
}
```

### 3.3 Updated CaptionPageView

```tsx
// src/render/captions/Caption.tsx

const CaptionPageView: React.FC<CaptionPageViewProps> = ({ page, config }) => {
  const frame = useCurrentFrame(); // Sequence-relative (0 at page start)
  const { fps, height } = useVideoConfig();

  // Current time in ms, relative to this Sequence (page)
  const sequenceTimeMs = (frame / fps) * 1000;

  const enterProgress = useEnterAnimation(frame, fps, config);
  const positionStyle = usePositionStyle(config, height, enterProgress);

  return (
    <div style={positionStyle}>
      <div style={getContainerStyle(config, enterProgress)}>
        {page.lines.map((line, lineIndex) => (
          <div key={lineIndex} style={getLineStyle(config)}>
            {line.words.map((word, wordIndex) => (
              <WordView
                key={`${word.startMs}-${wordIndex}`}
                word={word}
                config={config}
                isActive={isWordActive(word, page.startMs, sequenceTimeMs)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 4. Highlight Configuration

### 4.1 Config Schema Update

```typescript
// Add to src/render/captions/config.ts

const HighlightConfigSchema = z.object({
  /** Whether word highlighting is enabled */
  highlightEnabled: z.boolean().default(true),

  /** How to highlight the active word */
  highlightMode: z
    .enum([
      'color', // Change text color
      'background', // TikTok-style pill
      'underline', // Underline
      'scale', // Scale up
      'glow', // Glow effect
      'none', // No visual change
    ])
    .default('background'),

  /** Color for highlighting */
  highlightColor: z.string().default('#39E508'),

  /** Transition duration in ms */
  wordTransitionMs: z.number().min(0).max(500).default(50),

  /** Opacity for non-highlighted words */
  inactiveOpacity: z.number().min(0).max(1).default(0.6),
});
```

### 4.2 Highlight Disabled Mode

```tsx
// When highlightEnabled is false, treat all words as "active"
const effectiveIsActive = config.highlightEnabled ? isActive : true;
```

### 4.3 Preset Updates

```typescript
// src/render/captions/presets.ts

export const PRESET_TIKTOK: CaptionConfig = {
  // ... existing config ...
  highlightEnabled: true,
  highlightMode: 'background',
  highlightColor: '#FF0050',
  inactiveOpacity: 0.6,
};

export const PRESET_STATIC: CaptionConfig = {
  // ... existing config ...
  highlightEnabled: false, // No highlighting
  highlightMode: 'none',
  inactiveOpacity: 1.0, // All words fully visible
};

export const PRESET_YOUTUBE: CaptionConfig = {
  // ... existing config ...
  highlightEnabled: true,
  highlightMode: 'color', // Yellow highlight
  highlightColor: '#FFFF00',
  inactiveOpacity: 0.8,
};
```

---

## 5. Test Cases

### 5.1 Unit Tests: isWordActive()

```typescript
// tests/unit/render/captions/timing.test.ts

import { describe, it, expect } from 'vitest';
import { isWordActive } from '@/render/captions/timing';

describe('isWordActive', () => {
  it('returns true when current time is within word bounds', () => {
    const word = { text: 'test', startMs: 1000, endMs: 1500 };
    const pageStartMs = 500;
    const sequenceTimeMs = 700; // 700ms into sequence = 1200ms absolute

    expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(true);
  });

  it('returns false when current time is before word start', () => {
    const word = { text: 'test', startMs: 1000, endMs: 1500 };
    const pageStartMs = 500;
    const sequenceTimeMs = 400; // 900ms absolute, before word at 1000ms

    expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(false);
  });

  it('returns false when current time is after word end', () => {
    const word = { text: 'test', startMs: 1000, endMs: 1500 };
    const pageStartMs = 500;
    const sequenceTimeMs = 1100; // 1600ms absolute, after word ends at 1500ms

    expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(false);
  });

  it('handles word at exact start time (inclusive)', () => {
    const word = { text: 'test', startMs: 1000, endMs: 1500 };
    const pageStartMs = 500;
    const sequenceTimeMs = 500; // Exactly at word start

    expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(true);
  });

  it('handles word at exact end time (exclusive)', () => {
    const word = { text: 'test', startMs: 1000, endMs: 1500 };
    const pageStartMs = 500;
    const sequenceTimeMs = 1000; // Exactly at word end

    expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(false);
  });

  it('works with page starting at 0', () => {
    const word = { text: 'first', startMs: 0, endMs: 250 };
    const pageStartMs = 0;
    const sequenceTimeMs = 100;

    expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(true);
  });

  it('works with multiple words on same page', () => {
    const words = [
      { text: 'word1', startMs: 0, endMs: 500 },
      { text: 'word2', startMs: 500, endMs: 1000 },
      { text: 'word3', startMs: 1000, endMs: 1500 },
    ];
    const pageStartMs = 0;
    const sequenceTimeMs = 700; // Should highlight word2

    expect(isWordActive(words[0], pageStartMs, sequenceTimeMs)).toBe(false);
    expect(isWordActive(words[1], pageStartMs, sequenceTimeMs)).toBe(true);
    expect(isWordActive(words[2], pageStartMs, sequenceTimeMs)).toBe(false);
  });
});
```

### 5.2 Integration Tests: Caption Rendering

```typescript
// tests/integration/render/caption-highlighting.test.ts

import { describe, it, expect } from 'vitest';
import { renderFrames } from '@remotion/renderer';

describe('Caption Highlighting Integration', () => {
  it('highlights correct word at each frame', async () => {
    const words = [
      { word: 'Hello', start: 0, end: 0.5 },
      { word: 'World', start: 0.5, end: 1.0 },
    ];

    // Render frame at 0.25s
    const frame1 = await renderFrame(7, words); // 7/30fps = 0.23s
    expect(frame1).toHaveHighlightedWord('Hello');

    // Render frame at 0.75s
    const frame2 = await renderFrame(22, words); // 22/30fps = 0.73s
    expect(frame2).toHaveHighlightedWord('World');
  });
});
```

---

## 6. Migration Guide

### 6.1 Code Changes Required

1. **Create `timing.ts`** with `isWordActive()` helper
2. **Update `Caption.tsx`** to use the helper
3. **Update `config.ts`** with highlight config options
4. **Update presets** with highlight settings
5. **Add tests** for timing logic

### 6.2 Breaking Changes

None - the fix is internal. The Caption component props remain unchanged.

---

## 7. Verification Checklist

- [ ] isWordActive() tests pass
- [ ] Caption renders correctly in Remotion preview
- [ ] Words highlight at correct times (visual check)
- [ ] Multiple pages work correctly
- [ ] highlightEnabled=false works
- [ ] All highlight modes work (color, background, etc.)

---

## 8. References

- [Remotion useCurrentFrame docs](https://www.remotion.dev/docs/use-current-frame)
- [Remotion Sequence docs](https://www.remotion.dev/docs/sequence)
- [remotion-dev/template-tiktok Page.tsx](https://github.com/remotion-dev/template-tiktok/blob/main/src/CaptionedVideo/Page.tsx)
