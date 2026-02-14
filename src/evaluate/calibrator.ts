import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { EvaluationCheckResult } from '../domain';

export interface CalibratorWeights {
  weights: number[];
  intercept: number;
  accuracy: number;
  trainingSize: number;
}

export interface CalibratedScore {
  score: number;
  method: 'calibrated' | 'hand-tuned';
  calibratorAccuracy?: number;
}

function loadCalibrator(calibratorPath: string): CalibratorWeights | null {
  try {
    const data = readFileSync(calibratorPath, 'utf-8');
    const calibrator = JSON.parse(data);

    if (
      !Array.isArray(calibrator.weights) ||
      typeof calibrator.intercept !== 'number' ||
      typeof calibrator.accuracy !== 'number'
    ) {
      return null;
    }

    return calibrator as CalibratorWeights;
  } catch {
    return null;
  }
}

function extractFeatures(checks: EvaluationCheckResult[]): number[] {
  const features: number[] = [];

  // Feature order must match train_calibrator.py
  const featureNames = [
    'validate',
    'rate',
    'captionQuality',
    'score',
    'temporalQuality',
    'audioSignal',
    'semanticFidelity',
    'safety',
    'freeze',
    'dnsmos',
    'flowConsistency',
  ];

  const checkScores: Record<string, number> = {};
  for (const check of checks) {
    if (check.skipped) {
      checkScores[check.checkId] = 0.5; // Neutral for skipped
    } else {
      checkScores[check.checkId] = check.passed ? 1.0 : 0.0;
    }
  }

  for (const name of featureNames) {
    features.push(checkScores[name] ?? 0.5);
  }

  return features;
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function applyCalibratorWeights(features: number[], calibrator: CalibratorWeights): number {
  if (features.length !== calibrator.weights.length) {
    throw new Error('Feature dimension mismatch with calibrator weights');
  }

  let logit = calibrator.intercept;
  for (let i = 0; i < features.length; i++) {
    logit += features[i] * calibrator.weights[i];
  }

  return sigmoid(logit);
}

function applyHandTunedWeights(checks: EvaluationCheckResult[]): number {
  // Hand-tuned weights for fallback when no calibrator is available
  const weights: Record<string, number> = {
    validate: 0.15,
    rate: 0.2,
    captionQuality: 0.08,
    score: 0.12,
    temporalQuality: 0.08,
    audioSignal: 0.08,
    semanticFidelity: 0.08,
    freeze: 0.06,
    dnsmos: 0.08,
    flowConsistency: 0.07,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const check of checks) {
    if (check.skipped) continue;

    const weight = weights[check.checkId] ?? 0;
    totalWeight += weight;
    weightedSum += weight * (check.passed ? 1 : 0);
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0.5;
}

/** Computes a calibrated overall score from check results using learned or hand-tuned weights. */
export function applyCalibrator(
  checks: EvaluationCheckResult[],
  calibratorPath?: string
): CalibratedScore | undefined {
  // Try to load calibrator
  const resolvedPath = calibratorPath ?? resolve(process.cwd(), 'calibrator.json');
  const calibrator = loadCalibrator(resolvedPath);

  if (calibrator) {
    const features = extractFeatures(checks);
    const score = applyCalibratorWeights(features, calibrator);

    return {
      score,
      method: 'calibrated',
      calibratorAccuracy: calibrator.accuracy,
    };
  }

  // Fallback to hand-tuned weights
  const score = applyHandTunedWeights(checks);
  return {
    score,
    method: 'hand-tuned',
  };
}
