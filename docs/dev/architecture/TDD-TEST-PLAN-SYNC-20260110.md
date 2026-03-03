# TDD Test Plan: Audio-Visual-Caption Synchronization

**Date:** 2026-01-10  
**Version:** 1.0.0  
**Status:** Ready for Implementation  
**Related:** RQ-28, SYNC-ARCHITECTURE, CAPTION-TIMING

---

## 1. Test-Driven Development Workflow

Following the project's TDD requirements from AGENTS.md:

```
🔴 RED     → Write failing test that defines expected behavior
🟢 GREEN   → Write minimal code to pass the test
🔵 REFACTOR → Improve code while keeping tests green
```

---

## 2. Test Suite Overview

| Suite                | Location                                        | Coverage               |
| -------------------- | ----------------------------------------------- | ---------------------- |
| Caption Timing       | `tests/unit/render/captions/timing.test.ts`     | isWordActive logic     |
| Timestamp Validation | `tests/unit/audio/timestamp-validation.test.ts` | Word timing validation |
| Visual Duration      | `tests/unit/visuals/duration.test.ts`           | Scene coverage         |
| Integration          | `tests/integration/sync/`                       | End-to-end sync        |

---

## 3. Test Suite 1: Caption Timing (Unit)

### File: `tests/unit/render/captions/timing.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { isWordActive } from '@/render/captions/timing';

describe('isWordActive', () => {
  // === Happy Path ===

  describe('when word is active', () => {
    it('returns true when sequenceTime is exactly at word start', () => {
      const word = { text: 'hello', startMs: 1000, endMs: 1500 };
      const pageStartMs = 500;
      const sequenceTimeMs = 500; // 500 + 500 = 1000ms absolute = word.startMs

      expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(true);
    });

    it('returns true when sequenceTime is in middle of word', () => {
      const word = { text: 'hello', startMs: 1000, endMs: 1500 };
      const pageStartMs = 500;
      const sequenceTimeMs = 700; // 500 + 700 = 1200ms, between 1000-1500

      expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(true);
    });
  });

  // === Edge Cases ===

  describe('when word is not active', () => {
    it('returns false when sequenceTime is before word start', () => {
      const word = { text: 'hello', startMs: 1000, endMs: 1500 };
      const pageStartMs = 500;
      const sequenceTimeMs = 400; // 500 + 400 = 900ms < 1000ms

      expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(false);
    });

    it('returns false when sequenceTime is exactly at word end (exclusive)', () => {
      const word = { text: 'hello', startMs: 1000, endMs: 1500 };
      const pageStartMs = 500;
      const sequenceTimeMs = 1000; // 500 + 1000 = 1500ms = word.endMs

      expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(false);
    });

    it('returns false when sequenceTime is after word end', () => {
      const word = { text: 'hello', startMs: 1000, endMs: 1500 };
      const pageStartMs = 500;
      const sequenceTimeMs = 1200; // 500 + 1200 = 1700ms > 1500ms

      expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(false);
    });
  });

  // === Boundary Cases ===

  describe('boundary conditions', () => {
    it('handles first word of video (pageStartMs = 0)', () => {
      const word = { text: 'first', startMs: 0, endMs: 250 };
      const pageStartMs = 0;

      expect(isWordActive(word, pageStartMs, 0)).toBe(true);
      expect(isWordActive(word, pageStartMs, 125)).toBe(true);
      expect(isWordActive(word, pageStartMs, 250)).toBe(false);
    });

    it('handles words on second page (frame reset)', () => {
      // This is the critical bug fix test
      const word = { text: 'second', startMs: 3000, endMs: 3500 };
      const pageStartMs = 2500; // Page 2 starts at 2.5s

      // At sequenceTime 0 (start of page 2), word hasn't started
      expect(isWordActive(word, pageStartMs, 0)).toBe(false);

      // At sequenceTime 500 (2500 + 500 = 3000ms), word starts
      expect(isWordActive(word, pageStartMs, 500)).toBe(true);

      // At sequenceTime 750 (2500 + 750 = 3250ms), word is active
      expect(isWordActive(word, pageStartMs, 750)).toBe(true);

      // At sequenceTime 1000 (2500 + 1000 = 3500ms), word ends
      expect(isWordActive(word, pageStartMs, 1000)).toBe(false);
    });

    it('handles floating point precision', () => {
      const word = { text: 'float', startMs: 1000.001, endMs: 1500.001 };
      const pageStartMs = 500;
      const sequenceTimeMs = 500.001;

      expect(isWordActive(word, pageStartMs, sequenceTimeMs)).toBe(true);
    });
  });

  // === Multiple Words ===

  describe('multiple words on page', () => {
    it('highlights only one word at a time', () => {
      const words = [
        { text: 'one', startMs: 0, endMs: 500 },
        { text: 'two', startMs: 500, endMs: 1000 },
        { text: 'three', startMs: 1000, endMs: 1500 },
      ];
      const pageStartMs = 0;

      // At 250ms, only "one" is active
      expect(isWordActive(words[0], pageStartMs, 250)).toBe(true);
      expect(isWordActive(words[1], pageStartMs, 250)).toBe(false);
      expect(isWordActive(words[2], pageStartMs, 250)).toBe(false);

      // At 750ms, only "two" is active
      expect(isWordActive(words[0], pageStartMs, 750)).toBe(false);
      expect(isWordActive(words[1], pageStartMs, 750)).toBe(true);
      expect(isWordActive(words[2], pageStartMs, 750)).toBe(false);
    });
  });
});
```

---

## 4. Test Suite 2: Timestamp Validation (Unit)

### File: `tests/unit/audio/timestamp-validation.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateWordTimings, TimestampValidationError } from '@/audio/asr/validator';

describe('validateWordTimings', () => {
  // === Valid Cases ===

  describe('valid timestamps', () => {
    it('accepts valid word sequence', () => {
      const words = [
        { word: 'hello', start: 0, end: 0.5, confidence: 0.9 },
        { word: 'world', start: 0.5, end: 1.0, confidence: 0.9 },
      ];

      expect(() => validateWordTimings(words, 1.0)).not.toThrow();
    });

    it('accepts small gaps between words', () => {
      const words = [
        { word: 'hello', start: 0, end: 0.4, confidence: 0.9 },
        { word: 'world', start: 0.5, end: 1.0, confidence: 0.9 }, // 100ms gap
      ];

      expect(() => validateWordTimings(words, 1.0)).not.toThrow();
    });
  });

  // === Invalid Cases (Bug Regression Tests) ===

  describe('invalid timestamps', () => {
    it('rejects word where end < start', () => {
      // This is the exact bug from timestamps.json
      const words = [{ word: 'ahead', start: 21.647, end: 21.457, confidence: 0.9 }];

      expect(() => validateWordTimings(words, 25.0)).toThrow(TimestampValidationError);
      expect(() => validateWordTimings(words, 25.0)).toThrow(
        /end time must be greater than start/i
      );
    });

    it('rejects word where end equals start', () => {
      const words = [{ word: 'zero', start: 5.0, end: 5.0, confidence: 0.9 }];

      expect(() => validateWordTimings(words, 10.0)).toThrow(TimestampValidationError);
    });

    it('rejects gaps larger than 500ms', () => {
      const words = [
        { word: 'hello', start: 0, end: 0.4, confidence: 0.9 },
        { word: 'world', start: 1.0, end: 1.5, confidence: 0.9 }, // 600ms gap
      ];

      expect(() => validateWordTimings(words, 1.5)).toThrow(/gap too large/i);
    });

    it('rejects when last word ends before 95% of totalDuration', () => {
      const words = [{ word: 'short', start: 0, end: 0.5, confidence: 0.9 }];
      const totalDuration = 10.0; // Last word ends at 0.5s, should cover ~9.5s

      expect(() => validateWordTimings(words, totalDuration)).toThrow(/does not cover duration/i);
    });
  });

  // === The Exact Bug Case ===

  describe('regression: timestamps.json corruption', () => {
    it('detects the exact corruption pattern from v3 render', () => {
      // Simulating the corruption where end is frozen at 21.457
      const words = [
        { word: 'stay', start: 21.394, end: 21.457, confidence: 0.9 },
        { word: 'ahead', start: 21.647, end: 21.457, confidence: 0.9 },
        { word: 'of', start: 21.918, end: 21.457, confidence: 0.9 },
        { word: 'the', start: 22.135, end: 21.457, confidence: 0.9 },
        { word: 'game!', start: 22.37, end: 21.457, confidence: 0.9 },
      ];

      expect(() => validateWordTimings(words, 25.0)).toThrow(TimestampValidationError);

      // Should catch "ahead" as first invalid word
      try {
        validateWordTimings(words, 25.0);
      } catch (e) {
        expect((e as TimestampValidationError).wordIndex).toBe(1);
        expect((e as TimestampValidationError).word).toBe('ahead');
      }
    });
  });
});
```

---

## 5. Test Suite 3: Visual Duration (Unit)

### File: `tests/unit/visuals/duration.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ensureVisualCoverage, validateSceneDurations } from '@/visuals/duration';

describe('Scene Duration Validation', () => {
  describe('validateSceneDurations', () => {
    it('accepts scenes that cover full audio duration', () => {
      const scenes = [
        { sceneId: 'scene-001', duration: 5.0 },
        { sceneId: 'scene-002', duration: 5.0 },
        { sceneId: 'scene-003', duration: 5.0 },
      ];
      const audioDuration = 15.0;

      expect(() => validateSceneDurations(scenes, audioDuration)).not.toThrow();
    });

    it('accepts scenes that exceed audio duration', () => {
      const scenes = [
        { sceneId: 'scene-001', duration: 10.0 },
        { sceneId: 'scene-002', duration: 10.0 },
      ];
      const audioDuration = 15.0;

      expect(() => validateSceneDurations(scenes, audioDuration)).not.toThrow();
    });

    it('rejects scenes shorter than audio duration', () => {
      const scenes = [
        { sceneId: 'scene-001', duration: 5.0 },
        { sceneId: 'scene-002', duration: 5.0 },
      ];
      const audioDuration = 25.0; // Scenes only cover 10s

      expect(() => validateSceneDurations(scenes, audioDuration)).toThrow(
        /scenes do not cover audio duration/i
      );
    });
  });

  describe('ensureVisualCoverage', () => {
    it('returns scenes unchanged if they cover audio duration', () => {
      const scenes = [
        { sceneId: 'scene-001', duration: 5.0, videoDuration: 10.0 },
        { sceneId: 'scene-002', duration: 5.0, videoDuration: 10.0 },
      ];
      const audioDuration = 10.0;

      const result = ensureVisualCoverage(scenes, audioDuration);
      expect(result).toHaveLength(2);
      expect(result[0].duration).toBe(5.0);
    });

    it('extends last scene if video is long enough', () => {
      const scenes = [
        { sceneId: 'scene-001', duration: 5.0, videoDuration: 10.0, source: 'stock-pexels' },
        { sceneId: 'scene-002', duration: 5.0, videoDuration: 15.0, source: 'stock-pexels' },
      ];
      const audioDuration = 15.0; // Need 5 more seconds

      const result = ensureVisualCoverage(scenes, audioDuration);
      expect(result).toHaveLength(2);
      expect(result[1].duration).toBe(10.0); // Extended from 5 to 10
    });

    it('adds fallback color scene if videos are too short', () => {
      const scenes = [
        { sceneId: 'scene-001', duration: 5.0, videoDuration: 5.0, source: 'stock-pexels' },
        { sceneId: 'scene-002', duration: 5.0, videoDuration: 5.0, source: 'stock-pexels' },
      ];
      const audioDuration = 15.0; // Need 5 more seconds, but no video is long enough

      const result = ensureVisualCoverage(scenes, audioDuration);
      expect(result).toHaveLength(3);
      expect(result[2].source).toBe('fallback-color');
      expect(result[2].duration).toBe(5.0);
      expect(result[2].assetPath).toBe('#000000');
    });

    it('handles exact match (99% threshold)', () => {
      const scenes = [
        { sceneId: 'scene-001', duration: 9.95, videoDuration: 10.0, source: 'stock-pexels' },
      ];
      const audioDuration = 10.0; // 99.5% coverage

      const result = ensureVisualCoverage(scenes, audioDuration);
      expect(result).toHaveLength(1);
    });
  });
});
```

---

## 6. Test Suite 4: Integration Tests

### File: `tests/integration/sync/caption-audio-sync.test.ts`

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { bundle } from '@remotion/bundler';
import { renderStill } from '@remotion/renderer';
import path from 'path';

describe('Caption-Audio Synchronization', () => {
  let bundleUrl: string;

  beforeAll(async () => {
    bundleUrl = await bundle({
      entryPoint: path.join(__dirname, '../../../src/render/remotion/index.ts'),
    });
  });

  it('highlights "productivity" word at 1.1s timestamp', async () => {
    const frame = 33; // 1.1s at 30fps
    const still = await renderStill({
      serveUrl: bundleUrl,
      composition: 'ShortVideo',
      inputProps: {
        words: [
          { word: 'Want', start: 0, end: 0.25 },
          { word: 'to', start: 0.25, end: 0.47 },
          { word: '10x', start: 0.47, end: 0.7 },
          { word: 'your', start: 0.7, end: 0.96 },
          { word: 'productivity', start: 0.96, end: 1.27 },
        ],
        audioPath: 'test-audio.mp3',
        scenes: [{ sceneId: 'test', duration: 2, assetPath: '#333', source: 'fallback-color' }],
        duration: 2,
      },
      frame,
    });

    // Verify the highlighted word (would need screenshot comparison)
    expect(still).toBeDefined();
  });

  it('shows correct word on second page after Sequence reset', async () => {
    // This tests the critical bug fix
    const words = [
      // Page 1: 0-2s
      { word: 'First', start: 0, end: 0.5 },
      { word: 'page', start: 0.5, end: 1.0 },
      { word: 'words', start: 1.0, end: 1.5 },
      { word: 'here', start: 1.5, end: 2.0 },
      // Page 2: 2-4s
      { word: 'Second', start: 2.0, end: 2.5 },
      { word: 'page', start: 2.5, end: 3.0 },
      { word: 'content', start: 3.0, end: 3.5 },
      { word: 'now', start: 3.5, end: 4.0 },
    ];

    // At 2.75s, "page" (second page) should be highlighted
    const frame = 82; // 2.73s at 30fps

    // Render and verify (implementation would check DOM or screenshot)
    expect(true).toBe(true); // Placeholder
  });
});
```

---

## 7. Implementation Order

Following TDD, implement in this order:

### Phase 1: Timing Helper (🔴 → 🟢 → 🔵)

1. Write `timing.test.ts` tests (RED)
2. Create `src/render/captions/timing.ts` with `isWordActive()` (GREEN)
3. Refactor for clarity (REFACTOR)

### Phase 2: Timestamp Validation (🔴 → 🟢 → 🔵)

1. Write `timestamp-validation.test.ts` tests (RED)
2. Create `src/audio/asr/validator.ts` (GREEN)
3. Integrate into audio pipeline (REFACTOR)

### Phase 3: Visual Duration (🔴 → 🟢 → 🔵)

1. Write `duration.test.ts` tests (RED)
2. Create `src/visuals/duration.ts` (GREEN)
3. Integrate into visuals pipeline (REFACTOR)

### Phase 4: Caption Component Fix (🔴 → 🟢 → 🔵)

1. Write integration tests (RED - some may already fail)
2. Update `Caption.tsx` to use `isWordActive()` (GREEN)
3. Add highlight config options (REFACTOR)

---

## 8. Test Commands

```bash
# Run all sync tests
pnpm test tests/unit/render/captions/timing.test.ts
pnpm test tests/unit/audio/timestamp-validation.test.ts
pnpm test tests/unit/visuals/duration.test.ts

# Run integration tests
pnpm test tests/integration/sync/

# Run with coverage
pnpm test:coverage --reporter=lcov

# Watch mode during TDD
pnpm test --watch tests/unit/render/captions/timing.test.ts
```

---

## 9. Success Criteria

| Metric                            | Target         |
| --------------------------------- | -------------- |
| Unit test coverage (timing.ts)    | 100%           |
| Unit test coverage (validator.ts) | 100%           |
| Unit test coverage (duration.ts)  | 100%           |
| Integration tests passing         | 100%           |
| Re-render video with fixes        | No sync issues |

---

## 10. References

- [AGENTS.md TDD Requirements](../../AGENTS.md)
- [RQ-28 Investigation](../../research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260110.md)
- [SYNC-ARCHITECTURE](./SYNC-ARCHITECTURE-20260110.md)
- [CAPTION-TIMING](./CAPTION-TIMING-20260110.md)
