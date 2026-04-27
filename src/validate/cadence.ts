import { execFile } from 'node:child_process';
import type { CadenceGateResult } from '../domain';
import { CMError } from '../core/errors';
import type { VideoInfo } from './video-info';
import { detectSceneCutsWithPySceneDetect } from './scene-detect';

function execFileWithOutput(
  cmd: string,
  args: string[],
  options: { windowsHide: boolean; timeout: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout: String(stdout ?? ''), stderr: String(stderr ?? '') });
    });
  });
}

export interface CadenceEvaluation {
  passed: boolean;
  cutCount: number;
  medianCutIntervalSeconds: number;
  maxMedianCutIntervalSeconds: number;
}

function buildAdaptiveThresholds(baseThreshold?: number): number[] {
  const candidates = [baseThreshold ?? 0.3, 0.2, 0.15, 0.1, 0.08];
  const unique: number[] = [];

  for (const value of candidates) {
    if (!Number.isFinite(value) || value <= 0) continue;
    if (!unique.some((existing) => Math.abs(existing - value) < 0.0001)) {
      unique.push(value);
    }
  }

  return unique;
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
  minCutCount?: number;
}): CadenceEvaluation {
  const cutTimes = [...params.cutTimesSeconds].filter((t) => Number.isFinite(t) && t >= 0);
  cutTimes.sort((a, b) => a - b);
  const minCutCount = params.minCutCount ?? 2;

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
  const cutCount = cutTimes.length;
  const passed =
    cutCount >= minCutCount && Number.isFinite(med) && med <= params.maxMedianCutIntervalSeconds;

  return {
    passed,
    cutCount,
    medianCutIntervalSeconds: Number.isFinite(med) ? med : params.durationSeconds,
    maxMedianCutIntervalSeconds: params.maxMedianCutIntervalSeconds,
  };
}

export async function detectSceneCutsWithFfmpeg(params: {
  videoPath: string;
  threshold?: number;
  timeoutMs?: number;
  cropFilter?: string;
}): Promise<number[]> {
  const threshold = params.threshold ?? 0.3;
  const timeoutMs = params.timeoutMs ?? 30_000;
  const filter = params.cropFilter
    ? `${params.cropFilter},select='gt(scene\\,${threshold})',showinfo`
    : `select='gt(scene\\,${threshold})',showinfo`;

  try {
    const { stderr } = await execFileWithOutput(
      'ffmpeg',
      [
        '-hide_banner',
        '-i',
        params.videoPath,
        '-vf',
        filter,
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
    minCutCount?: number;
    threshold?: number;
    engine?: 'ffmpeg' | 'pyscenedetect';
    pythonPath?: string;
  }
): Promise<CadenceGateResult> {
  const maxMedian = options?.maxMedianCutIntervalSeconds ?? 3;
  const minCutCount = options?.minCutCount ?? 2;
  const engine = options?.engine ?? 'ffmpeg';
  const evaluations: CadenceEvaluation[] = [];

  if (engine === 'pyscenedetect') {
    const cutTimes = await detectSceneCutsWithPySceneDetect({
      videoPath: info.path,
      pythonPath: options?.pythonPath,
      threshold: options?.threshold,
    });
    evaluations.push(
      evaluateCadence({
        durationSeconds: info.durationSeconds,
        cutTimesSeconds: cutTimes,
        maxMedianCutIntervalSeconds: maxMedian,
        minCutCount,
      })
    );
  } else {
    const thresholds = buildAdaptiveThresholds(options?.threshold);

    for (const threshold of thresholds) {
      const fullFrameCuts = await detectSceneCutsWithFfmpeg({
        videoPath: info.path,
        threshold,
      });
      const evaluation = evaluateCadence({
        durationSeconds: info.durationSeconds,
        cutTimesSeconds: fullFrameCuts,
        maxMedianCutIntervalSeconds: maxMedian,
        minCutCount,
      });
      evaluations.push(evaluation);
      if (evaluation.passed || evaluation.cutCount >= minCutCount) {
        break;
      }
    }

    const bestFullFrame = evaluations.reduce((best, candidate) => {
      if (candidate.passed !== best.passed) {
        return candidate.passed ? candidate : best;
      }
      if (candidate.cutCount !== best.cutCount) {
        return candidate.cutCount > best.cutCount ? candidate : best;
      }
      return candidate.medianCutIntervalSeconds < best.medianCutIntervalSeconds
        ? candidate
        : best;
    });

    if (bestFullFrame.cutCount < minCutCount) {
      const halfHeight = `floor(ih/2)`;
      for (const threshold of thresholds) {
        const [topCuts, bottomCuts] = await Promise.all([
          detectSceneCutsWithFfmpeg({
            videoPath: info.path,
            threshold,
            cropFilter: `crop=iw:${halfHeight}:0:0`,
          }),
          detectSceneCutsWithFfmpeg({
            videoPath: info.path,
            threshold,
            cropFilter: `crop=iw:${halfHeight}:0:${halfHeight}`,
          }),
        ]);

        const topEvaluation = evaluateCadence({
          durationSeconds: info.durationSeconds,
          cutTimesSeconds: topCuts,
          maxMedianCutIntervalSeconds: maxMedian,
          minCutCount,
        });
        const bottomEvaluation = evaluateCadence({
          durationSeconds: info.durationSeconds,
          cutTimesSeconds: bottomCuts,
          maxMedianCutIntervalSeconds: maxMedian,
          minCutCount,
        });
        evaluations.push(topEvaluation, bottomEvaluation);

        if (
          topEvaluation.passed ||
          bottomEvaluation.passed ||
          topEvaluation.cutCount >= minCutCount ||
          bottomEvaluation.cutCount >= minCutCount
        ) {
          break;
        }
      }
    }
  }

  const evaluation = evaluations.reduce((best, candidate) => {
    if (candidate.passed !== best.passed) {
      return candidate.passed ? candidate : best;
    }
    if (candidate.cutCount !== best.cutCount) {
      return candidate.cutCount > best.cutCount ? candidate : best;
    }
    return candidate.medianCutIntervalSeconds < best.medianCutIntervalSeconds ? candidate : best;
  });
  const tooStatic = evaluation.cutCount < minCutCount;

  return {
    gateId: 'cadence',
    passed: evaluation.passed,
    severity: evaluation.passed ? 'warning' : 'error',
    fix: evaluation.passed ? 'none' : 'increase-cut-frequency',
    message: evaluation.passed
      ? `Cadence OK (median cut interval ${evaluation.medianCutIntervalSeconds.toFixed(2)}s)`
      : tooStatic
        ? `Cadence too static (only ${evaluation.cutCount} cuts; needs at least ${minCutCount} to avoid a single-scene/default-background edit)`
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
