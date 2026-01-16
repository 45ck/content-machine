import type { ValidateProfile } from './profiles';
import type { VisualQualityGateResult } from '../domain';
import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from './python-json';

export interface VideoQualitySummary {
  brisque: { mean: number; min: number; max: number };
  framesAnalyzed: number;
}

export interface VideoQualityAnalyzer {
  analyze(videoPath: string, options?: { sampleRate?: number }): Promise<VideoQualitySummary>;
}

export function runVisualQualityGate(
  summary: VideoQualitySummary,
  profile: ValidateProfile
): VisualQualityGateResult {
  if (profile.brisqueMax === undefined) {
    throw new CMError('VALIDATION_ERROR', 'BRISQUE threshold is not configured for this profile', {
      profile: profile.id,
    });
  }

  const passed = summary.brisque.mean < profile.brisqueMax;
  return {
    gateId: 'visual-quality',
    passed,
    severity: 'error',
    fix: passed ? 'none' : 'reduce-compression',
    message: passed
      ? `Visual quality OK (BRISQUE mean ${summary.brisque.mean.toFixed(2)} < ${profile.brisqueMax})`
      : `Visual quality low (BRISQUE mean ${summary.brisque.mean.toFixed(2)} >= ${profile.brisqueMax})`,
    details: {
      brisqueMax: profile.brisqueMax,
      mean: summary.brisque.mean,
      min: summary.brisque.min,
      max: summary.brisque.max,
      framesAnalyzed: summary.framesAnalyzed,
    },
  };
}

function parseQualityJson(data: unknown): VideoQualitySummary {
  if (!data || typeof data !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid quality JSON (not an object)');
  }
  const obj = data as Record<string, unknown>;
  const brisque = obj['brisque'] as Record<string, unknown> | undefined;
  const framesAnalyzed = obj['framesAnalyzed'];

  if (!brisque || typeof brisque !== 'object') {
    throw new CMError('VALIDATION_ERROR', 'Invalid quality JSON (missing brisque)');
  }

  const mean = Number(brisque['mean']);
  const min = Number(brisque['min']);
  const max = Number(brisque['max']);
  const frames = Number(framesAnalyzed);

  if (![mean, min, max, frames].every((n) => Number.isFinite(n))) {
    throw new CMError('VALIDATION_ERROR', 'Invalid quality JSON (non-numeric fields)', {
      mean,
      min,
      max,
      frames,
    });
  }

  return {
    brisque: { mean, min, max },
    framesAnalyzed: frames,
  };
}

export class PiqBrisqueAnalyzer implements VideoQualityAnalyzer {
  readonly pythonPath?: string;
  readonly scriptPath: string;
  readonly timeoutMs: number;

  constructor(options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number }) {
    this.pythonPath = options?.pythonPath;
    this.scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'video_quality.py');
    this.timeoutMs = options?.timeoutMs ?? 120_000;
  }

  async analyze(
    videoPath: string,
    options?: { sampleRate?: number }
  ): Promise<VideoQualitySummary> {
    const sampleRate = options?.sampleRate ?? 30;
    const data = await runPythonJson({
      errorCode: 'VALIDATION_ERROR',
      pythonPath: this.pythonPath,
      scriptPath: this.scriptPath,
      args: ['--video', videoPath, '--sample-rate', String(sampleRate)],
      timeoutMs: this.timeoutMs,
    });
    return parseQualityJson(data);
  }
}
