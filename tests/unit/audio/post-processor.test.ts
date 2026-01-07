/**
 * ASR Post-Processor Tests
 *
 * Tests for word merging, overlap fixing, and duration extension.
 */

import { describe, it, expect } from 'vitest';
import {
  postProcessASRWords,
  postProcessASRWordsWithStats,
} from '../../../src/audio/asr/post-processor';
import type { WordTimestamp } from '../../../src/audio/schema';

describe('ASR Post-Processor', () => {
  describe('mergeSplitWords', () => {
    it('should merge "Str" + "uggling" → "Struggling"', () => {
      const words: WordTimestamp[] = [
        { word: 'Str', start: 0.17, end: 0.366, confidence: 0.79 },
        { word: 'uggling', start: 0.32, end: 0.56, confidence: 0.99 },
        { word: 'to', start: 0.6, end: 0.7, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('Struggling');
      expect(result[0].start).toBe(0.17);
      expect(result[0].end).toBe(0.56);
      expect(result[1].word).toBe('to');
    });

    it('should merge "hyd" + "rate" → "hydrate"', () => {
      const words: WordTimestamp[] = [
        { word: 'Stay', start: 0.0, end: 0.2, confidence: 0.99 },
        { word: 'hyd', start: 0.25, end: 0.4, confidence: 0.97 },
        { word: 'rate', start: 0.4, end: 0.6, confidence: 0.99 },
        { word: 'd', start: 0.65, end: 0.8, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words);

      expect(result.some((w) => w.word === 'hydrate')).toBe(true);
      expect(result.some((w) => w.word === 'hyd')).toBe(false);
      expect(result.some((w) => w.word === 'rate')).toBe(false);
    });

    it('should not merge unrelated words', () => {
      const words: WordTimestamp[] = [
        { word: 'Hello', start: 0.0, end: 0.3, confidence: 0.99 },
        { word: 'world', start: 0.35, end: 0.6, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe('Hello');
      expect(result[1].word).toBe('world');
    });
  });

  describe('mergeSplitContractions', () => {
    it('should merge "It" + "\'s" → "It\'s"', () => {
      const words: WordTimestamp[] = [
        { word: 'It', start: 0.0, end: 0.1, confidence: 0.56 },
        { word: "'s", start: 0.1, end: 0.2, confidence: 0.98 },
        { word: 'great', start: 0.25, end: 0.5, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe("It's");
      expect(result[0].start).toBe(0.0);
      expect(result[0].end).toBe(0.2);
      expect(result[1].word).toBe('great');
    });

    it('should merge "don" + "\'t" → "don\'t"', () => {
      const words: WordTimestamp[] = [
        { word: 'I', start: 0.0, end: 0.1, confidence: 0.99 },
        { word: 'don', start: 0.15, end: 0.25, confidence: 0.97 },
        { word: "'t", start: 0.25, end: 0.35, confidence: 0.99 },
        { word: 'know', start: 0.4, end: 0.6, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words);

      // Note: "don" + "'t" isn't a split word merge, just contraction merge
      // The don should already be merged with 't
      expect(result.some((w) => w.word === "don't")).toBe(true);
    });

    it('should merge "you" + "\'re" → "you\'re"', () => {
      const words: WordTimestamp[] = [
        { word: 'you', start: 0.0, end: 0.15, confidence: 0.99 },
        { word: "'re", start: 0.15, end: 0.3, confidence: 0.99 },
        { word: 'amazing', start: 0.35, end: 0.7, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words);

      expect(result).toHaveLength(2);
      expect(result[0].word).toBe("you're");
      expect(result[1].word).toBe('amazing');
    });

    it('should handle multiple contractions in sequence', () => {
      const words: WordTimestamp[] = [
        { word: 'It', start: 0.0, end: 0.1, confidence: 0.99 },
        { word: "'s", start: 0.1, end: 0.2, confidence: 0.99 },
        { word: 'something', start: 0.25, end: 0.5, confidence: 0.99 },
        { word: 'I', start: 0.55, end: 0.6, confidence: 0.99 },
        { word: "'ve", start: 0.6, end: 0.7, confidence: 0.99 },
        { word: 'done', start: 0.75, end: 0.95, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words);

      expect(result).toHaveLength(4);
      expect(result[0].word).toBe("It's");
      expect(result[2].word).toBe("I've");
    });
  });

  describe('fixOverlappingTimestamps', () => {
    it('should fix overlapping timestamps', () => {
      const words: WordTimestamp[] = [
        { word: 'hello', start: 0.0, end: 0.5, confidence: 0.99 },
        { word: 'world', start: 0.3, end: 0.8, confidence: 0.99 }, // Overlaps!
      ];

      const result = postProcessASRWords(words, {
        mergeWords: false,
        mergeContractions: false,
        fixOverlaps: true,
      });

      expect(result[0].end).toBeLessThanOrEqual(result[1].start);
    });

    it('should not change non-overlapping timestamps', () => {
      const words: WordTimestamp[] = [
        { word: 'hello', start: 0.0, end: 0.3, confidence: 0.99 },
        { word: 'world', start: 0.35, end: 0.6, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words, {
        mergeWords: false,
        mergeContractions: false,
        fixOverlaps: true,
      });

      expect(result[0].end).toBe(0.3);
      expect(result[1].start).toBe(0.35);
    });
  });

  describe('extendShortDurations', () => {
    it('should extend very short word durations', () => {
      const words: WordTimestamp[] = [
        { word: 'a', start: 1.0, end: 1.01, confidence: 0.99 }, // 10ms - too short
        { word: 'day', start: 1.1, end: 1.3, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words, {
        mergeWords: false,
        mergeContractions: false,
        fixOverlaps: false,
        minDurationMs: 50,
      });

      const firstDuration = result[0].end - result[0].start;
      expect(firstDuration).toBeGreaterThanOrEqual(0.05); // At least 50ms
      expect(result[0].end).toBeLessThanOrEqual(result[1].start); // No overlap
    });

    it('should not extend already long enough durations', () => {
      const words: WordTimestamp[] = [
        { word: 'hello', start: 0.0, end: 0.3, confidence: 0.99 }, // 300ms - fine
        { word: 'world', start: 0.35, end: 0.6, confidence: 0.99 },
      ];

      const result = postProcessASRWords(words, {
        mergeWords: false,
        mergeContractions: false,
        fixOverlaps: false,
        minDurationMs: 50,
      });

      expect(result[0].end).toBe(0.3);
      expect(result[1].end).toBe(0.6);
    });
  });

  describe('postProcessASRWordsWithStats', () => {
    it('should return processing statistics', () => {
      const words: WordTimestamp[] = [
        { word: 'Str', start: 0.17, end: 0.366, confidence: 0.79 },
        { word: 'uggling', start: 0.32, end: 0.56, confidence: 0.99 },
        { word: 'It', start: 0.6, end: 0.65, confidence: 0.56 },
        { word: "'s", start: 0.65, end: 0.7, confidence: 0.98 },
        { word: 'hard', start: 0.75, end: 1.0, confidence: 0.99 },
      ];

      const { words: result, stats } = postProcessASRWordsWithStats(words);

      expect(result).toHaveLength(3); // Struggling, It's, hard
      expect(stats.mergedWords).toBe(1);
      expect(stats.mergedContractions).toBe(1);
      expect(stats.originalCount).toBe(5);
      expect(stats.finalCount).toBe(3);
    });
  });

  describe('full pipeline', () => {
    it('should fix all issues from real timestamps', () => {
      // Sample from actual output/timestamps.json
      const words: WordTimestamp[] = [
        { word: 'Str', start: 0.17, end: 0.366, confidence: 0.791062 },
        { word: 'uggling', start: 0.32, end: 0.56, confidence: 0.995535 },
        { word: 'to', start: 0.6, end: 0.78, confidence: 0.998688 },
        { word: 'stay', start: 0.78, end: 1.0, confidence: 0.999372 },
        { word: 'healthy', start: 1.04, end: 1.5, confidence: 0.998352 },
        { word: 'It', start: 6.51, end: 6.6, confidence: 0.561495 },
        { word: "'s", start: 6.6, end: 0.69, confidence: 0.980718 }, // Note: end < start (error in real data)
        { word: 'not', start: 0.75, end: 0.95, confidence: 0.999 },
      ];

      const { words: result, stats } = postProcessASRWordsWithStats(words);

      // Check merges happened
      expect(result.some((w) => w.word === 'Struggling')).toBe(true);
      expect(result.some((w) => w.word === "It's")).toBe(true);

      // Check no split fragments remain
      expect(result.some((w) => w.word === 'Str')).toBe(false);
      expect(result.some((w) => w.word === 'uggling')).toBe(false);
      expect(result.some((w) => w.word === "'s")).toBe(false);

      // Check stats
      expect(stats.mergedWords).toBeGreaterThan(0);
      expect(stats.mergedContractions).toBeGreaterThan(0);
    });
  });
});
