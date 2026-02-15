/**
 * Paging Quality Metrics
 *
 * Measures the visual/readability quality of caption paging (how words group into pages/lines).
 * This is part of the PHOENIX LOOP quality stack (caption aesthetics).
 */

import type { CaptionPage } from '../render/captions/paging';

export interface PagingQualityReport {
  /** Overall score (0-1) */
  overallScore: number;

  /** Aggregate metrics */
  aggregate: PageMetrics;

  /** Per-page metrics */
  pages: Array<PageMetrics & { pageIndex: number }>;

  /** Issues found */
  issues: PagingIssue[];

  /** Pass/fail status */
  passed: boolean;
}

export interface PageMetrics {
  avgWordsPerPage: number;
  wordsPerPageStdDev: number;
  naturalBoundaryRate: number;
  avgCharsPerLine: number;
  unbalancedPages: number;
}

export interface PagingIssue {
  type: 'too-many-words' | 'too-few-words' | 'unbalanced-lines' | 'unnatural-break';
  pageIndex: number;
  detail: string;
  severity: 'warning' | 'error';
}

export const PAGING_THRESHOLDS = {
  targetMinWordsPerPage: 3,
  targetMaxWordsPerPage: 5,
  maxWordsPerPage: 7,
  minWordsPerPage: 2,
  maxStdDevWordsPerPage: 2.5,
  minNaturalBoundaryRate: 0.5,
  targetMinCharsPerLine: 12,
  targetMaxCharsPerLine: 28,
  maxUnbalancedPageRate: 0.25,
  overallMinimum: 0.75,
} as const;

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const variance = mean(values.map((v) => Math.pow(v - avg, 2)));
  return Math.sqrt(variance);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isNaturalBoundary(word: string): boolean {
  return /[.!?,;:]$/.test(word.trim());
}

function getUnbalancedLineCount(page: CaptionPage): number {
  if (page.lines.length < 2) return 0;
  const lengths = page.lines.map((l) => l.text.length);
  const maxLen = Math.max(...lengths);
  const minLen = Math.min(...lengths);
  return minLen < maxLen * 0.5 ? 1 : 0;
}

function computeAggregate(pages: CaptionPage[]): PageMetrics & { wordsPerPage: number[] } {
  const wordsPerPage = pages.map((p) => p.words.length);
  const avgWordsPerPage = mean(wordsPerPage);
  const wordsPerPageStdDev = stdDev(wordsPerPage);

  const naturalEndCount = pages.filter((p) => {
    const lastWord = p.words[p.words.length - 1]?.text ?? '';
    return isNaturalBoundary(lastWord);
  }).length;
  const naturalBoundaryRate = naturalEndCount / pages.length;

  const allLines = pages.flatMap((p) => p.lines);
  const avgCharsPerLine = mean(allLines.map((l) => l.text.length));

  const unbalancedPages = pages.reduce((sum, p) => sum + getUnbalancedLineCount(p), 0);

  return {
    avgWordsPerPage,
    wordsPerPageStdDev,
    naturalBoundaryRate,
    avgCharsPerLine,
    unbalancedPages,
    wordsPerPage,
  };
}

function collectIssues(pages: CaptionPage[], wordsPerPage: number[]): PagingIssue[] {
  const issues: PagingIssue[] = [];

  for (const [pageIndex, page] of pages.entries()) {
    if (getUnbalancedLineCount(page) === 1) {
      const lengths = page.lines.map((l) => l.text.length);
      issues.push({
        type: 'unbalanced-lines',
        pageIndex,
        detail: `Unbalanced lines: min=${Math.min(...lengths)} max=${Math.max(...lengths)}`,
        severity: 'warning',
      });
    }

    const count = wordsPerPage[pageIndex] ?? 0;
    if (count > PAGING_THRESHOLDS.maxWordsPerPage) {
      issues.push({
        type: 'too-many-words',
        pageIndex,
        detail: `Too many words: ${count} (max ${PAGING_THRESHOLDS.maxWordsPerPage})`,
        severity: 'warning',
      });
    } else if (count < PAGING_THRESHOLDS.minWordsPerPage) {
      issues.push({
        type: 'too-few-words',
        pageIndex,
        detail: `Too few words: ${count} (min ${PAGING_THRESHOLDS.minWordsPerPage})`,
        severity: 'warning',
      });
    }

    const lastWord = page.words[page.words.length - 1]?.text ?? '';
    if (!isNaturalBoundary(lastWord)) {
      issues.push({
        type: 'unnatural-break',
        pageIndex,
        detail: `Page does not end on a natural boundary: "${lastWord}"`,
        severity: 'warning',
      });
    }
  }

  return issues;
}

function scoreWordsBand(avgWordsPerPage: number): number {
  if (
    avgWordsPerPage >= PAGING_THRESHOLDS.targetMinWordsPerPage &&
    avgWordsPerPage <= PAGING_THRESHOLDS.targetMaxWordsPerPage
  ) {
    return 1;
  }
  if (
    avgWordsPerPage >= PAGING_THRESHOLDS.minWordsPerPage &&
    avgWordsPerPage <= PAGING_THRESHOLDS.maxWordsPerPage
  ) {
    return 0.6;
  }
  return 0.2;
}

function scoreCharBand(avgCharsPerLine: number): number {
  if (
    avgCharsPerLine >= PAGING_THRESHOLDS.targetMinCharsPerLine &&
    avgCharsPerLine <= PAGING_THRESHOLDS.targetMaxCharsPerLine
  ) {
    return 1;
  }
  if (avgCharsPerLine >= 8 && avgCharsPerLine <= 34) return 0.6;
  return 0.2;
}

function computeOverallScore(aggregate: PageMetrics, pageCount: number): number {
  const wordsBandScore = scoreWordsBand(aggregate.avgWordsPerPage);
  const consistencyScore = clamp01(
    1 - aggregate.wordsPerPageStdDev / PAGING_THRESHOLDS.maxStdDevWordsPerPage
  );
  const naturalBoundaryScore = clamp01(
    aggregate.naturalBoundaryRate / PAGING_THRESHOLDS.minNaturalBoundaryRate
  );
  const charBandScore = scoreCharBand(aggregate.avgCharsPerLine);

  const unbalancedRate = pageCount > 0 ? aggregate.unbalancedPages / pageCount : 0;
  const balanceScore = clamp01(1 - unbalancedRate / PAGING_THRESHOLDS.maxUnbalancedPageRate);

  return clamp01(
    wordsBandScore * 0.25 +
      consistencyScore * 0.2 +
      naturalBoundaryScore * 0.25 +
      charBandScore * 0.15 +
      balanceScore * 0.15
  );
}

function buildPerPageMetrics(pages: CaptionPage[]): Array<PageMetrics & { pageIndex: number }> {
  return pages.map((p, pageIndex) => ({
    pageIndex,
    avgWordsPerPage: p.words.length,
    wordsPerPageStdDev: 0,
    naturalBoundaryRate: isNaturalBoundary(p.words[p.words.length - 1]?.text ?? '') ? 1 : 0,
    avgCharsPerLine: mean(p.lines.map((l) => l.text.length)),
    unbalancedPages: getUnbalancedLineCount(p),
  }));
}

/**
 * Computes caption paging readability metrics and derives an overall pass/fail.
 */
export function analyzePagingQuality(pages: CaptionPage[]): PagingQualityReport {
  if (pages.length === 0) {
    return {
      overallScore: 0,
      aggregate: {
        avgWordsPerPage: 0,
        wordsPerPageStdDev: 0,
        naturalBoundaryRate: 0,
        avgCharsPerLine: 0,
        unbalancedPages: 0,
      },
      pages: [],
      issues: [],
      passed: false,
    };
  }

  const aggregateWithInternals = computeAggregate(pages);
  const issues = collectIssues(pages, aggregateWithInternals.wordsPerPage);

  const aggregate: PageMetrics = {
    avgWordsPerPage: aggregateWithInternals.avgWordsPerPage,
    wordsPerPageStdDev: aggregateWithInternals.wordsPerPageStdDev,
    naturalBoundaryRate: aggregateWithInternals.naturalBoundaryRate,
    avgCharsPerLine: aggregateWithInternals.avgCharsPerLine,
    unbalancedPages: aggregateWithInternals.unbalancedPages,
  };

  const overallScore = computeOverallScore(aggregate, pages.length);
  const perPage = buildPerPageMetrics(pages);

  return {
    overallScore,
    aggregate,
    pages: perPage,
    issues,
    passed: overallScore >= PAGING_THRESHOLDS.overallMinimum,
  };
}

/**
 * Formats a paging quality report for human-readable CLI output.
 */
export function formatPagingReport(report: PagingQualityReport): string {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return [
    `Paging quality: ${pct(report.overallScore)}`,
    `- Avg words/page: ${report.aggregate.avgWordsPerPage.toFixed(2)} (sd=${report.aggregate.wordsPerPageStdDev.toFixed(2)})`,
    `- Natural boundary rate: ${pct(report.aggregate.naturalBoundaryRate)}`,
    `- Avg chars/line: ${report.aggregate.avgCharsPerLine.toFixed(1)}`,
    `- Unbalanced pages: ${report.aggregate.unbalancedPages}/${report.pages.length}`,
    report.passed ? 'Status: PASS' : 'Status: FAIL',
  ].join('\n');
}
