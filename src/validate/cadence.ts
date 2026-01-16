import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { CadenceGateResult } from '../domain';
import { CMError } from '../core/errors';
import type { VideoInfo } from './video-info';
import { detectSceneCutsWithPySceneDetect } from './scene-detect';

const execFileAsync = promisify(execFile);

export interface CadenceEvaluation {
  passed: boolean;
  cutCount: number;
  medianCutIntervalSeconds: number;
  maxMedianCutIntervalSeconds: number;
}

function median(values: number[]): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function evaluateCadence(params: {
  durationSeconds: number;
  cutTimesSeconds: number[];
  maxMedianCutIntervalSeconds: number;
}): CadenceEvaluation {
  const cutTimes = [...params.cutTimesSeconds].filter((t) => Number.isFinite(t) && t >= 0);
  cutTimes.sort((a, b) => a - b);

  const intervals: number[] = [];
  let prev = 0;
  for (const t of cutTimes) {
    if (t > prev) intervals.push(t - prev);
    prev = t;
  }
  if (params.durationSeconds > prev) {
    intervals.push(params.durationSeconds - prev);
  }

  const med = median(intervals);
  const passed = Number.isFinite(med) && med <= params.maxMedianCutIntervalSeconds;

  return {
    passed,
    cutCount: cutTimes.length,
    medianCutIntervalSeconds: Number.isFinite(med) ? med : params.durationSeconds,
    maxMedianCutIntervalSeconds: params.maxMedianCutIntervalSeconds,
  };
}

export async function detectSceneCutsWithFfmpeg(params: {
  videoPath: string;
  threshold?: number;
  timeoutMs?: number;
}): Promise<number[]> {
  const threshold = params.threshold ?? 0.3;
  const timeoutMs = params.timeoutMs ?? 30_000;

  try {
    const { stderr } = await execFileAsync(
      'ffmpeg',
      [
        '-hide_banner',
        '-i',
        params.videoPath,
        '-vf',
        `select='gt(scene\\,${threshold})',showinfo`,
        '-f',
        'null',
        '-',
      ],
      { windowsHide: true, timeout: timeoutMs }
    );

    const cutTimes: number[] = [];
    const re = /pts_time:([0-9.]+)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(stderr)) !== null) {
      const t = Number(match[1]);
      if (Number.isFinite(t)) cutTimes.push(t);
    }
    return cutTimes;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', 'ffmpeg is required for cadence detection', {
        binary: 'ffmpeg',
      });
    }
    throw new CMError(
      'VALIDATION_ERROR',
      `Cadence detection failed: ${error instanceof Error ? error.message : String(error)}`,
      { videoPath: params.videoPath }
    );
  }
}

export async function runCadenceGate(
  info: VideoInfo,
  options?: {
    maxMedianCutIntervalSeconds?: number;
    threshold?: number;
    engine?: 'ffmpeg' | 'pyscenedetect';
    pythonPath?: string;
  }
): Promise<CadenceGateResult> {
  const maxMedian = options?.maxMedianCutIntervalSeconds ?? 3;
  const engine = options?.engine ?? 'ffmpeg';
  const cutTimes =
    engine === 'pyscenedetect'
      ? await detectSceneCutsWithPySceneDetect({
          videoPath: info.path,
          pythonPath: options?.pythonPath,
          threshold: options?.threshold,
        })
      : await detectSceneCutsWithFfmpeg({
          videoPath: info.path,
          threshold: options?.threshold,
        });
  const evaluation = evaluateCadence({
    durationSeconds: info.durationSeconds,
    cutTimesSeconds: cutTimes,
    maxMedianCutIntervalSeconds: maxMedian,
  });

  return {
    gateId: 'cadence',
    passed: evaluation.passed,
    severity: 'warning',
    fix: evaluation.passed ? 'none' : 'increase-cut-frequency',
    message: evaluation.passed
      ? `Cadence OK (median cut interval ${evaluation.medianCutIntervalSeconds.toFixed(2)}s)`
      : `Cadence too slow (median cut interval ${evaluation.medianCutIntervalSeconds.toFixed(
          2
        )}s > ${evaluation.maxMedianCutIntervalSeconds}s)`,
    details: {
      cutCount: evaluation.cutCount,
      medianCutIntervalSeconds: evaluation.medianCutIntervalSeconds,
      maxMedianCutIntervalSeconds: evaluation.maxMedianCutIntervalSeconds,
    },
  };
}
