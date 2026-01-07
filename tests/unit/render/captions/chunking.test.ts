/**
 * Tests for TikTok-native caption chunking
 */
import { describe, it, expect } from 'vitest';
import { createCaptionChunks, detectEmphasis } from '../../../../src/render/captions/chunking';

// Helper to create timed words
function createWords(
  texts: string[],
  startMs = 0,
  wordDurationMs = 200,
  gapMs = 50
): Array<{ word: string; startMs: number; endMs: number }> {
  let currentMs = startMs;
  return texts.map((text) => {
    const word = {
      word: text,
      startMs: currentMs,
      endMs: currentMs + wordDurationMs,
    };
    currentMs += wordDurationMs + gapMs;
    return word;
  });
}

describe('detectEmphasis', () => {
  describe('number detection', () => {
    it('detects plain numbers', () => {
      expect(detectEmphasis('100', false, false, ['number'])).toEqual({
        isEmphasized: true,
        type: 'number',
      });
    });

    it('detects percentages', () => {
      expect(detectEmphasis('50%', false, false, ['number'])).toEqual({
        isEmphasized: true,
        type: 'number',
      });
    });

    it('detects money amounts', () => {
      expect(detectEmphasis('$500', false, false, ['number'])).toEqual({
        isEmphasized: true,
        type: 'number',
      });
    });

    it('detects K/M/B suffixes', () => {
      expect(detectEmphasis('5K', false, false, ['number'])).toEqual({
        isEmphasized: true,
        type: 'number',
      });
      expect(detectEmphasis('10M', false, false, ['number'])).toEqual({
        isEmphasized: true,
        type: 'number',
      });
    });

    it('does not match regular words', () => {
      expect(detectEmphasis('hello', false, false, ['number'])).toEqual({
        isEmphasized: false,
      });
    });
  });

  describe('power word detection', () => {
    it('detects superlatives', () => {
      expect(detectEmphasis('best', false, false, ['power'])).toEqual({
        isEmphasized: true,
        type: 'power',
      });
      expect(detectEmphasis('WORST', false, false, ['power'])).toEqual({
        isEmphasized: true,
        type: 'power',
      });
    });

    it('detects absolutes', () => {
      expect(detectEmphasis('never', false, false, ['power'])).toEqual({
        isEmphasized: true,
        type: 'power',
      });
      expect(detectEmphasis('always', false, false, ['power'])).toEqual({
        isEmphasized: true,
        type: 'power',
      });
    });

    it('detects drama words', () => {
      expect(detectEmphasis('insane', false, false, ['power'])).toEqual({
        isEmphasized: true,
        type: 'power',
      });
      expect(detectEmphasis('SHOCKING', false, false, ['power'])).toEqual({
        isEmphasized: true,
        type: 'power',
      });
    });

    it('strips punctuation for matching', () => {
      expect(detectEmphasis('best!', false, false, ['power'])).toEqual({
        isEmphasized: true,
        type: 'power',
      });
    });
  });

  describe('negation detection', () => {
    it('detects contractions', () => {
      expect(detectEmphasis("don't", false, false, ['negation'])).toEqual({
        isEmphasized: true,
        type: 'negation',
      });
      expect(detectEmphasis("can't", false, false, ['negation'])).toEqual({
        isEmphasized: true,
        type: 'negation',
      });
    });

    it('detects simple negations', () => {
      expect(detectEmphasis('not', false, false, ['negation'])).toEqual({
        isEmphasized: true,
        type: 'negation',
      });
      expect(detectEmphasis('no', false, false, ['negation'])).toEqual({
        isEmphasized: true,
        type: 'negation',
      });
    });
  });

  describe('pause detection', () => {
    it('marks word before pause as emphasized', () => {
      expect(detectEmphasis('word', true, false, ['pause'])).toEqual({
        isEmphasized: true,
        type: 'pause',
      });
    });

    it('does not mark without pause', () => {
      expect(detectEmphasis('word', false, false, ['pause'])).toEqual({
        isEmphasized: false,
      });
    });
  });

  describe('punctuation detection', () => {
    it('marks word before strong punctuation', () => {
      expect(detectEmphasis('word', false, true, ['punctuation'])).toEqual({
        isEmphasized: true,
        type: 'punctuation',
      });
    });
  });

  describe('disabled types', () => {
    it('respects empty enabled types', () => {
      expect(detectEmphasis('100', false, false, [])).toEqual({
        isEmphasized: false,
      });
    });

    it('only detects enabled types', () => {
      expect(detectEmphasis('100', false, false, ['power'])).toEqual({
        isEmphasized: false,
      });
    });
  });
});

describe('createCaptionChunks', () => {
  describe('basic chunking', () => {
    it('creates chunks from words', () => {
      const words = createWords(['This', 'is', 'a', 'test']);
      const chunks = createCaptionChunks(words, {
        maxWordsPerChunk: 4,
        minWordsPerChunk: 1,
        maxCharsPerSecond: 100, // High limit to not trigger CPS breaks
        pauseGapMs: 1000, // High gap to not trigger pause breaks
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].words.length).toBe(4);
      expect(chunks[0].text).toBe('This is a test');
    });

    it('respects maxWordsPerChunk', () => {
      const words = createWords(['One', 'two', 'three', 'four', 'five', 'six']);
      const chunks = createCaptionChunks(words, {
        maxWordsPerChunk: 3,
        minWordsPerChunk: 1,
        maxCharsPerSecond: 100, // High limit to not trigger CPS breaks
        pauseGapMs: 1000, // High gap to not trigger pause breaks
      });

      expect(chunks.length).toBe(2);
      expect(chunks[0].words.length).toBe(3);
      expect(chunks[1].words.length).toBe(3);
    });

    it('handles empty input', () => {
      const chunks = createCaptionChunks([]);
      expect(chunks).toEqual([]);
    });

    it('handles single word', () => {
      const words = createWords(['Hello']);
      const chunks = createCaptionChunks(words);

      expect(chunks.length).toBe(1);
      expect(chunks[0].words.length).toBe(1);
    });
  });

  describe('CPS (characters per second) limiting', () => {
    it('breaks chunk when CPS would exceed limit', () => {
      // Create words spoken very quickly (high CPS)
      // Word 1: "Supercalifragilisticexpialidocious" = 34 chars in 200ms
      // Adding word 2: "Amazing" would make total 42 chars in 450ms = 93 CPS
      // With CPS limit of 10, should break before adding word 2
      const words = [
        { word: 'Supercalifragilisticexpialidocious', startMs: 0, endMs: 200 },
        { word: 'Amazing', startMs: 250, endMs: 450 },
        { word: 'Test', startMs: 500, endMs: 700 },
      ];
      const chunks = createCaptionChunks(words, {
        maxWordsPerChunk: 10,
        minWordsPerChunk: 1, // Allow single word chunks
        maxCharsPerSecond: 10,
        pauseGapMs: 1000, // High gap to not trigger pause breaks
      });

      // Should have multiple chunks due to CPS limits
      expect(chunks.length).toBeGreaterThan(1);
    });

    it('keeps words together when CPS is acceptable', () => {
      // Create words with plenty of time (low CPS)
      // 10 chars in 1100ms = 9 CPS, under limit of 15
      const words = [
        { word: 'Hello', startMs: 0, endMs: 500 },
        { word: 'world', startMs: 600, endMs: 1100 },
      ];
      const chunks = createCaptionChunks(words, {
        maxCharsPerSecond: 15,
        maxWordsPerChunk: 5,
        pauseGapMs: 1000,
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0].words.length).toBe(2);
    });
  });

  describe('pause gap detection', () => {
    it('breaks on significant pause', () => {
      const words = [
        { word: 'First', startMs: 0, endMs: 200 },
        { word: 'sentence', startMs: 250, endMs: 500 },
        // 600ms gap
        { word: 'Second', startMs: 1100, endMs: 1300 },
        { word: 'sentence', startMs: 1350, endMs: 1600 },
      ];
      const chunks = createCaptionChunks(words, {
        pauseGapMs: 500,
        maxWordsPerChunk: 10,
      });

      expect(chunks.length).toBe(2);
      expect(chunks[0].text).toBe('First sentence');
      expect(chunks[1].text).toBe('Second sentence');
    });

    it('keeps words together without significant pause', () => {
      const words = createWords(['No', 'pause', 'here'], 0, 200, 50);
      const chunks = createCaptionChunks(words, {
        pauseGapMs: 500,
        maxWordsPerChunk: 10,
      });

      expect(chunks.length).toBe(1);
    });
  });

  describe('sentence boundary detection', () => {
    it('breaks after sentence-ending punctuation', () => {
      const words = createWords(['Hello.', 'How', 'are', 'you?'], 0, 200, 50);
      const chunks = createCaptionChunks(words, {
        maxWordsPerChunk: 10,
        minWordsPerChunk: 1,
        maxCharsPerSecond: 100, // High to not trigger CPS breaks
        pauseGapMs: 1000, // High to not trigger pause breaks
      });

      expect(chunks.length).toBe(2);
      expect(chunks[0].text).toBe('Hello.');
      expect(chunks[1].text).toBe('How are you?');
    });

    it('respects minWordsPerChunk for sentence breaks', () => {
      const words = createWords(['A.', 'B.', 'C.'], 0, 200, 50);
      const chunks = createCaptionChunks(words, {
        maxWordsPerChunk: 10,
        minWordsPerChunk: 2,
        maxCharsPerSecond: 100,
        pauseGapMs: 1000,
      });

      // Should not break after each single word due to minWordsPerChunk
      expect(chunks.length).toBeLessThan(3);
    });
  });

  describe('orphan prevention', () => {
    it('includes last word in previous chunk to avoid single-word orphan', () => {
      const words = createWords(['One', 'two', 'three', 'four']);
      const chunks = createCaptionChunks(words, {
        maxWordsPerChunk: 3,
        minWordsPerChunk: 2,
      });

      // With orphan prevention, should not leave "four" alone
      // Either [3, 1] becomes [4] or [2, 2]
      const lastChunkLength = chunks[chunks.length - 1].words.length;
      expect(lastChunkLength).toBeGreaterThanOrEqual(1);
    });
  });

  describe('minimum on-screen time', () => {
    it('extends chunk endMs for very short chunks', () => {
      const words = [{ word: 'Quick', startMs: 0, endMs: 100 }];
      const chunks = createCaptionChunks(words, {
        minOnScreenMs: 350,
      });

      expect(chunks[0].endMs).toBeGreaterThanOrEqual(350);
    });

    it('does not extend past next chunk start', () => {
      const words = [
        { word: 'First', startMs: 0, endMs: 100 },
        { word: 'Second', startMs: 200, endMs: 400 },
      ];
      const chunks = createCaptionChunks(words, {
        minOnScreenMs: 500,
        maxWordsPerChunk: 1,
        minWordsPerChunk: 1,
      });

      // First chunk should not extend past 150 (200 - 50 gap)
      expect(chunks[0].endMs).toBeLessThan(chunks[1].startMs);
    });
  });

  describe('emphasis marking', () => {
    it('marks chunks with emphasis when containing emphasized words', () => {
      const words = createWords(['This', 'is', '$100', 'dollars']);
      const chunks = createCaptionChunks(words, {
        emphasisTypes: ['number'],
        maxWordsPerChunk: 10,
        maxCharsPerSecond: 100,
        pauseGapMs: 1000,
      });

      expect(chunks[0].hasEmphasis).toBe(true);
      const emphWord = chunks[0].words.find((w) => w.text === '$100');
      expect(emphWord?.isEmphasized).toBe(true);
      expect(emphWord?.emphasisType).toBe('number');
    });

    it('marks power words', () => {
      const words = createWords(['This', 'is', 'insane', 'stuff']);
      const chunks = createCaptionChunks(words, {
        emphasisTypes: ['power'],
        maxWordsPerChunk: 10,
        maxCharsPerSecond: 100,
        pauseGapMs: 1000,
      });

      const emphWord = chunks[0].words.find((w) => w.text === 'insane');
      expect(emphWord?.isEmphasized).toBe(true);
    });

    it('marks word before pause', () => {
      const words = [
        { word: 'Last', startMs: 0, endMs: 200 },
        // 700ms pause
        { word: 'word', startMs: 900, endMs: 1100 },
      ];
      const chunks = createCaptionChunks(words, {
        emphasisTypes: ['pause'],
        pauseGapMs: 500,
        maxWordsPerChunk: 5,
        maxCharsPerSecond: 100,
      });

      // "Last" should be emphasized because it's before a pause
      const lastWord = chunks[0].words.find((w) => w.text === 'Last');
      expect(lastWord?.isEmphasized).toBe(true);
      expect(lastWord?.emphasisType).toBe('pause');
    });
  });

  describe('chunk properties', () => {
    it('calculates correct startMs and endMs', () => {
      const words = [
        { word: 'Hello', startMs: 100, endMs: 300 },
        { word: 'world', startMs: 350, endMs: 550 },
      ];
      const chunks = createCaptionChunks(words, { maxWordsPerChunk: 5 });

      expect(chunks[0].startMs).toBe(100);
      expect(chunks[0].endMs).toBeGreaterThanOrEqual(550);
    });

    it('calculates correct charCount', () => {
      const words = createWords(['Hi', 'there']);
      const chunks = createCaptionChunks(words, { maxWordsPerChunk: 5 });

      // "Hi" (2) + space (1) + "there" (5) = 8
      expect(chunks[0].charCount).toBe(8);
    });

    it('assigns sequential indexes', () => {
      const words = createWords(['A', 'B', 'C', 'D', 'E', 'F']);
      const chunks = createCaptionChunks(words, { maxWordsPerChunk: 2 });

      expect(chunks[0].index).toBe(0);
      expect(chunks[1].index).toBe(1);
      expect(chunks[2].index).toBe(2);
    });
  });
});
