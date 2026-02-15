/**
 * Caption Timing Tests
 *
 * TDD tests for the isWordActive helper function.
 * Tests verify correct handling of Remotion Sequence frame reset.
 *
 * @see docs/dev/architecture/CAPTION-TIMING-20260110.md
 * @see docs/research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260110.md
 */
import { describe, it, expect } from 'vitest';
import { isWordActive } from '../../../../src/render/captions/timing';

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

    it('handles words on second page (frame reset) - CRITICAL BUG FIX', () => {
      // This is the critical bug fix test from RQ-28
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

  // === Real-world Test Case (from timestamps.json) ===

  describe('real-world timing from test data', () => {
    it('correctly identifies active word from actual timestamps', () => {
      // From output/timestamps.json - scene 1 words
      const words = [
        { text: 'Want', startMs: 0, endMs: 252.9727793696274 },
        { text: 'to', startMs: 252.9727793696274, endMs: 469.8065902578796 },
        { text: '10x', startMs: 469.8065902578796, endMs: 704.7098853868193 },
        { text: 'your', startMs: 704.7098853868193, endMs: 957.6826647564468 },
        { text: 'productivity', startMs: 957.6826647564468, endMs: 1273.8986389684812 },
      ];
      const pageStartMs = 0;

      // At 100ms, "Want" should be active
      expect(isWordActive(words[0], pageStartMs, 100)).toBe(true);
      expect(isWordActive(words[1], pageStartMs, 100)).toBe(false);

      // At 1000ms, "productivity" should be active
      expect(isWordActive(words[4], pageStartMs, 1000)).toBe(true);
    });
  });
});
