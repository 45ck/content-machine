/**
 * Drift Detection Module
 *
 * Analyzes timestamp data to identify and characterize sync drift patterns.
 * Supports detection and correction of:
 * - Linear drift (sample rate mismatch)
 * - Stepped drift (sudden jumps)
 * - Progressive drift (accumulating error)
 */

export type DriftPattern = 'none' | 'linear' | 'stepped' | 'progressive' | 'random';
export type DriftSeverity = 'ok' | 'warning' | 'error' | 'critical';
export type DriftDirection = 'leading' | 'lagging' | 'mixed';

export interface DriftAnalysis {
  pattern: DriftPattern;
  severity: DriftSeverity;
  meanDriftMs: number;
  maxDriftMs: number;
  driftDirection: DriftDirection;
  correctable: boolean;

  // Linear drift specific
  slope?: number; // ms drift per second

  // Stepped drift specific
  jumpLocations?: number[];
  jumpMagnitudeMs?: number;

  // Progressive drift specific
  accumulationRate?: number;

  // Recommendations
  suggestedAction?: string;
}

export interface TimestampWithExpected {
  word: string;
  start: number;
  end: number;
  expectedStart?: number;
}

export interface DriftDetectionOptions {
  toleranceMs?: number;
}

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

/**
 * Detect drift patterns in timestamps
 */
export function detectDrift(
  timestamps: TimestampWithExpected[],
  options?: DriftDetectionOptions
): DriftAnalysis {
  const tolerance = options?.toleranceMs ?? 30;
  if (timestamps.length < 2) return createNoDriftAnalysis();

  const drifts = calculateDrifts(timestamps);
  const { meanDriftMs, maxDriftMs } = computeDriftMetrics(drifts);
  const driftDirection = computeDriftDirection(drifts);

  const base: DriftAnalysisBase = {
    severity: calculateSeverity(maxDriftMs),
    meanDriftMs,
    maxDriftMs,
    driftDirection,
  };

  const jumps = detectJumps(drifts, 200);
  if (jumps.length > 0) return createSteppedAnalysis(base, jumps);

  const linearFit = fitLinearRegression(drifts);
  const progressiveRate = detectProgressiveDrift(drifts);

  const progressiveStrict = maybeProgressiveAnalysis(
    base,
    progressiveRate,
    linearFit.r2,
    0.1,
    0.95
  );
  if (progressiveStrict) return progressiveStrict;

  const linear = maybeLinearAnalysis(base, linearFit);
  if (linear) return linear;

  if (maxDriftMs <= tolerance) return createWithinToleranceAnalysis(meanDriftMs, maxDriftMs);

  const progressiveRelaxed = maybeProgressiveAnalysis(
    base,
    progressiveRate,
    linearFit.r2,
    0.05,
    Number.POSITIVE_INFINITY
  );
  if (progressiveRelaxed) return progressiveRelaxed;

  return createRandomAnalysis(base);
}

/**
 * Correct drift in timestamps based on analysis
 */
export function correctDrift(
  timestamps: WordTimestamp[],
  analysis: DriftAnalysis
): WordTimestamp[] {
  if (timestamps.length === 0) {
    return [];
  }

  if (!analysis.correctable || analysis.pattern === 'none') {
    return timestamps;
  }

  switch (analysis.pattern) {
    case 'linear':
      return correctLinearDrift(timestamps, analysis.slope ?? 0);
    case 'stepped':
      return correctSteppedDrift(timestamps, analysis.jumpLocations ?? []);
    case 'progressive':
      return correctProgressiveDrift(timestamps, analysis.accumulationRate ?? 0);
    default:
      return timestamps;
  }
}

/**
 * Analyze drift pattern with comprehensive metrics
 */
export function analyzeDriftPattern(
  timestamps: TimestampWithExpected[],
  options?: DriftDetectionOptions
): DriftAnalysis {
  return detectDrift(timestamps, options);
}

// ============= Internal Helpers =============

function createNoDriftAnalysis(): DriftAnalysis {
  return {
    pattern: 'none',
    severity: 'ok',
    meanDriftMs: 0,
    maxDriftMs: 0,
    driftDirection: 'mixed',
    correctable: false,
  };
}

type DriftAnalysisBase = Pick<
  DriftAnalysis,
  'severity' | 'meanDriftMs' | 'maxDriftMs' | 'driftDirection'
>;

function computeDriftMetrics(drifts: number[]): { meanDriftMs: number; maxDriftMs: number } {
  const absDrifts = drifts.map((d) => Math.abs(d));
  const meanDriftMs = absDrifts.reduce((sum, d) => sum + d, 0) / absDrifts.length;
  const maxDriftMs = Math.max(...absDrifts);
  return { meanDriftMs, maxDriftMs };
}

function computeDriftDirection(drifts: number[]): DriftDirection {
  let positiveCount = 0;
  let negativeCount = 0;

  for (const d of drifts) {
    if (d > 0) positiveCount++;
    else if (d < 0) negativeCount++;
  }

  if (positiveCount > negativeCount * 2) return 'lagging';
  if (negativeCount > positiveCount * 2) return 'leading';
  return 'mixed';
}

function createWithinToleranceAnalysis(meanDriftMs: number, maxDriftMs: number): DriftAnalysis {
  return {
    pattern: 'none',
    severity: 'ok',
    meanDriftMs,
    maxDriftMs,
    driftDirection: 'mixed',
    correctable: false,
  };
}

function createRandomAnalysis(base: DriftAnalysisBase): DriftAnalysis {
  return {
    pattern: 'random',
    correctable: false,
    suggestedAction: 'Manual review recommended - no clear drift pattern detected',
    ...base,
  };
}

function createSteppedAnalysis(base: DriftAnalysisBase, jumps: Jump[]): DriftAnalysis {
  const jumpMagnitude = Math.max(...jumps.map((j) => j.magnitude));
  return {
    pattern: 'stepped',
    correctable: true,
    jumpLocations: jumps.map((j) => j.index),
    jumpMagnitudeMs: jumpMagnitude,
    suggestedAction: 'Apply stepped drift correction to remove sudden jumps',
    ...base,
  };
}

function createProgressiveAnalysis(
  base: DriftAnalysisBase,
  progressiveRate: number
): DriftAnalysis {
  return {
    pattern: 'progressive',
    correctable: true,
    accumulationRate: progressiveRate,
    suggestedAction: 'Apply progressive drift correction',
    ...base,
  };
}

function maybeProgressiveAnalysis(
  base: DriftAnalysisBase,
  progressiveRate: number,
  linearFitR2: number,
  minRate: number,
  maxR2: number
): DriftAnalysis | null {
  if (progressiveRate > minRate && linearFitR2 < maxR2) {
    return createProgressiveAnalysis(base, progressiveRate);
  }
  return null;
}

function maybeLinearAnalysis(base: DriftAnalysisBase, linearFit: LinearFit): DriftAnalysis | null {
  const hasConsistentSlope = linearFit.r2 > 0.85 && Math.abs(linearFit.slope) > 5;
  if (!hasConsistentSlope) return null;

  const slope = linearFit.slope / 1000;
  return {
    pattern: 'linear',
    correctable: true,
    slope,
    suggestedAction: 'Apply linear drift correction based on detected slope',
    ...base,
  };
}

function calculateDrifts(timestamps: TimestampWithExpected[]): number[] {
  return timestamps.map((t) => {
    const expected = t.expectedStart ?? 0;
    return (t.start - expected) * 1000; // Convert to ms
  });
}

function calculateSeverity(maxDriftMs: number): DriftSeverity {
  if (maxDriftMs <= 50) return 'ok';
  if (maxDriftMs <= 150) return 'warning';
  if (maxDriftMs <= 500) return 'error';
  return 'critical';
}

interface Jump {
  index: number;
  magnitude: number;
}

function detectJumps(drifts: number[], threshold: number): Jump[] {
  const jumps: Jump[] = [];

  for (let i = 1; i < drifts.length; i++) {
    const delta = Math.abs(drifts[i] - drifts[i - 1]);
    if (delta >= threshold) {
      jumps.push({ index: i, magnitude: delta });
    }
  }

  return jumps;
}

interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
}

function fitLinearRegression(values: number[]): LinearFit {
  const n = values.length;
  if (n < 2) {
    return { slope: 0, intercept: 0, r2: 0 };
  }

  // X values are just indices
  const sumX = (n * (n - 1)) / 2;
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6;

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const meanY = sumY / n;
  const ssTotal = values.reduce((sum, y) => sum + (y - meanY) ** 2, 0);
  const ssResidual = values.reduce((sum, y, x) => {
    const predicted = slope * x + intercept;
    return sum + (y - predicted) ** 2;
  }, 0);

  const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

  return { slope, intercept, r2 };
}

function detectProgressiveDrift(drifts: number[]): number {
  if (drifts.length < 4) return 0;

  // Calculate first differences (velocity of drift)
  const firstDiffs: number[] = [];
  for (let i = 1; i < drifts.length; i++) {
    firstDiffs.push(drifts[i] - drifts[i - 1]);
  }

  // Calculate second differences (acceleration of drift)
  const secondDiffs: number[] = [];
  for (let i = 1; i < firstDiffs.length; i++) {
    secondDiffs.push(firstDiffs[i] - firstDiffs[i - 1]);
  }

  // Check if first differences are increasing (acceleration pattern)
  let increasingCount = 0;
  for (let i = 1; i < firstDiffs.length; i++) {
    if (Math.abs(firstDiffs[i]) > Math.abs(firstDiffs[i - 1]) + 5) {
      increasingCount++;
    }
  }

  // If most differences show acceleration, it's progressive
  const accelerationRatio = increasingCount / (firstDiffs.length - 1);
  if (accelerationRatio > 0.5) {
    const meanSecondDiff = secondDiffs.reduce((a, b) => a + b, 0) / secondDiffs.length;
    return Math.abs(meanSecondDiff) / 100;
  }

  return 0;
}

function correctLinearDrift(timestamps: WordTimestamp[], slope: number): WordTimestamp[] {
  return timestamps.map((t, i) => {
    const correction = i * slope;
    const duration = t.end - t.start;
    const newStart = Math.max(0, t.start - correction);

    return {
      word: t.word,
      start: newStart,
      end: newStart + duration,
    };
  });
}

function correctSteppedDrift(
  timestamps: WordTimestamp[],
  jumpLocations: number[]
): WordTimestamp[] {
  if (timestamps.length === 0) return [];

  const result: WordTimestamp[] = [];
  let cumulativeOffset = 0;

  // Sort jump locations
  const sortedJumps = [...jumpLocations].sort((a, b) => a - b);

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const duration = t.end - t.start;

    // At jump locations, calculate how much the timestamp jumped beyond expected
    if (sortedJumps.includes(i)) {
      // Expected start at index i is approximately i seconds.
      const expectedByIndex = i * 1.0;
      const actualStart = t.start;
      const additionalDrift = actualStart - expectedByIndex - cumulativeOffset;

      if (additionalDrift > 0.2) {
        // More than 200ms unexpected
        cumulativeOffset += additionalDrift;
      }
    }

    const newStart = Math.max(0, t.start - cumulativeOffset);

    result.push({
      word: t.word,
      start: newStart,
      end: newStart + duration,
    });
  }

  return result;
}

function correctProgressiveDrift(
  timestamps: WordTimestamp[],
  accumulationRate: number
): WordTimestamp[] {
  return timestamps.map((t, i) => {
    // Progressive correction increases quadratically
    const correction = (i * i * accumulationRate) / 2;
    const duration = t.end - t.start;
    const newStart = Math.max(0, t.start - correction);

    return {
      word: t.word,
      start: newStart,
      end: newStart + duration,
    };
  });
}
