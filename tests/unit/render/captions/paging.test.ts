/**
 * Caption Paging Tests
 *
 * Tests for word wrapping and page creation.
 * Critical: Words should NEVER be broken mid-word.
 */
import { describe, it, expect } from 'vitest';
import { createCaptionPages, toTimedWords, TimedWord } from '../../../../src/render/captions/paging';

/**
 * Helper to create timed words from text array
 */
function createWords(texts: string[]): TimedWord[] {
  return texts.map((text, i) => ({
    text,
    startMs: i * 500,
    endMs: (i + 1) * 500 - 50,
  }));
}

describe('createCaptionPages', () => {
  describe('word integrity', () => {
    it('never breaks words mid-word', () => {
      // Long word that exceeds maxCharsPerLine
      const words = createWords(['PERFORMANCE', 'is', 'amazing']);
      const pages = createCaptionPages(words, { maxCharsPerLine: 10 });

      // Each word should appear complete in exactly one line
      const allLineTexts = pages.flatMap((p) => p.lines.map((l) => l.text));

      // "PERFORMANCE" is 11 chars, exceeds 10, but should NOT be broken
      // It should appear as a complete word on its own line
      expect(allLineTexts).toContain('PERFORMANCE');

      // Check that we don't have partial fragments (if broken, we'd see something like "PERFOR" alone)
      const hasPartialPerfor = allLineTexts.some(
        (text) => text.includes('PERFOR') && !text.includes('PERFORMANCE')
      );
      expect(hasPartialPerfor).toBe(false);

      // Also check no "MANCE" fragment exists as a standalone
      const hasPartialMance = allLineTexts.some(
        (text) => text.includes('MANCE') && !text.includes('PERFORMANCE')
      );
      expect(hasPartialMance).toBe(false);
    });

    it('keeps contractions together', () => {
      const words = createWords(["don't", 'forget', 'to', 'subscribe']);
      const pages = createCaptionPages(words, { maxCharsPerLine: 15 });

      const allTexts = pages.flatMap((p) => p.lines.map((l) => l.text)).join(' ');
      expect(allTexts).toContain("don't");
    });

    it('handles hyphenated words as single units', () => {
      const words = createWords(['high-performance', 'database']);
      const pages = createCaptionPages(words, { maxCharsPerLine: 10 });

      const allTexts = pages.flatMap((p) => p.lines.map((l) => l.text)).join(' ');
      expect(allTexts).toContain('high-performance');
    });
  });

  describe('line wrapping', () => {
    it('wraps to new line when maxCharsPerLine exceeded', () => {
      const words = createWords(['Redis', 'stores', 'data', 'in', 'memory']);
      const pages = createCaptionPages(words, {
        maxCharsPerLine: 15,
        maxLinesPerPage: 2,
        maxWordsPerPage: 10,
      });

      // Should create multi-line pages
      const hasMultiLine = pages.some((p) => p.lines.length > 1);
      expect(hasMultiLine).toBe(true);
    });

    it('respects maxLinesPerPage', () => {
      const words = createWords([
        'One',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
        'ten',
      ]);
      const pages = createCaptionPages(words, {
        maxCharsPerLine: 10,
        maxLinesPerPage: 2,
        maxWordsPerPage: 20,
      });

      // No page should have more than 2 lines
      for (const page of pages) {
        expect(page.lines.length).toBeLessThanOrEqual(2);
      }
    });

    it('starts new page when maxLinesPerPage reached', () => {
      const words = createWords([
        'Line',
        'one',
        'content',
        'Line',
        'two',
        'content',
        'Line',
        'three',
        'content',
      ]);
      const pages = createCaptionPages(words, {
        maxCharsPerLine: 12,
        maxLinesPerPage: 2,
        maxWordsPerPage: 20,
      });

      // Should have multiple pages
      expect(pages.length).toBeGreaterThan(1);
    });
  });

  describe('word limits', () => {
    it('respects maxWordsPerPage', () => {
      const words = createWords(['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']);
      const pages = createCaptionPages(words, {
        maxCharsPerLine: 100,
        maxLinesPerPage: 5,
        maxWordsPerPage: 4,
      });

      // Each page should have at most 4 words
      for (const page of pages) {
        expect(page.words.length).toBeLessThanOrEqual(4);
      }

      // Should create 2 pages (8 words / 4 max = 2 pages)
      expect(pages.length).toBe(2);
    });
  });

  describe('time gap handling', () => {
    it('starts new page on time gap', () => {
      const words: TimedWord[] = [
        { text: 'First', startMs: 0, endMs: 400 },
        { text: 'sentence', startMs: 450, endMs: 850 },
        // Large gap here
        { text: 'Second', startMs: 3000, endMs: 3400 },
        { text: 'sentence', startMs: 3450, endMs: 3850 },
      ];

      const pages = createCaptionPages(words, {
        maxCharsPerLine: 100,
        maxLinesPerPage: 5,
        maxWordsPerPage: 10,
        maxGapMs: 1000,
      });

      // Should create 2 pages due to the gap
      expect(pages.length).toBe(2);
      expect(pages[0].text).toContain('First');
      expect(pages[1].text).toContain('Second');
    });
  });

  describe('toTimedWords', () => {
    it('converts word timestamps to timed words', () => {
      const input = [
        { word: 'Hello', start: 0.5, end: 0.8 },
        { word: 'world', start: 0.9, end: 1.2 },
      ];

      const result = toTimedWords(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ text: 'Hello', startMs: 500, endMs: 800 });
      expect(result[1]).toEqual({ text: 'world', startMs: 900, endMs: 1200 });
    });
  });

  describe('edge cases', () => {
    it('handles empty words array', () => {
      const pages = createCaptionPages([]);
      expect(pages).toEqual([]);
    });

    it('handles single word', () => {
      const words = createWords(['Hello']);
      const pages = createCaptionPages(words);

      expect(pages).toHaveLength(1);
      expect(pages[0].words).toHaveLength(1);
      expect(pages[0].text).toBe('Hello');
    });

    it('handles very long single word exceeding line limit', () => {
      // Word longer than maxCharsPerLine - should still be on its own line
      const words = createWords(['Supercalifragilisticexpialidocious']);
      const pages = createCaptionPages(words, { maxCharsPerLine: 10 });

      expect(pages).toHaveLength(1);
      expect(pages[0].lines).toHaveLength(1);
      expect(pages[0].lines[0].text).toBe('Supercalifragilisticexpialidocious');
    });
  });
});
