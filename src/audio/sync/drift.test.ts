/**
 * Drift Detection Module Tests
 *
 * TDD: Tests for timestamp drift detection and correction.
 */
import { describe, it, expect } from 'vitest';
import {
  detectDrift,
  correctDrift,
  analyzeDriftPattern,
  type DriftAnalysis,
  type TimestampWithExpected,
} from './drift';

describe('detectDrift', () => {
  describe('linear drift', () => {
    it('detects linear drift with positive slope', () => {
      // Timestamps that drift 10ms per second
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.01, end: 1.31, expectedStart: 1.0 },
        { word: 'c', start: 2.02, end: 2.32, expectedStart: 2.0 },
        { word: 'd', start: 3.03, end: 3.33, expectedStart: 3.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('linear');
      expect(analysis.slope).toBeCloseTo(0.01, 2); // 10ms/s drift
    });

    it('detects linear drift with negative slope', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 0.99, end: 1.29, expectedStart: 1.0 },
        { word: 'c', start: 1.98, end: 2.28, expectedStart: 2.0 },
        { word: 'd', start: 2.97, end: 3.27, expectedStart: 3.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('linear');
      expect(analysis.slope).toBeCloseTo(-0.01, 2);
    });

    it('calculates drift direction as lagging for positive slope', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.1, end: 1.4, expectedStart: 1.0 },
        { word: 'c', start: 2.2, end: 2.5, expectedStart: 2.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.driftDirection).toBe('lagging');
    });

    it('calculates drift direction as leading for negative slope', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 0.9, end: 1.2, expectedStart: 1.0 },
        { word: 'c', start: 1.8, end: 2.1, expectedStart: 2.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.driftDirection).toBe('leading');
    });
  });

  describe('stepped drift', () => {
    it('detects sudden jump in timestamps', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.0, end: 1.3, expectedStart: 1.0 },
        { word: 'c', start: 2.5, end: 2.8, expectedStart: 2.0 }, // 500ms jump
        { word: 'd', start: 3.5, end: 3.8, expectedStart: 3.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('stepped');
      expect(analysis.jumpLocations).toContain(2); // Index of jump
      expect(analysis.jumpMagnitudeMs).toBeCloseTo(500, -1);
    });

    it('detects multiple jumps', () => {
      // Clear stepped pattern: stable, then big jump, stable, then big jump
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.0, end: 1.3, expectedStart: 1.0 },
        { word: 'c', start: 2.5, end: 2.8, expectedStart: 2.0 }, // 500ms jump
        { word: 'd', start: 3.5, end: 3.8, expectedStart: 3.0 },
        { word: 'e', start: 5.0, end: 5.3, expectedStart: 4.0 }, // Another 500ms jump
        { word: 'f', start: 6.0, end: 6.3, expectedStart: 5.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('stepped');
      expect(analysis.jumpLocations?.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('progressive drift', () => {
    it('detects accumulating error', () => {
      // Progressive: the error ACCELERATES (quadratic, not linear)
      // drifts: 0, 10, 40, 90, 160 ms (increases faster each time)
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.01, end: 1.31, expectedStart: 1.0 },
        { word: 'c', start: 2.04, end: 2.34, expectedStart: 2.0 },
        { word: 'd', start: 3.09, end: 3.39, expectedStart: 3.0 },
        { word: 'e', start: 4.16, end: 4.46, expectedStart: 4.0 },
        { word: 'f', start: 5.25, end: 5.55, expectedStart: 5.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('progressive');
      expect(analysis.accumulationRate).toBeGreaterThan(0);
    });
  });

  describe('no drift', () => {
    it('returns "none" pattern when drift is within tolerance', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.001, end: 1.301, expectedStart: 1.0 },
        { word: 'c', start: 2.002, end: 2.302, expectedStart: 2.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('none');
      expect(analysis.severity).toBe('ok');
    });

    it('handles empty timestamps array', () => {
      const analysis = detectDrift([]);

      expect(analysis.pattern).toBe('none');
      expect(analysis.meanDriftMs).toBe(0);
    });

    it('handles single timestamp', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.pattern).toBe('none');
    });
  });

  describe('severity levels', () => {
    it('assigns "ok" for no drift', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.0, end: 1.3, expectedStart: 1.0 },
      ];

      const analysis = detectDrift(timestamps);
      expect(analysis.severity).toBe('ok');
    });

    it('assigns "warning" for moderate drift (50-150ms max)', () => {
      // createLinearDrift(0.02, 5) gives max drift of 2*4=80ms at index 4
      const timestamps = createLinearDrift(0.02, 5);
      const analysis = detectDrift(timestamps);
      expect(analysis.severity).toBe('warning');
    });

    it('assigns "error" for significant drift (150-500ms max)', () => {
      // createLinearDrift(0.1, 5) gives max drift of 100*4=400ms at index 4
      const timestamps = createLinearDrift(0.1, 5);
      const analysis = detectDrift(timestamps);
      expect(analysis.severity).toBe('error');
    });

    it('assigns "critical" for severe drift (>500ms max)', () => {
      // createLinearDrift(0.35, 5) gives max drift of 350*4=1400ms at index 4
      const timestamps = createLinearDrift(0.35, 5);
      const analysis = detectDrift(timestamps);
      expect(analysis.severity).toBe('critical');
    });
  });

  describe('metrics', () => {
    it('calculates mean drift', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 }, // 0ms
        { word: 'b', start: 1.1, end: 1.4, expectedStart: 1.0 }, // 100ms
        { word: 'c', start: 2.2, end: 2.5, expectedStart: 2.0 }, // 200ms
      ];

      const analysis = detectDrift(timestamps);

      // Mean of [0, 100, 200] = 100
      expect(analysis.meanDriftMs).toBeCloseTo(100, 0);
    });

    it('calculates max drift', () => {
      const timestamps: TimestampWithExpected[] = [
        { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
        { word: 'b', start: 1.1, end: 1.4, expectedStart: 1.0 },
        { word: 'c', start: 2.3, end: 2.6, expectedStart: 2.0 }, // 300ms max
      ];

      const analysis = detectDrift(timestamps);

      expect(analysis.maxDriftMs).toBeCloseTo(300, 0);
    });

    it('marks as correctable when pattern is detectable', () => {
      const timestamps = createLinearDrift(0.1, 5);
      const analysis = detectDrift(timestamps);

      expect(analysis.correctable).toBe(true);
    });
  });
});

describe('correctDrift', () => {
  describe('linear drift correction', () => {
    it('applies slope correction to timestamps', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3 },
        { word: 'b', start: 1.1, end: 1.4 }, // 100ms drift
        { word: 'c', start: 2.2, end: 2.5 }, // 200ms drift
      ];

      const analysis: DriftAnalysis = {
        pattern: 'linear',
        slope: 0.1,
        severity: 'warning',
        meanDriftMs: 100,
        maxDriftMs: 200,
        driftDirection: 'lagging',
        correctable: true,
      };

      const corrected = correctDrift(timestamps, analysis);

      expect(corrected[1].start).toBeCloseTo(1.0, 1);
      expect(corrected[2].start).toBeCloseTo(2.0, 1);
    });

    it('preserves word durations during correction', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.5 },
        { word: 'b', start: 1.1, end: 1.6 },
      ];

      const analysis: DriftAnalysis = {
        pattern: 'linear',
        slope: 0.1,
        severity: 'warning',
        meanDriftMs: 50,
        maxDriftMs: 100,
        driftDirection: 'lagging',
        correctable: true,
      };

      const corrected = correctDrift(timestamps, analysis);

      const originalDuration = 0.5;
      expect(corrected[1].end - corrected[1].start).toBeCloseTo(originalDuration, 2);
    });

    it('preserves word text during correction', () => {
      const timestamps = [
        { word: 'hello', start: 0.0, end: 0.3 },
        { word: 'world', start: 1.1, end: 1.4 },
      ];

      const analysis: DriftAnalysis = {
        pattern: 'linear',
        slope: 0.1,
        severity: 'warning',
        meanDriftMs: 50,
        maxDriftMs: 100,
        driftDirection: 'lagging',
        correctable: true,
      };

      const corrected = correctDrift(timestamps, analysis);

      expect(corrected[0].word).toBe('hello');
      expect(corrected[1].word).toBe('world');
    });
  });

  describe('stepped drift correction', () => {
    it('removes sudden jumps from timestamps', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3 },
        { word: 'b', start: 1.0, end: 1.3 },
        { word: 'c', start: 2.5, end: 2.8 }, // 500ms jump
        { word: 'd', start: 3.5, end: 3.8 },
      ];

      const analysis: DriftAnalysis = {
        pattern: 'stepped',
        jumpLocations: [2],
        jumpMagnitudeMs: 500,
        severity: 'error',
        meanDriftMs: 250,
        maxDriftMs: 500,
        driftDirection: 'lagging',
        correctable: true,
      };

      const corrected = correctDrift(timestamps, analysis);

      // After jump, timestamps should be shifted back
      expect(corrected[2].start).toBeCloseTo(2.0, 1);
      expect(corrected[3].start).toBeCloseTo(3.0, 1);
    });
  });

  describe('no correction needed', () => {
    it('returns original timestamps when pattern is none', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3 },
        { word: 'b', start: 1.0, end: 1.3 },
      ];

      const analysis: DriftAnalysis = {
        pattern: 'none',
        severity: 'ok',
        meanDriftMs: 0,
        maxDriftMs: 5,
        driftDirection: 'mixed',
        correctable: false,
      };

      const corrected = correctDrift(timestamps, analysis);

      expect(corrected).toEqual(timestamps);
    });

    it('returns original timestamps when not correctable', () => {
      const timestamps = [
        { word: 'a', start: 0.0, end: 0.3 },
        { word: 'b', start: 1.5, end: 1.8 },
      ];

      const analysis: DriftAnalysis = {
        pattern: 'random',
        severity: 'error',
        meanDriftMs: 200,
        maxDriftMs: 500,
        driftDirection: 'mixed',
        correctable: false,
      };

      const corrected = correctDrift(timestamps, analysis);

      expect(corrected).toEqual(timestamps);
    });
  });

  describe('edge cases', () => {
    it('handles empty array', () => {
      const corrected = correctDrift([], {
        pattern: 'linear',
        slope: 0.1,
        severity: 'warning',
        meanDriftMs: 0,
        maxDriftMs: 0,
        driftDirection: 'mixed',
        correctable: true,
      });

      expect(corrected).toEqual([]);
    });

    it('does not create negative timestamps', () => {
      const timestamps = [
        { word: 'a', start: 0.05, end: 0.35 }, // Already close to 0
        { word: 'b', start: 0.95, end: 1.25 },
      ];

      const analysis: DriftAnalysis = {
        pattern: 'linear',
        slope: -0.1, // Negative slope would push first word to negative
        severity: 'warning',
        meanDriftMs: 50,
        maxDriftMs: 100,
        driftDirection: 'leading',
        correctable: true,
      };

      const corrected = correctDrift(timestamps, analysis);

      expect(corrected[0].start).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('analyzeDriftPattern', () => {
  it('returns comprehensive drift metrics', () => {
    const timestamps: TimestampWithExpected[] = createLinearDrift(0.05, 5);

    const metrics = analyzeDriftPattern(timestamps);

    expect(metrics).toHaveProperty('meanDriftMs');
    expect(metrics).toHaveProperty('maxDriftMs');
    expect(metrics).toHaveProperty('driftDirection');
    expect(metrics).toHaveProperty('pattern');
    expect(metrics).toHaveProperty('correctable');
  });

  it('provides suggested action for correctable drift', () => {
    const timestamps: TimestampWithExpected[] = createLinearDrift(0.1, 5);

    const metrics = analyzeDriftPattern(timestamps);

    expect(metrics.suggestedAction).toBeDefined();
  });

  it('uses default tolerance of 30ms', () => {
    const timestamps: TimestampWithExpected[] = [
      { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
      { word: 'b', start: 1.02, end: 1.32, expectedStart: 1.0 }, // 20ms drift - within tolerance
    ];

    const metrics = analyzeDriftPattern(timestamps);

    expect(metrics.severity).toBe('ok');
  });

  it('respects custom tolerance', () => {
    const timestamps: TimestampWithExpected[] = [
      { word: 'a', start: 0.0, end: 0.3, expectedStart: 0.0 },
      { word: 'b', start: 1.02, end: 1.32, expectedStart: 1.0 }, // 20ms drift
    ];

    const metrics = analyzeDriftPattern(timestamps, { toleranceMs: 10 });

    // With 10ms tolerance, 20ms drift should be detected
    expect(metrics.meanDriftMs).toBeGreaterThan(0);
  });
});

// Helper to create test data with linear drift
function createLinearDrift(slopePerSecond: number, count: number): TimestampWithExpected[] {
  return Array.from({ length: count }, (_, i) => ({
    word: `word${i}`,
    start: i + i * slopePerSecond,
    end: i + 0.3 + i * slopePerSecond,
    expectedStart: i,
  }));
}
