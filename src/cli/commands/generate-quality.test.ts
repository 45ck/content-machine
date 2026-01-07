import { describe, expect, it, vi } from 'vitest';
import type { PipelineResult } from '../../core/pipeline';
import type { SyncRatingOutput } from '../../score/sync-schema';
import {
  runGenerateWithSyncQualityGate,
  type SyncAttemptSettings,
  type SyncQualityGateConfig,
} from './generate-quality';

function stubPipelineResult(outputPath: string): PipelineResult {
  return {
    script: {
      schemaVersion: '1.0.0',
      reasoning: 'stub',
      scenes: [],
    } as unknown as PipelineResult['script'],
    audio: {
      schemaVersion: '1.0.0',
      audioPath: 'audio.wav',
      timestamps: { scenes: [], allWords: [], totalDuration: 0 },
    } as unknown as PipelineResult['audio'],
    visuals: {
      schemaVersion: '1.1.0',
      scenes: [],
      totalAssets: 0,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 0,
    } as unknown as PipelineResult['visuals'],
    render: {
      schemaVersion: '1.0.0',
      outputPath,
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 1,
      codec: 'h264',
    } as unknown as PipelineResult['render'],
    outputPath,
    duration: 1,
    width: 1080,
    height: 1920,
    fileSize: 1,
  };
}

function stubRating(passed: boolean): SyncRatingOutput {
  return {
    schemaVersion: '1.0.0',
    videoPath: 'video.mp4',
    rating: passed ? 90 : 50,
    ratingLabel: passed ? 'excellent' : 'poor',
    passed,
    metrics: {
      meanDriftMs: 120,
      maxDriftMs: 140,
      p95DriftMs: 135,
      medianDriftMs: 120,
      meanSignedDriftMs: 120,
      leadingRatio: 0,
      laggingRatio: 1,
      driftStdDev: 10,
      matchedWords: 7,
      totalOcrWords: 7,
      totalAsrWords: 7,
      matchRatio: 1,
    },
    wordMatches: [],
    driftTimeline: [],
    errors: [],
    analysis: {
      ocrEngine: 'mock',
      asrEngine: 'mock',
      framesAnalyzed: 10,
      analysisTimeMs: 10,
    },
    createdAt: new Date().toISOString(),
  } as unknown as SyncRatingOutput;
}

describe('runGenerateWithSyncQualityGate', () => {
  const initial: SyncAttemptSettings = {
    pipelineMode: 'standard',
    reconcile: false,
    whisperModel: 'base',
  };

  it('runs once and does not rate when disabled', async () => {
    const runAttempt = vi.fn(async () => stubPipelineResult('video-1.mp4'));
    const rate = vi.fn(async () => stubRating(true));

    const config: SyncQualityGateConfig = { enabled: false, autoRetry: false, maxRetries: 0 };
    const result = await runGenerateWithSyncQualityGate({
      initialSettings: initial,
      config,
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(rate).not.toHaveBeenCalled();
    expect(result.attempts).toBe(1);
    expect(result.rating).toBeUndefined();
    expect(result.finalSettings.pipelineMode).toBe('standard');
  });

  it('rates once and returns rating when enabled and passed', async () => {
    const runAttempt = vi.fn(async () => stubPipelineResult('video-1.mp4'));
    const rate = vi.fn(async () => stubRating(true));

    const config: SyncQualityGateConfig = { enabled: true, autoRetry: false, maxRetries: 0 };
    const result = await runGenerateWithSyncQualityGate({
      initialSettings: initial,
      config,
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(rate).toHaveBeenCalledTimes(1);
    expect(result.attempts).toBe(1);
    expect(result.rating?.passed).toBe(true);
  });

  it('returns failed rating when enabled and auto-retry disabled', async () => {
    const runAttempt = vi.fn(async () => stubPipelineResult('video-1.mp4'));
    const rate = vi.fn(async () => stubRating(false));

    const config: SyncQualityGateConfig = { enabled: true, autoRetry: false, maxRetries: 0 };
    const result = await runGenerateWithSyncQualityGate({
      initialSettings: initial,
      config,
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(rate).toHaveBeenCalledTimes(1);
    expect(result.attempts).toBe(1);
    expect(result.rating?.passed).toBe(false);
  });

  it('retries once with audio-first when auto-retry enabled and first attempt fails', async () => {
    const runAttempt = vi.fn(async (_settings: SyncAttemptSettings) =>
      stubPipelineResult('video.mp4')
    );
    const rate = vi.fn(async () => stubRating(false));

    const config: SyncQualityGateConfig = { enabled: true, autoRetry: true, maxRetries: 1 };
    const result = await runGenerateWithSyncQualityGate({
      initialSettings: initial,
      config,
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(2);
    expect(runAttempt).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ pipelineMode: 'standard' })
    );
    expect(runAttempt).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ pipelineMode: 'audio-first' })
    );
    expect(rate).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
    expect(result.finalSettings.pipelineMode).toBe('audio-first');
    expect(result.rating?.passed).toBe(false);
  });

  it('stops retrying when a retry passes', async () => {
    const runAttempt = vi.fn(async (_settings: SyncAttemptSettings) =>
      stubPipelineResult('video.mp4')
    );
    const rate = vi.fn(async () => stubRating(true));
    rate.mockResolvedValueOnce(stubRating(false));

    const config: SyncQualityGateConfig = { enabled: true, autoRetry: true, maxRetries: 2 };
    const result = await runGenerateWithSyncQualityGate({
      initialSettings: initial,
      config,
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(2);
    expect(rate).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
    expect(result.rating?.passed).toBe(true);
  });
});
