import { describe, expect, it } from 'vitest';
import { median, spearmanRankCorrelation } from '../../../src/bench/stats';

describe('bench stats', () => {
  it('median computes middle value', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('spearmanRankCorrelation is 1 for perfectly increasing relationship', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [10, 20, 30, 40, 50];
    expect(spearmanRankCorrelation(x, y)).toBeCloseTo(1, 8);
  });

  it('spearmanRankCorrelation is -1 for perfectly decreasing relationship', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [50, 40, 30, 20, 10];
    expect(spearmanRankCorrelation(x, y)).toBeCloseTo(-1, 8);
  });

  it('spearmanRankCorrelation handles ties', () => {
    const x = [0, 1, 2, 3];
    const y = [10, 10, 20, 20];
    const r = spearmanRankCorrelation(x, y);
    expect(r).toBeGreaterThan(0);
  });
});
