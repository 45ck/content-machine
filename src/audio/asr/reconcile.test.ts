/**
 * Reconcile-to-Script Module Tests
 *
 * TDD: Tests written FIRST to define reconciliation behavior.
 *
 * Reconciliation maps ASR-transcribed words back to original script text,
 * handling common issues like:
 * - Number transcription ("10x" → "tenex")
 * - Compound word splitting ("WebSocket" → "web socket")
 * - Contractions ("don't" → "dont")
 */
import { describe, it, expect } from 'vitest';
import type { WordWithTiming } from './reconcile';

describe('reconcileToScript', () => {
  describe('exact matching', () => {
    it('preserves exactly matching words with ASR timing', async () => {
      const { reconcileToScript } = await import('./reconcile');

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

    it('handles case differences', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [{ word: 'HELLO', start: 0, end: 0.5 }];
      const scriptText = 'hello';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('hello'); // Uses script casing
    });

    it('matches words in correct order', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'one', start: 0, end: 0.3 },
        { word: 'two', start: 0.3, end: 0.6 },
        { word: 'three', start: 0.6, end: 0.9 },
      ];
      const scriptText = 'one two three';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result.map((w) => w.word)).toEqual(['one', 'two', 'three']);
    });
  });

  describe('fuzzy matching', () => {
    it('matches "tenex" to script "10x"', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'tenex', start: 0.5, end: 0.8 },
        { word: 'faster', start: 0.9, end: 1.2 },
      ];
      const scriptText = '10x faster';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('10x');
      expect(result[0].start).toBe(0.5); // Timing preserved
      expect(result[1].word).toBe('faster');
    });

    it('matches "postgres" to script "PostgreSQL"', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [{ word: 'postgres', start: 0, end: 1 }];
      const scriptText = 'PostgreSQL';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('PostgreSQL');
    });

    it('respects minSimilarity threshold option', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [{ word: 'abc', start: 0, end: 1 }];
      const scriptText = 'xyz';

      // With high threshold, should not match
      const result = reconcileToScript(asrWords, scriptText, { minSimilarity: 0.9 });

      expect(result[0].word).toBe('abc'); // Falls back to ASR word
    });
  });

  describe('word splitting (ASR splits compound words)', () => {
    it('handles "WebSocket" split into "web socket"', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
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

    it('handles "JavaScript" split into "java script"', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'java', start: 1.0, end: 1.3 },
        { word: 'script', start: 1.3, end: 1.6 },
      ];
      const scriptText = 'JavaScript';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('JavaScript');
    });

    it('handles "TypeScript" in a longer sentence', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'use', start: 0, end: 0.3 },
        { word: 'type', start: 0.3, end: 0.5 },
        { word: 'script', start: 0.5, end: 0.8 },
        { word: 'for', start: 0.9, end: 1.0 },
        { word: 'types', start: 1.0, end: 1.3 },
      ];
      const scriptText = 'Use TypeScript for types';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result.map((w) => w.word)).toEqual(['Use', 'TypeScript', 'for', 'types']);
    });
  });

  describe('contractions', () => {
    it('handles "dont" matching "don\'t"', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [{ word: 'dont', start: 0.5, end: 0.8 }];
      const scriptText = "don't";

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe("don't");
    });

    it('handles "cant" matching "can\'t"', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'you', start: 0, end: 0.3 },
        { word: 'cant', start: 0.3, end: 0.6 },
        { word: 'do', start: 0.6, end: 0.9 },
        { word: 'this', start: 0.9, end: 1.2 },
      ];
      const scriptText = "you can't do this";

      const result = reconcileToScript(asrWords, scriptText);

      expect(result.map((w) => w.word)).toEqual(['you', "can't", 'do', 'this']);
    });
  });

  describe('timing preservation', () => {
    it('preserves original ASR timing for fuzzy matches', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'gonna', start: 1.234, end: 1.567 },
        { word: 'do', start: 1.6, end: 1.8 },
        { word: 'it', start: 1.8, end: 2.0 },
      ];
      const scriptText = 'going to do it';

      const result = reconcileToScript(asrWords, scriptText);

      // First ASR word should keep its timing
      expect(result[0].start).toBe(1.234);
    });

    it('merges timing for split words', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
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
    it('handles empty ASR words', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const result = reconcileToScript([], 'hello world');

      expect(result).toEqual([]);
    });

    it('handles empty script text', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [{ word: 'hello', start: 0, end: 1 }];
      const result = reconcileToScript(asrWords, '');

      // Should return original ASR words when no script
      expect(result[0].word).toBe('hello');
    });

    it('handles unmatchable words gracefully', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'hello', start: 0, end: 0.5 },
        { word: 'xyz123garbage', start: 0.5, end: 1 },
        { word: 'world', start: 1, end: 1.5 },
      ];
      const scriptText = 'hello beautiful world';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('hello');
      expect(result[2].word).toBe('world');
    });

    it('does not jump to far-ahead script words by default', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [{ word: 'zeta', start: 0, end: 0.4 }];
      const scriptText =
        'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen zeta!';

      const result = reconcileToScript(asrWords, scriptText);

      // If we matched far-ahead punctuation-bearing script word, we'd get "zeta!".
      expect(result[0].word).toBe('zeta');
    });

    it('handles single word script', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [{ word: 'test', start: 0, end: 1 }];
      const scriptText = 'test';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result).toHaveLength(1);
      expect(result[0].word).toBe('test');
    });

    it('handles all words matching exactly', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'the', start: 0, end: 0.2 },
        { word: 'quick', start: 0.2, end: 0.4 },
        { word: 'brown', start: 0.4, end: 0.6 },
        { word: 'fox', start: 0.6, end: 0.8 },
      ];
      const scriptText = 'the quick brown fox';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result).toHaveLength(4);
      expect(result.map((w) => w.word)).toEqual(['the', 'quick', 'brown', 'fox']);
    });
  });

  describe('punctuation handling', () => {
    it('handles punctuation correctly', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.0 },
      ];
      const scriptText = 'Hello, world!';

      const result = reconcileToScript(asrWords, scriptText);

      expect(result[0].word).toBe('Hello,');
      expect(result[1].word).toBe('world!');
    });

    it('preserves punctuation when option enabled', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const asrWords: WordWithTiming[] = [
        { word: 'wait', start: 0, end: 0.5 },
        { word: 'what', start: 0.6, end: 1.0 },
      ];
      const scriptText = 'Wait... What?!';

      const result = reconcileToScript(asrWords, scriptText, {
        preservePunctuation: true,
      });

      expect(result[0].word).toBe('Wait...');
      expect(result[1].word).toBe('What?!');
    });
  });

  describe('performance', () => {
    it('handles long scripts efficiently', async () => {
      const { reconcileToScript } = await import('./reconcile');

      const words: WordWithTiming[] = Array.from({ length: 500 }, (_, i) => ({
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

describe('similarity helper', () => {
  it('returns 1 for identical strings', async () => {
    const { similarity } = await import('./reconcile');

    expect(similarity('hello', 'hello')).toBe(1);
  });

  it('returns 0 for completely different strings of same length', async () => {
    const { similarity } = await import('./reconcile');

    expect(similarity('abc', 'xyz')).toBe(0);
  });

  it('returns value between 0 and 1 for similar strings', async () => {
    const { similarity } = await import('./reconcile');

    const sim = similarity('hello', 'hallo');

    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});
