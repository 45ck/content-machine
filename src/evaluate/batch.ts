import { evaluateVideo, type EvaluateVideoOptions } from './evaluator';
import type { BatchReport, EvaluationThresholds, EvaluationMode } from '../domain';

export interface BatchConfig {
  videos: Array<{
    videoPath: string;
    scriptPath?: string;
  }>;
  profile: 'portrait' | 'landscape';
  thresholds: EvaluationThresholds;
  mode?: EvaluationMode;
  checks: EvaluateVideoOptions['checks'];
  fps?: number;
}

/** Evaluates a batch of videos sequentially and returns an aggregated report. */
export async function evaluateBatch(config: BatchConfig): Promise<BatchReport> {
  const startTime = Date.now();
  const reports = [];

  for (const video of config.videos) {
    try {
      const report = await evaluateVideo({
        videoPath: video.videoPath,
        scriptPath: video.scriptPath,
        profile: config.profile,
        thresholds: config.thresholds,
        mode: config.mode,
        checks: config.checks,
        fps: config.fps,
      });
      reports.push(report);
    } catch {
      reports.push({
        schemaVersion: '1.0.0' as const,
        videoPath: video.videoPath,
        passed: false,
        checks: [],
        thresholds: config.thresholds,
        totalDurationMs: 0,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return {
    schemaVersion: '1.0.0',
    reports,
    totalPassed: reports.filter((r) => r.passed).length,
    totalFailed: reports.filter((r) => !r.passed).length,
    totalDurationMs: Date.now() - startTime,
    createdAt: new Date().toISOString(),
  };
}
