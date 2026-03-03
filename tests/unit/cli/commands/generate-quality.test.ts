import { describe, expect, it, vi } from 'vitest';
import type { PipelineResult } from '../../../../src/core/pipeline';
import type { SyncRatingOutput } from '../../../../src/score/sync-schema';
import { runGenerateWithSyncQualityGate } from '../../../../src/cli/commands/generate-quality';

const basePipelineResult = {
  script: {} as PipelineResult['script'],
  audio: {} as PipelineResult['audio'],
  visuals: {} as PipelineResult['visuals'],
  render: {} as PipelineResult['render'],
  outputPath: 'video.mp4',
  duration: 10,
  width: 1080,
  height: 1920,
  fileSize: 1234,
} satisfies PipelineResult;

const passRating = {
  schemaVersion: '1.0.0',
  videoPath: 'video.mp4',
  rating: 90,
  ratingLabel: 'excellent',
  passed: true,
  metrics: { meanDriftMs: 50, maxDriftMs: 80, matchRatio: 0.95 },
  wordMatches: [],
  driftTimeline: [],
  errors: [],
  analysis: { ocrEngine: 'tesseract', asrEngine: 'whisper', framesAnalyzed: 5, analysisTimeMs: 10 },
  createdAt: new Date().toISOString(),
} satisfies SyncRatingOutput;

const failRating = {
  ...passRating,
  rating: 40,
  ratingLabel: 'poor',
  passed: false,
} satisfies SyncRatingOutput;

describe('runGenerateWithSyncQualityGate', () => {
  it('returns early when quality gate disabled', async () => {
    const runAttempt = vi.fn().mockResolvedValue(basePipelineResult);
    const rate = vi.fn().mockResolvedValue(passRating);

    const result = await runGenerateWithSyncQualityGate({
      initialSettings: { pipelineMode: 'standard', reconcile: false },
      config: { enabled: false, autoRetry: true, maxRetries: 2 },
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(1);
    expect(rate).not.toHaveBeenCalled();
    expect(result.attempts).toBe(1);
    expect(result.rating).toBeUndefined();
  });

  it('returns after first passing rating', async () => {
    const runAttempt = vi.fn().mockResolvedValue(basePipelineResult);
    const rate = vi.fn().mockResolvedValue(passRating);

    const result = await runGenerateWithSyncQualityGate({
      initialSettings: { pipelineMode: 'audio-first', reconcile: true, whisperModel: 'base' },
      config: { enabled: true, autoRetry: false, maxRetries: 0 },
      runAttempt,
      rate,
    });

    expect(result.rating?.passed).toBe(true);
    expect(result.attempts).toBe(1);
  });

  it('returns after first failure when auto-retry disabled', async () => {
    const runAttempt = vi.fn().mockResolvedValue(basePipelineResult);
    const rate = vi.fn().mockResolvedValue(failRating);

    const result = await runGenerateWithSyncQualityGate({
      initialSettings: { pipelineMode: 'audio-first', reconcile: true, whisperModel: 'base' },
      config: { enabled: true, autoRetry: false, maxRetries: 0 },
      runAttempt,
      rate,
    });

    expect(result.rating?.passed).toBe(false);
    expect(result.attempts).toBe(1);
    expect(result.finalSettings.reconcile).toBe(true);
  });

  it('retries with audio-first after standard failure', async () => {
    const runAttempt = vi.fn().mockResolvedValue(basePipelineResult);
    const rate = vi.fn().mockResolvedValueOnce(failRating).mockResolvedValueOnce(passRating);

    const result = await runGenerateWithSyncQualityGate({
      initialSettings: { pipelineMode: 'standard', reconcile: false },
      config: { enabled: true, autoRetry: true, maxRetries: 1 },
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
    expect(result.finalSettings.pipelineMode).toBe('audio-first');
    expect(result.finalSettings.reconcile).toBe(true);
  });

  it('stops retrying when whisper model ladder ends', async () => {
    const runAttempt = vi.fn().mockResolvedValue(basePipelineResult);
    const rate = vi.fn().mockResolvedValue(failRating);

    const result = await runGenerateWithSyncQualityGate({
      initialSettings: { pipelineMode: 'audio-first', reconcile: true, whisperModel: 'medium' },
      config: { enabled: true, autoRetry: true, maxRetries: 1 },
      runAttempt,
      rate,
    });

    expect(result.attempts).toBe(1);
    expect(result.finalSettings.whisperModel).toBe('medium');
  });

  it('returns last attempt when retries exhausted mid-ladder', async () => {
    const runAttempt = vi.fn().mockResolvedValue(basePipelineResult);
    const rate = vi.fn().mockResolvedValue(failRating);

    const result = await runGenerateWithSyncQualityGate({
      initialSettings: { pipelineMode: 'audio-first', reconcile: true, whisperModel: 'tiny' },
      config: { enabled: true, autoRetry: true, maxRetries: 1 },
      runAttempt,
      rate,
    });

    expect(runAttempt).toHaveBeenCalledTimes(2);
    expect(result.attempts).toBe(2);
    expect(result.finalSettings.whisperModel).toBe('small');
    expect(result.rating?.passed).toBe(false);
  });
});
