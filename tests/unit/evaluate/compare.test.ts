import { describe, it, expect } from 'vitest';
import { compareReports } from '../../../src/evaluate/compare';
import type { EvaluationReport } from '../../../src/evaluate/schema';

const createReport = (
  checks: Array<{ checkId: string; passed: boolean; skipped?: boolean }>,
  overallScore?: number
): EvaluationReport => ({
  schemaVersion: '1.0.0',
  videoPath: 'test.mp4',
  passed: checks.every((c) => c.passed),
  checks: checks.map((c) => ({
    checkId: c.checkId as any,
    passed: c.passed,
    skipped: c.skipped ?? false,
    summary: 'test',
    durationMs: 100,
  })),
  thresholds: {
    validateProfile: 'portrait',
  },
  overall: overallScore != null ? { score: overallScore, label: 'good', confidence: 1 } : undefined,
  totalDurationMs: 1000,
  createdAt: new Date().toISOString(),
});

describe('compareReports', () => {
  it('detects regression when check goes from pass to fail', () => {
    const previous = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: true },
    ]);
    const current = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: false },
    ]);

    const result = compareReports(previous, current);

    expect(result.regressions).toHaveLength(1);
    expect(result.regressions[0].checkId).toBe('rate');
    expect(result.regressions[0].previousPassed).toBe(true);
    expect(result.regressions[0].currentPassed).toBe(false);
    expect(result.improvements).toHaveLength(0);
  });

  it('detects improvement when check goes from fail to pass', () => {
    const previous = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: false },
    ]);
    const current = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: true },
    ]);

    const result = compareReports(previous, current);

    expect(result.improvements).toHaveLength(1);
    expect(result.improvements[0].checkId).toBe('rate');
    expect(result.improvements[0].previousPassed).toBe(false);
    expect(result.improvements[0].currentPassed).toBe(true);
    expect(result.regressions).toHaveLength(0);
  });

  it('detects unchanged when check status stays the same', () => {
    const previous = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: false },
    ]);
    const current = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: false },
    ]);

    const result = compareReports(previous, current);

    expect(result.unchanged).toHaveLength(2);
    expect(result.regressions).toHaveLength(0);
    expect(result.improvements).toHaveLength(0);
  });

  it('computes score delta correctly', () => {
    const previous = createReport([{ checkId: 'validate', passed: true }], 0.75);
    const current = createReport([{ checkId: 'validate', passed: true }], 0.85);

    const result = compareReports(previous, current);

    expect(result.previousScore).toBe(0.75);
    expect(result.currentScore).toBe(0.85);
    expect(result.scoreDelta).toBeCloseTo(0.1, 5);
  });

  it('handles missing scores gracefully', () => {
    const previous = createReport([{ checkId: 'validate', passed: true }]);
    const current = createReport([{ checkId: 'validate', passed: true }]);

    const result = compareReports(previous, current);

    expect(result.previousScore).toBeUndefined();
    expect(result.currentScore).toBeUndefined();
    expect(result.scoreDelta).toBe(0);
  });

  it('handles negative score delta', () => {
    const previous = createReport([{ checkId: 'validate', passed: true }], 0.85);
    const current = createReport([{ checkId: 'validate', passed: true }], 0.65);

    const result = compareReports(previous, current);

    expect(result.previousScore).toBe(0.85);
    expect(result.currentScore).toBe(0.65);
    expect(result.scoreDelta).toBeCloseTo(-0.2, 5);
  });

  it('skips checks that are only present in one report', () => {
    const previous = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: true },
    ]);
    const current = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'temporalQuality', passed: true },
    ]);

    const result = compareReports(previous, current);

    expect(result.unchanged).toHaveLength(1);
    expect(result.unchanged[0].checkId).toBe('validate');
    expect(result.regressions).toHaveLength(0);
    expect(result.improvements).toHaveLength(0);
  });

  it('ignores skipped checks in comparison', () => {
    const previous = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: false, skipped: true },
    ]);
    const current = createReport([
      { checkId: 'validate', passed: true },
      { checkId: 'rate', passed: true, skipped: true },
    ]);

    const result = compareReports(previous, current);

    expect(result.unchanged).toHaveLength(1);
    expect(result.unchanged[0].checkId).toBe('validate');
    expect(result.regressions).toHaveLength(0);
    expect(result.improvements).toHaveLength(0);
  });
});
