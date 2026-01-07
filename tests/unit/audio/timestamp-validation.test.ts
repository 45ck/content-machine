/**
 * Timestamp Validation Tests
 *
 * TDD tests for timestamp validation to prevent the corruption
 * seen in v3 render where word.end < word.start.
 *
 * @see docs/research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260610.md
 */
import { describe, it, expect } from 'vitest';
import { validateWordTimings, TimestampValidationError } from '../../../src/audio/asr/validator';

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

    it('accepts small gaps between words (up to 500ms)', () => {
      const words = [
        { word: 'hello', start: 0, end: 0.4, confidence: 0.9 },
        { word: 'world', start: 0.5, end: 1.0, confidence: 0.9 }, // 100ms gap
      ];

      expect(() => validateWordTimings(words, 1.0)).not.toThrow();
    });

    it('accepts overlapping words (common in ASR)', () => {
      const words = [
        { word: 'hello', start: 0, end: 0.55, confidence: 0.9 },
        { word: 'world', start: 0.5, end: 1.0, confidence: 0.9 }, // slight overlap
      ];

      expect(() => validateWordTimings(words, 1.0)).not.toThrow();
    });

    it('accepts words covering 95% of total duration', () => {
      const words = [{ word: 'test', start: 0, end: 9.5, confidence: 0.9 }];

      expect(() => validateWordTimings(words, 10.0)).not.toThrow();
    });
  });

  // === Invalid Cases (Bug Regression Tests) ===

  describe('invalid timestamps', () => {
    it('rejects word where end < start - THE CRITICAL BUG', () => {
      // This is the exact bug from timestamps.json that broke v3
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

      expect(() => validateWordTimings(words, totalDuration)).toThrow(/do(es)? not cover/i);
    });
  });

  // === The Exact Bug Case from v3 ===

  describe('regression: timestamps.json corruption pattern', () => {
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
    });

    it('reports the correct word index and name for first invalid word', () => {
      const words = [
        { word: 'stay', start: 21.394, end: 21.457, confidence: 0.9 }, // valid
        { word: 'ahead', start: 21.647, end: 21.457, confidence: 0.9 }, // INVALID
        { word: 'of', start: 21.918, end: 21.457, confidence: 0.9 },
      ];

      try {
        validateWordTimings(words, 25.0);
        expect.fail('Should have thrown');
      } catch (e) {
        const error = e as TimestampValidationError;
        expect(error.wordIndex).toBe(1); // "ahead" is at index 1
        expect(error.word).toBe('ahead');
        expect(error.issue).toBe('end_before_start');
      }
    });

    it('validates the full corrupted sequence from actual output', () => {
      // Actual data from output/timestamps.json words 80-95
      const words = [
        { word: 'button', start: 20.870254297994272, end: 21.159366045845275, confidence: 0.9 },
        { word: 'and', start: 21.159366045845275, end: 21.394269340974216, confidence: 0.9 },
        { word: 'stay', start: 21.394269340974216, end: 21.457512535816612, confidence: 0.9 },
        // Corruption starts here:
        { word: 'ahead', start: 21.647242120343844, end: 21.457512535816612, confidence: 0.9 },
        { word: 'of', start: 21.91828438395416, end: 21.457512535816612, confidence: 0.9 },
        { word: 'the', start: 22.13511819484241, end: 21.457512535816612, confidence: 0.9 },
        { word: 'game!', start: 22.37002148997135, end: 21.457512535816612, confidence: 0.9 },
      ];

      expect(() => validateWordTimings(words, 25.0)).toThrow(TimestampValidationError);
    });
  });

  // === Edge Cases ===

  describe('edge cases', () => {
    it('accepts empty word array', () => {
      expect(() => validateWordTimings([], 0)).not.toThrow();
    });

    it('accepts single word covering full duration', () => {
      const words = [{ word: 'only', start: 0, end: 10.0, confidence: 0.9 }];
      expect(() => validateWordTimings(words, 10.0)).not.toThrow();
    });

    it('handles very small durations (< 100ms words)', () => {
      const words = [
        { word: 'a', start: 0, end: 0.05, confidence: 0.9 },
        { word: 'b', start: 0.05, end: 0.1, confidence: 0.9 },
      ];
      expect(() => validateWordTimings(words, 0.1)).not.toThrow();
    });
  });
});

describe('TimestampValidationError', () => {
  it('has correct properties', () => {
    const error = new TimestampValidationError(5, 'test', 'end_before_start');

    expect(error).toBeInstanceOf(Error);
    expect(error.wordIndex).toBe(5);
    expect(error.word).toBe('test');
    expect(error.issue).toBe('end_before_start');
    expect(error.message).toContain('test');
    expect(error.message).toContain('5');
  });
});
