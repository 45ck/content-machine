import { describe, it, expect } from 'vitest';
import { evaluateCadence } from './cadence';

describe('evaluateCadence', () => {
  it('passes when median cut interval is below threshold', () => {
    const result = evaluateCadence({
      durationSeconds: 30,
      cutTimesSeconds: [0.5, 2.5, 5, 7.5, 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5],
      maxMedianCutIntervalSeconds: 3,
    });
    expect(result.passed).toBe(true);
    expect(result.medianCutIntervalSeconds).toBeLessThanOrEqual(3);
  });

  it('fails when there are effectively no cuts', () => {
    const result = evaluateCadence({
      durationSeconds: 30,
      cutTimesSeconds: [],
      maxMedianCutIntervalSeconds: 3,
    });
    expect(result.passed).toBe(false);
    expect(result.medianCutIntervalSeconds).toBeGreaterThan(3);
  });
});
