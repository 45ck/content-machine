import type { ValidateProfile } from './profiles';
import type { VisualQualityGateResult } from '../domain';
import { CMError } from '../core/errors';
import { resolve } from 'node:path';
import { runPythonJson } from './python-json';

export interface VideoQualitySummary {
  brisque: { mean: number; min: number; max: number };
  niqe?: { mean: number; min: number; max: number };
  cambi?: { mean: number; max: number };
  framesAnalyzed: number;
}

export interface VideoQualityAnalyzer {
  analyze(videoPath: string, options?: { sampleRate?: number }): Promise<VideoQualitySummary>;
}

/** Runs the visual quality gate using BRISQUE, NIQE, and CAMBI metrics against profile thresholds. */
export function runVisualQualityGate(
  summary: VideoQualitySummary,
  profile: ValidateProfile
): VisualQualityGateResult {
  if (profile.brisqueMax === undefined) {
    throw new CMError('VALIDATION_ERROR', 'BRISQUE threshold is not configured for this profile', {
      profile: profile.id,
    });
  }

  const brisquePassed = summary.brisque.mean < profile.brisqueMax;

  const issues: string[] = [];
  if (!brisquePassed) {
    issues.push(`BRISQUE mean ${summary.brisque.mean.toFixed(2)} >= ${profile.brisqueMax}`);
  }

  // NIQE check (optional — only fail if threshold is set and data is available)
  if (summary.niqe && profile.niqeMax !== undefined && summary.niqe.mean >= profile.niqeMax) {
    issues.push(`NIQE mean ${summary.niqe.mean.toFixed(2)} >= ${profile.niqeMax}`);
  }

  // CAMBI check (optional — only fail if threshold is set and data is available)
  if (summary.cambi && profile.cambiMax !== undefined && summary.cambi.mean >= profile.cambiMax) {
    issues.push(`CAMBI mean ${summary.cambi.mean.toFixed(2)} >= ${profile.cambiMax}`);
  }

  const passed = issues.length === 0;

  return {
    gateId: 'visual-quality',
    passed,
    severity: 'error',
    fix: passed ? 'none' : 'reduce-compression',
    message: passed
      ? `Visual quality OK (BRISQUE mean ${summary.brisque.mean.toFixed(2)} < ${profile.brisqueMax})`
      : `Visual quality low: ${issues.join('; ')}`,
    details: {
      brisqueMax: profile.brisqueMax,
      mean: summary.brisque.mean,
      min: summary.brisque.min,
      max: summary.brisque.max,
      framesAnalyzed: summary.framesAnalyzed,
      ...(summary.niqe ? { niqe: summary.niqe } : {}),
      ...(summary.cambi ? { cambi: summary.cambi } : {}),
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

  const result: VideoQualitySummary = {
    brisque: { mean, min, max },
    framesAnalyzed: frames,
  };

  // Parse optional NIQE
  const niqeObj = obj['niqe'] as Record<string, unknown> | undefined;
  if (niqeObj && typeof niqeObj === 'object') {
    const nMean = Number(niqeObj['mean']);
    const nMin = Number(niqeObj['min']);
    const nMax = Number(niqeObj['max']);
    if ([nMean, nMin, nMax].every((n) => Number.isFinite(n))) {
      result.niqe = { mean: nMean, min: nMin, max: nMax };
    }
  }

  // Parse optional CAMBI
  const cambiObj = obj['cambi'] as Record<string, unknown> | undefined;
  if (cambiObj && typeof cambiObj === 'object') {
    const cMean = Number(cambiObj['mean']);
    const cMax = Number(cambiObj['max']);
    if ([cMean, cMax].every((n) => Number.isFinite(n))) {
      result.cambi = { mean: cMean, max: cMax };
    }
  }

  return result;
}

/** Analyzes per-frame visual quality metrics (BRISQUE, NIQE, CAMBI) using a Python backend. */
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
