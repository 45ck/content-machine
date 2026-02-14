/**
 * Quality Scorer
 *
 * Scores videos 0-100 using either a learned ONNX model or a heuristic
 * weighted average of repo metric scores.
 */
import { resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { runPythonJson } from '../validate/python-json';
import type { FeatureVector } from '../domain';

export interface QualityScoreResult {
  score: number;
  confidence: number;
  label: 'bad' | 'below_average' | 'average' | 'good' | 'excellent';
  subscores: Record<string, number>;
  defects: string[];
  topFactors: Array<{ feature: string; impact: number; direction: 'positive' | 'negative' }>;
  modelVersion: string;
  method: 'learned' | 'heuristic';
}

export interface QualityScoreOptions {
  features: FeatureVector;
  modelPath?: string;
  heuristic?: boolean;
  explain?: boolean;
  pythonPath?: string;
  timeoutMs?: number;
}

const HEURISTIC_WEIGHTS: Record<
  string,
  { key: keyof FeatureVector['repoMetrics']; weight: number; scale: number }
> = {
  syncRating: { key: 'syncRating', weight: 0.18, scale: 100 },
  captionOverall: { key: 'captionOverall', weight: 0.12, scale: 1 },
  pacingScore: { key: 'pacingScore', weight: 0.1, scale: 1 },
  audioScore: { key: 'audioScore', weight: 0.1, scale: 1 },
  engagementScore: { key: 'engagementScore', weight: 0.12, scale: 1 },
  scriptScore: { key: 'scriptScore', weight: 0.08, scale: 1 },
  syncMatchRatio: { key: 'syncMatchRatio', weight: 0.06, scale: 1 },
  hookTiming: { key: 'hookTiming', weight: 0.06, scale: 1 },
};

/** Video-intrinsic quality signals derived from metadata (no repo artifacts needed). */
function computeIntrinsicScore(metadata: FeatureVector['metadata']): number {
  let score = 0;
  let maxScore = 0;

  // Duration: 20-60s is ideal for shorts
  maxScore += 25;
  const dur = metadata.durationS;
  if (dur >= 20 && dur <= 60) score += 25;
  else if (dur >= 15 && dur <= 90) score += 18;
  else if (dur >= 10) score += 8;
  else score += 2;

  // Aspect ratio: portrait (9:16) is ideal
  maxScore += 25;
  const { width, height } = metadata;
  if (width && height) {
    const ratio = width / height;
    if (ratio < 0.7)
      score += 25; // portrait
    else if (ratio < 1.0)
      score += 15; // near-portrait
    else if (ratio < 1.4)
      score += 10; // landscape-ish
    else score += 5; // wide landscape
  }

  // Resolution: 1080 width is ideal for shorts
  maxScore += 25;
  if (width) {
    if (width >= 1080) score += 25;
    else if (width >= 720) score += 15;
    else score += 5;
  }

  // OCR confidence (if available) — proxy for caption presence/readability
  maxScore += 25;
  if (metadata.ocrConfidenceMean != null) {
    score += Math.round(metadata.ocrConfidenceMean * 25);
  } else {
    // No OCR data — neutral
    score += 12;
  }

  return maxScore > 0 ? score / maxScore : 0.5;
}

/** Scores a video using either a learned model or heuristic fallback. */
export async function scoreQuality(options: QualityScoreOptions): Promise<QualityScoreResult> {
  const { features, heuristic } = options;

  // Try learned model first unless heuristic is forced
  if (!heuristic) {
    const modelPath = options.modelPath ?? 'quality_scorer.onnx';
    if (existsSync(modelPath)) {
      return scoreWithModel(features, modelPath, options);
    }
  }

  return scoreHeuristic(features, options.explain ?? false);
}

function scoreHeuristic(features: FeatureVector, explain: boolean): QualityScoreResult {
  const { repoMetrics, metadata } = features;
  let weightedSum = 0;
  let totalWeight = 0;
  const subscores: Record<string, number> = {};
  const factors: QualityScoreResult['topFactors'] = [];

  // Count how many repo metrics are available to determine blend ratio
  const totalPossibleMetrics = Object.keys(HEURISTIC_WEIGHTS).length;
  let availableMetrics = 0;

  for (const [name, config] of Object.entries(HEURISTIC_WEIGHTS)) {
    const raw = repoMetrics[config.key];
    if (raw == null) continue;
    availableMetrics++;

    const normalized = raw / config.scale;
    const contribution = normalized * config.weight;
    weightedSum += contribution;
    totalWeight += config.weight;
    subscores[name] = Math.round(normalized * 100);

    if (explain) {
      factors.push({
        feature: name,
        impact: Math.round(contribution * 100),
        direction: normalized >= 0.5 ? 'positive' : 'negative',
      });
    }
  }

  const repoScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Intrinsic score from video metadata (always available)
  const intrinsicScore = computeIntrinsicScore(metadata);
  subscores._intrinsic = Math.round(intrinsicScore * 100);

  // Blend: when all repo metrics are present, repo dominates (80/20).
  // When few or no repo metrics are available, intrinsic dominates.
  const coverage = availableMetrics / totalPossibleMetrics;
  const repoBlend = coverage * 0.8;
  const intrinsicBlend = 1 - repoBlend;
  const blendedScore = repoScore * repoBlend + intrinsicScore * intrinsicBlend;

  const score = Math.round(blendedScore * 100);
  const clampedScore = Math.max(0, Math.min(100, score));

  if (explain) {
    factors.push({
      feature: '_intrinsic',
      impact: Math.round(intrinsicScore * intrinsicBlend * 100),
      direction: intrinsicScore >= 0.5 ? 'positive' : 'negative',
    });
  }

  // Sort factors by absolute impact
  factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  // Derive defects from low-scoring metrics
  const defects = deriveDefects(repoMetrics);

  // Confidence scales with metric coverage
  const rawConfidence = 0.3 + coverage * 0.5 + (Math.abs(clampedScore - 50) / 50) * 0.2;
  const confidence = Math.min(1, rawConfidence);

  return {
    score: clampedScore,
    confidence: Math.round(confidence * 100) / 100,
    label: scoreToLabel(clampedScore),
    subscores,
    defects,
    topFactors: factors.slice(0, 5),
    modelVersion: 'heuristic-v2',
    method: 'heuristic',
  };
}

async function scoreWithModel(
  features: FeatureVector,
  modelPath: string,
  options: QualityScoreOptions
): Promise<QualityScoreResult> {
  const scriptPath = resolve(__dirname, '../../scripts/onnx_inference.py');
  const { writeFileSync, mkdtempSync, rmSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');

  // Write features to temp file for Python script
  const tmpDir = mkdtempSync(join(tmpdir(), 'cm-qs-'));
  const featuresPath = join(tmpDir, 'features.json');

  try {
    writeFileSync(featuresPath, JSON.stringify(features));

    const result = (await runPythonJson({
      errorCode: 'QUALITY_SCORE_ERROR',
      pythonPath: options.pythonPath,
      scriptPath,
      args: ['--model', modelPath, '--features', featuresPath],
      timeoutMs: options.timeoutMs ?? 60_000,
    })) as { score: number; modelVersion?: string };

    let score = Math.max(0, Math.min(100, Math.round(result.score)));

    // Apply Platt scaling calibration if available
    const calibrationPath = modelPath.replace(/\.onnx$/, '_calibration.json');
    score = applyPlattCalibration(score, calibrationPath);

    const confidence = Math.min(1, Math.abs(score - 50) / 50 + 0.3);

    return {
      score,
      confidence: Math.round(confidence * 100) / 100,
      label: scoreToLabel(score),
      subscores: {},
      defects: deriveDefects(features.repoMetrics),
      topFactors: [],
      modelVersion: result.modelVersion ?? 'unknown',
      method: 'learned',
    };
  } finally {
    try {
      rmSync(tmpDir, { recursive: true });
    } catch {
      // cleanup best effort
    }
  }
}

/** Derive defect codes from low-scoring repo metrics. */
function deriveDefects(repoMetrics: FeatureVector['repoMetrics']): string[] {
  const defects: string[] = [];
  if (repoMetrics.syncRating != null && repoMetrics.syncRating < 40)
    defects.push('low_sync_rating');
  if (repoMetrics.audioScore != null && repoMetrics.audioScore < 0.3)
    defects.push('audio_quality_poor');
  if (repoMetrics.audioOverlapCount != null && repoMetrics.audioOverlapCount > 0)
    defects.push('audio_overlap_detected');
  if (repoMetrics.captionOverall != null && repoMetrics.captionOverall < 0.3)
    defects.push('caption_quality_poor');
  if (repoMetrics.pacingScore != null && repoMetrics.pacingScore < 0.3) defects.push('pacing_poor');
  if (repoMetrics.engagementScore != null && repoMetrics.engagementScore < 0.3)
    defects.push('low_engagement');
  if (repoMetrics.hookTiming != null && repoMetrics.hookTiming < 0.2) defects.push('weak_hook');
  return defects;
}

/**
 * Apply Platt scaling calibration if a calibration JSON exists.
 * Expects {a, b} params pre-fit to the model's 0-1 normalized score distribution
 * via standard logistic regression: p = 1 / (1 + exp(a * score_norm + b)).
 */
function applyPlattCalibration(rawScore: number, calibrationPath: string): number {
  try {
    const cal = JSON.parse(readFileSync(calibrationPath, 'utf-8')) as { a: number; b: number };
    const x = rawScore / 100;
    const calibrated = 1 / (1 + Math.exp(cal.a * x + cal.b));
    return Math.max(0, Math.min(100, Math.round(calibrated * 100)));
  } catch {
    return rawScore;
  }
}

function scoreToLabel(score: number): QualityScoreResult['label'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  if (score >= 20) return 'below_average';
  return 'bad';
}
