# TASK-021: Implement Reconcile-to-Script Module

**Type:** Feature  
**Priority:** P1  
**Estimate:** M (4-8 hours)  
**Created:** 2026-01-07  
**Owner:** Unassigned  
**Phase:** Sync Strategies Phase 2

---

## Description

Implement the `reconcileToScript()` function that maps ASR-transcribed words back to the original script text. This solves the problem where ASR transcribes differently than the script (e.g., "10x" → "tenex", "don't" → "do not").

The reconciliation uses:

1. Position-based alignment (same word order)
2. Levenshtein similarity matching (fuzzy matching)
3. Word merging for compound words (web + socket → WebSocket)
4. Timing preservation from ASR

---

## Acceptance Criteria

- [ ] Given ASR word "tenex" at position matching script "10x", when reconciling, then output word is "10x" with ASR timing
- [ ] Given ASR words "web" + "socket" matching script "WebSocket", when reconciling, then output is single word "WebSocket" with merged timing
- [ ] Given identical ASR and script words, when reconciling, then output matches exactly
- [ ] Given unmatchable ASR word, when reconciling, then keeps original ASR word (graceful degradation)
- [ ] Given script with contractions, when reconciling, then handles "don't" ↔ "do not" mapping

---

## Required Documentation

- [ ] JSDoc with examples for `reconcileToScript()`
- [ ] Document similarity threshold choices

---

## Testing Considerations

### What Needs Testing

- Basic exact matching
- Fuzzy matching with Levenshtein distance
- Word splitting (ASR splits compound words)
- Word merging (ASR merges words)
- Timing preservation
- Edge cases with punctuation

### Edge Cases

- Empty input arrays
- Single word scripts
- All words match exactly
- No words match (graceful degradation)
- Unicode characters
- Numbers and special characters

### Risks

- Performance with long scripts
- Incorrect merging creating timing gaps

---

## Testing Plan

### Unit Tests - `src/audio/asr/reconcile.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { reconcileToScript, WordWithTiming } from './reconcile';

describe('reconcileToScript', () => {
  describe('exact matching', () => {
    it('preserves exactly matching words with ASR timing', () => {
      const asrWords: WordWithTiming[] = [
        { word: 'hello', start: 0.5, end: 0.8 },
        { word: 'world', start: 0.9, end: 1.2 },
      ];
      const scriptText = 'hello world';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result).toEqual([
        { word: 'hello', start: 0.5, end: 0.8 },
        { word: 'world', start: 0.9, end: 1.2 },
      ]);
    });

    it('handles case differences', () => {
      const asrWords = [{ word: 'HELLO', start: 0, end: 0.5 }];
      const scriptText = 'hello';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('hello'); // Uses script casing
    });
  });

  describe('fuzzy matching', () => {
    it('matches "tenex" to script "10x"', () => {
      const asrWords = [
        { word: 'tenex', start: 0.5, end: 0.8 },
        { word: 'faster', start: 0.9, end: 1.2 },
      ];
      const scriptText = '10x faster';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('10x');
      expect(result[0].start).toBe(0.5); // Timing preserved
      expect(result[1].word).toBe('faster');
    });

    it('matches "gonna" to script "going to"', () => {
      const asrWords = [
        { word: 'gonna', start: 0.5, end: 0.8 },
        { word: 'do', start: 0.9, end: 1.0 },
      ];
      const scriptText = 'going to do';

      const result = reconcileToScript(asrWords, scriptText);

      // "gonna" maps to "going" + "to" - need to handle this
      expect(result.map((w) => w.word).join(' ')).toContain('going');
    });

    it('matches with threshold similarity', () => {
      const asrWords = [{ word: 'postgres', start: 0, end: 1 }];
      const scriptText = 'PostgreSQL';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('PostgreSQL');
    });
  });

  describe('word splitting (ASR splits compound words)', () => {
    it('handles "WebSocket" split into "web socket"', () => {
      const asrWords = [
        { word: 'web', start: 0.5, end: 0.6 },
        { word: 'socket', start: 0.6, end: 0.8 },
      ];
      const scriptText = 'WebSocket';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('WebSocket');
      expect(result[0].start).toBe(0.5);
      expect(result[0].end).toBe(0.8);
    });

    it('handles "JavaScript" split into "java script"', () => {
      const asrWords = [
        { word: 'java', start: 1.0, end: 1.3 },
        { word: 'script', start: 1.3, end: 1.6 },
      ];
      const scriptText = 'JavaScript';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('JavaScript');
    });
  });

  describe('word merging (script has multiple words for single ASR)', () => {
    it('handles "dont" matching "don\'t"', () => {
      const asrWords = [{ word: 'dont', start: 0.5, end: 0.8 }];
      const scriptText = "don't";

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe("don't");
    });
  });

  describe('timing preservation', () => {
    it('preserves original ASR timing for fuzzy matches', () => {
      const asrWords = [{ word: 'gonna', start: 1.234, end: 1.567 }];
      const scriptText = 'going to';

      const result = reconcileToScript(asrWords, scriptText);

      // Should preserve original timing
      expect(result[0].start).toBe(1.234);
    });

    it('merges timing for split words', () => {
      const asrWords = [
        { word: 'type', start: 0.5, end: 0.7 },
        { word: 'script', start: 0.7, end: 1.0 },
      ];
      const scriptText = 'TypeScript';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].start).toBe(0.5);
      expect(result[0].end).toBe(1.0);
    });
  });

  describe('edge cases', () => {
    it('handles empty ASR words', () => {
      const result = reconcileToScript([], 'hello world');
      expect(result).toEqual([]);
    });

    it('handles empty script text', () => {
      const asrWords = [{ word: 'hello', start: 0, end: 1 }];
      const result = reconcileToScript(asrWords, '');

      // Should return original ASR words when no script
      expect(result[0].word).toBe('hello');
    });

    it('handles unmatchable words gracefully', () => {
      const asrWords = [
        { word: 'hello', start: 0, end: 0.5 },
        { word: 'xyz123garbage', start: 0.5, end: 1 },
        { word: 'world', start: 1, end: 1.5 },
      ];
      const scriptText = 'hello beautiful world';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('hello');
      // Middle word should fall back to ASR or best match
      expect(result[2].word).toBe('world');
    });

    it('handles punctuation correctly', () => {
      const asrWords = [
        { word: 'hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.0 },
      ];
      const scriptText = 'Hello, world!';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('Hello,');
      expect(result[1].word).toBe('world!');
    });
  });

  describe('performance', () => {
    it('handles long scripts efficiently', () => {
      const words = Array.from({ length: 500 }, (_, i) => ({
        word: `word${i}`,
        start: i * 0.5,
        end: (i + 1) * 0.5,
      }));
      const scriptText = words.map((w) => w.word).join(' ');

      const startTime = performance.now();
      reconcileToScript(words, scriptText);
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in <1s
    });
  });
});
```

---

## Implementation Notes

### Algorithm

```
1. Extract script words (preserving punctuation)
2. Normalize both ASR and script words for comparison
3. Use dynamic programming alignment (similar to diff algorithms)
4. For each ASR word:
   a. Find best matching script word by:
      - Exact match (after normalization)
      - Levenshtein similarity >= threshold
   b. Check for compound word splits
   c. Preserve ASR timing, use script text
5. Handle unmatched words gracefully
```

### Interface

```typescript
// src/audio/asr/reconcile.ts

export interface WordWithTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface ReconcileOptions {
  /** Minimum similarity threshold (0-1). Default: 0.7 */
  minSimilarity?: number;
  /** Preserve punctuation from script. Default: true */
  preservePunctuation?: boolean;
  /** Maximum lookahead for compound word matching. Default: 3 */
  maxLookahead?: number;
}

/**
 * Reconciles ASR-transcribed words to original script text.
 *
 * Preserves ASR timing while mapping words back to script text.
 * Handles common ASR issues like:
 * - Number transcription ("10x" → "tenex")
 * - Compound word splitting ("WebSocket" → "web socket")
 * - Contractions ("don't" → "dont")
 *
 * @example
 * const asrWords = [{ word: 'tenex', start: 0.5, end: 0.8 }];
 * const result = reconcileToScript(asrWords, '10x faster');
 * // result[0].word === '10x'
 * // result[0].start === 0.5 (timing preserved)
 */
export function reconcileToScript(
  asrWords: WordWithTiming[],
  scriptText: string,
  options?: ReconcileOptions
): WordWithTiming[];
```

### Helper Functions

```typescript
// Levenshtein distance (already exists in sync-rater.ts - reuse)
function levenshteinDistance(s1: string, s2: string): number;

// Similarity score (0-1)
function similarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(s1, s2) / maxLen;
}

// Normalize for comparison
function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Extract words from script (preserve punctuation position)
function extractScriptWords(text: string): Array<{
  word: string; // Full word with punctuation
  normalized: string; // Normalized for matching
}>;
```

---

## Verification Checklist

- [ ] 🔴 All tests written and failing before implementation
- [ ] 🟢 Implementation complete, all tests passing
- [ ] 🔵 Code refactored, tests still passing
- [ ] TypeScript compiles (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] All unit tests pass (`pnpm test src/audio/asr/reconcile.test.ts`)
- [ ] Performance test passes (<1s for 500 words)
- [ ] JSDoc with examples added
- [ ] Levenshtein shared/reused from sync-rater
- [ ] Code committed to main branch
- [ ] Task moved to `done/`

---

## Related

- **Depends On:** None (can be developed in parallel)
- **Blocks:** TASK-022 (AudioFirstSyncStrategy)
- **Implementation Plan:** [IMPL-SYNC-STRATEGIES-20260107](../../docs/dev/architecture/IMPL-SYNC-STRATEGIES-20260107.md)
- **Research:** [RQ-31: TTS Timestamp Extraction](../../docs/research/investigations/RQ-31-TTS-TIMESTAMP-EXTRACTION-METHODS-20260107.md)
- **Existing Code:** [src/score/sync-rater.ts](../../src/score/sync-rater.ts) (has Levenshtein)
