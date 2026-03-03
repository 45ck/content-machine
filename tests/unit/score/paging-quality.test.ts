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
import type { CaptionPage } from '../../../src/render/captions/paging';
import { analyzePagingQuality, formatPagingReport } from '../../../src/score/paging-quality';

describe('Paging Quality Metrics', () => {
  describe('Unit Tests - Paging Analysis', () => {
    it('returns a failing report for empty pages', () => {
      const report = analyzePagingQuality([]);
      expect(report.passed).toBe(false);
      expect(report.overallScore).toBe(0);
      expect(report.issues).toEqual([]);
    });

    it('scores pages and reports issues', () => {
      const pages: CaptionPage[] = [
        {
          index: 0,
          startMs: 0,
          endMs: 1000,
          text: 'Hello world',
          words: [{ text: 'Hello', startMs: 0, endMs: 400 }],
          lines: [
            { text: 'Hello world', words: [], startMs: 0, endMs: 1000 },
            { text: 'Hi', words: [], startMs: 0, endMs: 1000 },
          ],
        },
        {
          index: 1,
          startMs: 1000,
          endMs: 2000,
          text: 'Ok.',
          words: [{ text: 'Ok.', startMs: 1000, endMs: 1100 }],
          lines: [{ text: 'Ok.', words: [], startMs: 1000, endMs: 2000 }],
        },
      ];

      const report = analyzePagingQuality(pages);
      expect(report.pages).toHaveLength(2);
      expect(report.aggregate.avgWordsPerPage).toBeGreaterThan(0);
      expect(report.issues.length).toBeGreaterThan(0);
      expect(report.passed).toBeDefined();
    });

    it('formats the paging report for display', () => {
      const pages: CaptionPage[] = [
        {
          index: 0,
          startMs: 0,
          endMs: 1000,
          text: 'Hello.',
          words: [{ text: 'Hello.', startMs: 0, endMs: 500 }],
          lines: [{ text: 'Hello.', words: [], startMs: 0, endMs: 1000 }],
        },
      ];

      const report = analyzePagingQuality(pages);
      const formatted = formatPagingReport(report);
      expect(formatted).toContain('Paging quality');
      expect(formatted).toContain('Status');
    });
  });
});
