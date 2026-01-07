/**
 * Scene Pacing Quality Metrics
 *
 * Measures consistency and naturalness of speech pacing across scenes.
 * Abnormal WPM (words per minute) can indicate:
 * - ASR errors (too fast = compressed timing)
 * - Content issues (too slow = awkward pauses)
 * - Scene boundary problems
 */

import type { TimestampsResult, SceneTimestamps } from '../audio/schema';

/**
 * Pacing quality report
 */
export interface PacingQualityReport {
  /** Overall pacing score (0-1) */
  overallScore: number;

  /** Per-scene metrics */
  scenes: ScenePacingMetrics[];

  /** Aggregate metrics */
  aggregate: {
    /** Average WPM across all scenes */
    avgWpm: number;
    /** Standard deviation of WPM */
    stdDevWpm: number;
    /** Coefficient of variation (lower = more consistent) */
    coefficientOfVariation: number;
    /** Number of scenes with abnormal pacing */
    abnormalScenes: number;
  };

  /** Issues found */
  issues: PacingIssue[];

  /** Pass/fail status */
  passed: boolean;
}

export interface ScenePacingMetrics {
  sceneIndex: number;
  wordCount: number;
  durationSeconds: number;
  wpm: number;
  status: 'normal' | 'fast' | 'slow' | 'abnormal';
}

export interface PacingIssue {
  type: 'too-fast' | 'too-slow' | 'inconsistent' | 'abnormal-cta';
  sceneIndex: number;
  wpm: number;
  detail: string;
  severity: 'error' | 'warning';
}

/**
 * Pacing thresholds
 */
export const PACING_THRESHOLDS = {
  /** Normal speech WPM range */
  minWpm: 120,
  maxWpm: 220,

  /** Absolute limits (anything beyond is problematic) */
  absoluteMinWpm: 80,
  absoluteMaxWpm: 280,

  /** CTA scenes can be faster (they're typically short) */
  ctaMaxWpm: 350,

  /** Coefficient of variation threshold (pacing consistency) */
  maxCoefficientOfVariation: 0.4,

  /** Minimum scene duration to analyze (very short scenes skipped) */
  minSceneDurationMs: 500,

  /** Overall score threshold to pass */
  overallMinimum: 0.75,
} as const;

/**
 * Analyze pacing quality from timestamps
 */
export function analyzePacingQuality(timestamps: TimestampsResult): PacingQualityReport {
  const issues: PacingIssue[] = [];
  const sceneMetrics: ScenePacingMetrics[] = [];

  // Analyze each scene
  for (const scene of timestamps.scenes) {
    const metrics = analyzeScenePacing(scene, issues);
    sceneMetrics.push(metrics);
  }

  // Calculate aggregate metrics
  const validScenes = sceneMetrics.filter(
    (s) => s.durationSeconds > PACING_THRESHOLDS.minSceneDurationMs / 1000
  );
  const wpmValues = validScenes.map((s) => s.wpm);

  const avgWpm = wpmValues.length > 0 ? wpmValues.reduce((a, b) => a + b, 0) / wpmValues.length : 0;

  const variance =
    wpmValues.length > 0
      ? wpmValues.reduce((sum, wpm) => sum + Math.pow(wpm - avgWpm, 2), 0) / wpmValues.length
      : 0;
  const stdDevWpm = Math.sqrt(variance);
  const coefficientOfVariation = avgWpm > 0 ? stdDevWpm / avgWpm : 0;

  // Check for pacing inconsistency
  if (coefficientOfVariation > PACING_THRESHOLDS.maxCoefficientOfVariation) {
    issues.push({
      type: 'inconsistent',
      sceneIndex: -1,
      wpm: avgWpm,
      detail: `Inconsistent pacing: CV=${(coefficientOfVariation * 100).toFixed(1)}% (max: ${PACING_THRESHOLDS.maxCoefficientOfVariation * 100}%)`,
      severity: 'warning',
    });
  }

  const abnormalScenes = sceneMetrics.filter((s) => s.status === 'abnormal').length;

  // Calculate overall score
  const overallScore = calculatePacingScore(sceneMetrics, coefficientOfVariation);

  return {
    overallScore,
    scenes: sceneMetrics,
    aggregate: {
      avgWpm: Math.round(avgWpm),
      stdDevWpm: Math.round(stdDevWpm),
      coefficientOfVariation,
      abnormalScenes,
    },
    issues,
    passed: overallScore >= PACING_THRESHOLDS.overallMinimum,
  };
}

/**
 * Analyze pacing for a single scene
 */
function analyzeScenePacing(scene: SceneTimestamps, issues: PacingIssue[]): ScenePacingMetrics {
  const words = scene.words;
  if (words.length === 0) {
    return {
      sceneIndex: scene.sceneIndex,
      wordCount: 0,
      durationSeconds: 0,
      wpm: 0,
      status: 'normal',
    };
  }

  const firstWord = words[0];
  const lastWord = words[words.length - 1];
  const durationSeconds = lastWord.end - firstWord.start;

  // Handle very short scenes (likely CTA)
  if (durationSeconds < PACING_THRESHOLDS.minSceneDurationMs / 1000) {
    return {
      sceneIndex: scene.sceneIndex,
      wordCount: words.length,
      durationSeconds,
      wpm: 0,
      status: 'normal', // Skip analysis for very short scenes
    };
  }

  const wpm = (words.length / durationSeconds) * 60;

  // Determine status
  let status: ScenePacingMetrics['status'] = 'normal';
  const isCta = scene.sceneIndex === -1 || words.length <= 5; // Assume CTA if very short

  if (isCta) {
    // CTA scenes have relaxed thresholds
    if (wpm > PACING_THRESHOLDS.ctaMaxWpm) {
      status = 'abnormal';
      issues.push({
        type: 'abnormal-cta',
        sceneIndex: scene.sceneIndex,
        wpm: Math.round(wpm),
        detail: `CTA too fast: ${Math.round(wpm)} WPM (max: ${PACING_THRESHOLDS.ctaMaxWpm})`,
        severity: 'warning',
      });
    }
  } else {
    // Regular scenes
    if (wpm > PACING_THRESHOLDS.absoluteMaxWpm) {
      status = 'abnormal';
      issues.push({
        type: 'too-fast',
        sceneIndex: scene.sceneIndex,
        wpm: Math.round(wpm),
        detail: `Scene ${scene.sceneIndex} too fast: ${Math.round(wpm)} WPM (max: ${PACING_THRESHOLDS.absoluteMaxWpm})`,
        severity: 'error',
      });
    } else if (wpm > PACING_THRESHOLDS.maxWpm) {
      status = 'fast';
      issues.push({
        type: 'too-fast',
        sceneIndex: scene.sceneIndex,
        wpm: Math.round(wpm),
        detail: `Scene ${scene.sceneIndex} fast: ${Math.round(wpm)} WPM (target: ${PACING_THRESHOLDS.maxWpm})`,
        severity: 'warning',
      });
    } else if (wpm < PACING_THRESHOLDS.absoluteMinWpm) {
      status = 'abnormal';
      issues.push({
        type: 'too-slow',
        sceneIndex: scene.sceneIndex,
        wpm: Math.round(wpm),
        detail: `Scene ${scene.sceneIndex} too slow: ${Math.round(wpm)} WPM (min: ${PACING_THRESHOLDS.absoluteMinWpm})`,
        severity: 'error',
      });
    } else if (wpm < PACING_THRESHOLDS.minWpm) {
      status = 'slow';
    }
  }

  return {
    sceneIndex: scene.sceneIndex,
    wordCount: words.length,
    durationSeconds,
    wpm: Math.round(wpm),
    status,
  };
}

/**
 * Calculate overall pacing score
 */
function calculatePacingScore(
  scenes: ScenePacingMetrics[],
  coefficientOfVariation: number
): number {
  if (scenes.length === 0) return 1;

  // Score components:
  // 1. Percentage of scenes with normal/acceptable pacing
  // 2. Consistency (inverse of CV)

  const normalScenes = scenes.filter((s) => s.status === 'normal' || s.status === 'fast').length;
  const pacingScore = normalScenes / scenes.length;

  // Consistency score: 1 when CV=0, decreasing as CV increases
  const consistencyScore = Math.max(
    0,
    1 - coefficientOfVariation / PACING_THRESHOLDS.maxCoefficientOfVariation
  );

  // Weighted average: 70% pacing, 30% consistency
  return pacingScore * 0.7 + consistencyScore * 0.3;
}

/**
 * Format pacing report as human-readable string
 */
export function formatPacingReport(report: PacingQualityReport): string {
  const lines: string[] = [];

  lines.push(`\n=== Pacing Quality Report ===`);
  lines.push(`Overall Score: ${(report.overallScore * 100).toFixed(1)}%`);
  lines.push(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);

  lines.push(`\nAggregate Metrics:`);
  lines.push(`  Average WPM: ${report.aggregate.avgWpm}`);
  lines.push(`  Std Dev WPM: ${report.aggregate.stdDevWpm}`);
  lines.push(
    `  Consistency (CV): ${(report.aggregate.coefficientOfVariation * 100).toFixed(1)}%`
  );
  lines.push(`  Abnormal Scenes: ${report.aggregate.abnormalScenes}/${report.scenes.length}`);

  lines.push(`\nPer-Scene Breakdown:`);
  for (const scene of report.scenes) {
    const statusIcon =
      scene.status === 'normal' ? '✓' : scene.status === 'abnormal' ? '✗' : '⚠';
    lines.push(
      `  ${statusIcon} Scene ${scene.sceneIndex}: ${scene.wordCount} words, ${scene.durationSeconds.toFixed(1)}s, ${scene.wpm} WPM [${scene.status}]`
    );
  }

  if (report.issues.length > 0) {
    lines.push(`\nIssues (${report.issues.length}):`);
    for (const issue of report.issues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      lines.push(`  ${icon} [${issue.type}] ${issue.detail}`);
    }
  }

  return lines.join('\n');
}
