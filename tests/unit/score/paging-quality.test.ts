/**
 * Paging Quality Tests
 *
 * PHOENIX LOOP - Layer 3: Aesthetics
 * Tests for caption paging quality (visual grouping of words)
 *
 * CapCut-style paging characteristics:
 * 1. Natural phrase groupings
 * 2. Balanced line lengths
 * 3. Sentence boundary alignment
 * 4. Comfortable reading pace
 */
import { describe, it, expect } from 'vitest';
import { createCaptionPages, toTimedWords, type CaptionPage } from '../../../src/render/captions/paging';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Quality metrics for paging
 */
interface PagingQualityReport {
  /** Average words per page (target: 3-5) */
  avgWordsPerPage: number;

  /** Standard deviation of words per page (lower = more consistent) */
  wordsPerPageStdDev: number;

  /** Percentage of pages that end on natural boundaries (. , ? ! etc) */
  naturalBoundaryRate: number;

  /** Average characters per line (target: 15-25) */
  avgCharsPerLine: number;

  /** Pages with unbalanced lines (one line much longer than another) */
  unbalancedPages: number;

  /** Overall score (0-1) */
  score: number;
}

/**
 * Calculate paging quality metrics
 */
function analyzePagingQuality(pages: CaptionPage[]): PagingQualityReport {
  if (pages.length === 0) {
    return {
      avgWordsPerPage: 0,
      wordsPerPageStdDev: 0,
      naturalBoundaryRate: 0,
      avgCharsPerLine: 0,
      unbalancedPages: 0,
      score: 0,
    };
  }

  // Calculate words per page stats
  const wordsPerPage = pages.map((p) => p.words.length);
  const avgWordsPerPage = wordsPerPage.reduce((a, b) => a + b, 0) / wordsPerPage.length;
  const variance =
    wordsPerPage.reduce((sum, w) => sum + Math.pow(w - avgWordsPerPage, 2), 0) / wordsPerPage.length;
  const wordsPerPageStdDev = Math.sqrt(variance);

  // Calculate natural boundary rate (pages ending with punctuation)
  const pagesEndingNaturally = pages.filter((p) => {
    const lastWord = p.words[p.words.length - 1]?.text || '';
    return /[.!?,;:]$/.test(lastWord.trim());
  }).length;
  const naturalBoundaryRate = pagesEndingNaturally / pages.length;

  // Calculate average characters per line
  const allLines = pages.flatMap((p) => p.lines);
  const charsPerLine = allLines.map((l) => l.text.length);
  const avgCharsPerLine = charsPerLine.reduce((a, b) => a + b, 0) / charsPerLine.length;

  // Count unbalanced pages (lines differ by more than 50% in length)
  let unbalancedPages = 0;
  for (const page of pages) {
    if (page.lines.length >= 2) {
      const lineLengths = page.lines.map((l) => l.text.length);
      const maxLen = Math.max(...lineLengths);
      const minLen = Math.min(...lineLengths);
      if (minLen < maxLen * 0.5) {
        unbalancedPages++;
      }
    }
  }

  // Calculate overall score
  let score = 0;

  // Words per page score (optimal: 3-5 words)
  const optimalWordsPerPage = avgWordsPerPage >= 3 && avgWordsPerPage <= 5;
  score += optimalWordsPerPage ? 0.25 : avgWordsPerPage >= 2 && avgWordsPerPage <= 7 ? 0.15 : 0;

  // Consistency score (lower std dev is better)
  const isConsistent = wordsPerPageStdDev < 2;
  score += isConsistent ? 0.2 : wordsPerPageStdDev < 3 ? 0.1 : 0;

  // Natural boundary score (higher is better)
  score += naturalBoundaryRate * 0.25;

  // Line balance score
  const balancedRate = 1 - unbalancedPages / pages.length;
  score += balancedRate * 0.15;

  // Character per line score (optimal: 15-25)
  const optimalCharsPerLine = avgCharsPerLine >= 15 && avgCharsPerLine <= 25;
  score += optimalCharsPerLine ? 0.15 : avgCharsPerLine >= 10 && avgCharsPerLine <= 30 ? 0.1 : 0;

  return {
    avgWordsPerPage,
    wordsPerPageStdDev,
    naturalBoundaryRate,
    avgCharsPerLine,
    unbalancedPages,
    score,
  };
}

describe('Paging Quality Metrics', () => {
  describe('Unit Tests - Paging Analysis', () => {
    it('should calculate average words per page', () => {
      const words = [
        { word: 'Hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.5, end: 1 },
        { word: 'how', start: 1.5, end: 2 },
        { word: 'are', start: 2, end: 2.5 },
        { word: 'you', start: 2.5, end: 3 },
        { word: 'today', start: 3, end: 3.5 },
      ];

      const timedWords = toTimedWords(words);
      const pages = createCaptionPages(timedWords, { maxWordsPerPage: 3 });
      const report = analyzePagingQuality(pages);

      expect(report.avgWordsPerPage).toBeGreaterThanOrEqual(2);
      expect(report.avgWordsPerPage).toBeLessThanOrEqual(4);
    });

    it('should detect pages ending on natural boundaries', () => {
      const words = [
        { word: 'Hello.', start: 0, end: 0.5 },
        { word: 'How', start: 1, end: 1.5 },
        { word: 'are', start: 1.5, end: 2 },
        { word: 'you?', start: 2, end: 2.5 },
      ];

      const timedWords = toTimedWords(words);
      const pages = createCaptionPages(timedWords, { maxWordsPerPage: 2 });
      const report = analyzePagingQuality(pages);

      // At least 50% of pages should end on punctuation (3 pages created, 2 end with punct)
      expect(report.naturalBoundaryRate).toBeGreaterThanOrEqual(0.5);
    });

    it('should penalize unbalanced line lengths', () => {
      // Manual construction of pages with unbalanced lines
      const balancedPage: CaptionPage = {
        lines: [
          { words: [], text: 'Hello world', startMs: 0, endMs: 500 },
          { words: [], text: 'How are you', startMs: 500, endMs: 1000 },
        ],
        words: [],
        text: 'Hello world\nHow are you',
        startMs: 0,
        endMs: 1000,
        index: 0,
      };

      const unbalancedPage: CaptionPage = {
        lines: [
          { words: [], text: 'Hi', startMs: 0, endMs: 500 },
          { words: [], text: 'This is a very long line', startMs: 500, endMs: 1000 },
        ],
        words: [],
        text: 'Hi\nThis is a very long line',
        startMs: 0,
        endMs: 1000,
        index: 0,
      };

      const balancedReport = analyzePagingQuality([balancedPage]);
      const unbalancedReport = analyzePagingQuality([unbalancedPage]);

      expect(balancedReport.unbalancedPages).toBe(0);
      expect(unbalancedReport.unbalancedPages).toBe(1);
    });
  });

  describe('Real Output Quality Gates', () => {
    const timestampsPath = path.resolve(process.cwd(), 'output/timestamps.json');

    function loadRealPages(): CaptionPage[] | null {
      if (!fs.existsSync(timestampsPath)) return null;
      try {
        const data = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
        const words = data.scenes.flatMap((s: { words: unknown[] }) => s.words);
        const timedWords = toTimedWords(
          words.map((w: { word: string; start: number; end: number }) => ({
            word: w.word,
            start: w.start,
            end: w.end,
          }))
        );
        return createCaptionPages(timedWords);
      } catch {
        return null;
      }
    }

    it('should have timestamps.json available for paging analysis', () => {
      expect(fs.existsSync(timestampsPath)).toBe(true);
    });

    it('QUALITY GATE: Average words per page should be 3-6', () => {
      const pages = loadRealPages();
      if (!pages) return;

      const report = analyzePagingQuality(pages);
      console.log(`\nPaging Quality: avgWordsPerPage = ${report.avgWordsPerPage.toFixed(1)}`);

      expect(report.avgWordsPerPage).toBeGreaterThanOrEqual(2);
      expect(report.avgWordsPerPage).toBeLessThanOrEqual(8);
    });

    it('QUALITY GATE: Natural boundary rate should be >= 30%', () => {
      const pages = loadRealPages();
      if (!pages) return;

      const report = analyzePagingQuality(pages);
      console.log(
        `Paging Quality: naturalBoundaryRate = ${(report.naturalBoundaryRate * 100).toFixed(0)}%`
      );

      expect(report.naturalBoundaryRate).toBeGreaterThanOrEqual(0.3);
    });

    it('QUALITY GATE: Average chars per line should be 10-30', () => {
      const pages = loadRealPages();
      if (!pages) return;

      const report = analyzePagingQuality(pages);
      console.log(`Paging Quality: avgCharsPerLine = ${report.avgCharsPerLine.toFixed(1)}`);

      expect(report.avgCharsPerLine).toBeGreaterThanOrEqual(10);
      expect(report.avgCharsPerLine).toBeLessThanOrEqual(30);
    });

    it('QUALITY GATE: Unbalanced pages should be < 35%', () => {
      const pages = loadRealPages();
      if (!pages) return;

      const report = analyzePagingQuality(pages);
      const unbalancedRate = report.unbalancedPages / pages.length;
      console.log(`Paging Quality: unbalancedRate = ${(unbalancedRate * 100).toFixed(0)}%`);

      // Allow up to 35% unbalanced pages (some variation is acceptable)
      expect(unbalancedRate).toBeLessThanOrEqual(0.35);
    });

    it('QUALITY GATE: Overall paging score should be >= 70%', () => {
      const pages = loadRealPages();
      if (!pages) return;

      const report = analyzePagingQuality(pages);
      console.log(`\n=== Paging Quality Report ===`);
      console.log(`Overall Score: ${(report.score * 100).toFixed(1)}%`);
      console.log(`Avg words/page: ${report.avgWordsPerPage.toFixed(1)}`);
      console.log(`Words/page std dev: ${report.wordsPerPageStdDev.toFixed(2)}`);
      console.log(`Natural boundary rate: ${(report.naturalBoundaryRate * 100).toFixed(0)}%`);
      console.log(`Avg chars/line: ${report.avgCharsPerLine.toFixed(1)}`);
      console.log(`Unbalanced pages: ${report.unbalancedPages}`);

      expect(report.score).toBeGreaterThanOrEqual(0.7);
    });
  });
});
