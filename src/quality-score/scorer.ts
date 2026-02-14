/**
 * Quality Scorer
 *
 * Scores videos 0-100 using either a learned ONNX model or a heuristic
 * weighted average of repo metric scores.
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { runPythonJson } from '../validate/python-json';
import type { FeatureVector } from '../domain';

export interface QualityScoreResult {
  score: number;
  label: 'bad' | 'below_average' | 'average' | 'good' | 'excellent';
  subscores: Record<string, number>;
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
  syncRating: { key: 'syncRating', weight: 0.2, scale: 100 },
  captionOverall: { key: 'captionOverall', weight: 0.15, scale: 1 },
  pacingScore: { key: 'pacingScore', weight: 0.12, scale: 1 },
  audioScore: { key: 'audioScore', weight: 0.12, scale: 100 },
  engagementScore: { key: 'engagementScore', weight: 0.15, scale: 100 },
  scriptScore: { key: 'scriptScore', weight: 0.1, scale: 1 },
  syncMatchRatio: { key: 'syncMatchRatio', weight: 0.08, scale: 1 },
  hookTiming: { key: 'hookTiming', weight: 0.08, scale: 100 },
};

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
  const { repoMetrics } = features;
  let weightedSum = 0;
  let totalWeight = 0;
  const subscores: Record<string, number> = {};
  const factors: QualityScoreResult['topFactors'] = [];

  for (const [name, config] of Object.entries(HEURISTIC_WEIGHTS)) {
    const raw = repoMetrics[config.key];
    if (raw == null) continue;

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

  const score = totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 50;
  const clampedScore = Math.max(0, Math.min(100, score));

  // Sort factors by absolute impact
  factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  return {
    score: clampedScore,
    label: scoreToLabel(clampedScore),
    subscores,
    topFactors: factors.slice(0, 5),
    modelVersion: 'heuristic-v1',
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

    const score = Math.max(0, Math.min(100, Math.round(result.score)));

    return {
      score,
      label: scoreToLabel(score),
      subscores: {},
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

function scoreToLabel(score: number): QualityScoreResult['label'] {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'average';
  if (score >= 20) return 'below_average';
  return 'bad';
}
