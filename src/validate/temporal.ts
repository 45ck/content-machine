import type { ValidateProfile } from './profiles';
import type { TemporalQualityGateResult } from '../domain';
import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from './python-json';

export interface TemporalQualitySummary {
  flicker: { score: number; variance: number; meanDiff: number };
  duplicateFrameRatio: number;
  framesAnalyzed: number;
}

export interface TemporalQualityAnalyzer {
  analyze(videoPath: string, options?: { sampleRate?: number }): Promise<TemporalQualitySummary>;
}

/** Runs the temporal quality gate, checking flicker score and duplicate frame ratio against profile thresholds. */
export function runTemporalQualityGate(
  summary: TemporalQualitySummary,
  profile: ValidateProfile
): TemporalQualityGateResult {
  const flickerMin = profile.flickerMin ?? 0.5;
  const maxDuplicateFrameRatio = profile.maxDuplicateFrameRatio ?? 0.3;

  const flickerPassed = summary.flicker.score >= flickerMin;
  const dupPassed = summary.duplicateFrameRatio <= maxDuplicateFrameRatio;
  const passed = flickerPassed && dupPassed;

  const issues: string[] = [];
  if (!flickerPassed)
    issues.push(`flicker score ${summary.flicker.score.toFixed(2)} < ${flickerMin}`);
  if (!dupPassed)
    issues.push(
      `duplicate frame ratio ${(summary.duplicateFrameRatio * 100).toFixed(1)}% > ${(maxDuplicateFrameRatio * 100).toFixed(1)}%`
    );

  return {
    gateId: 'temporal-quality',
    passed,
    severity: 'warning',
    fix: passed ? 'none' : 'regenerate-video',
    message: passed
      ? `Temporal quality OK (flicker ${summary.flicker.score.toFixed(2)}, dup ratio ${(summary.duplicateFrameRatio * 100).toFixed(1)}%)`
      : `Temporal quality issues: ${issues.join('; ')}`,
    details: {
      flickerScore: summary.flicker.score,
      flickerVariance: summary.flicker.variance,
      duplicateFrameRatio: summary.duplicateFrameRatio,
      framesAnalyzed: summary.framesAnalyzed,
      flickerMin,
      maxDuplicateFrameRatio,
    },
  };
}

function parseTemporalJson(data: unknown): TemporalQualitySummary {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid temporal quality JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const flicker = obj['flicker'] as Record<string, unknown> | undefined;
  const duplicateFrameRatio = obj['duplicateFrameRatio'];
  const framesAnalyzed = obj['framesAnalyzed'];

  if (!flicker || typeof flicker !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid temporal quality JSON (missing flicker)');
  }

  const score = Number(flicker['score']);
  const variance = Number(flicker['variance']);
  const meanDiff = Number(flicker['meanDiff']);
  const dupRatio = Number(duplicateFrameRatio);
  const frames = Number(framesAnalyzed);

  if (![score, variance, meanDiff, dupRatio, frames].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid temporal quality JSON (non-numeric fields)');
  }

  return {
    flicker: { score, variance, meanDiff },
    duplicateFrameRatio: dupRatio,
    framesAnalyzed: frames,
  };
}

/** Analyzes temporal quality metrics (flicker, duplicate frames) for a video using a Python backend. */
export class TemporalAnalyzer implements TemporalQualityAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath =
      options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'temporal_quality.py');
    this.timeoutMs = options?.timeoutMs ?? 300_000;
  }

  async analyze(
    videoPath: string,
    options?: { sampleRate?: number }
  ): Promise<TemporalQualitySummary> {
    const sampleRate = options?.sampleRate ?? 1;
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--video', videoPath, '--sample-rate', String(sampleRate)],
      timeoutMs: this.timeoutMs,
    });
    return parseTemporalJson(data);
  }
}
