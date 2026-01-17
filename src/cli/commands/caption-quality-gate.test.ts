import { describe, expect, it, vi } from 'vitest';
import type { PipelineResult } from '../../core/pipeline';
import type { CaptionQualityRatingOutput } from '../../domain';
import { runGenerateWithCaptionQualityGate } from './caption-quality-gate';

function stubPipelineResult(outputPath = 'out.mp4'): PipelineResult {
  return { outputPath } as unknown as PipelineResult;
}

function stubCaptionRating(params: {
  overallScore: number;
  overallPassed: boolean;
  flickerEvents?: number;
  densityScore?: number;
  charOverflowCount?: number;
  lineOverflowCount?: number;
  safeAreaScore?: number;
  ocrMean?: number;
  flashSegmentCount?: number;
}): CaptionQualityRatingOutput {
  return {
    schemaVersion: '1.0.0',
    videoPath: 'out.mp4',
    captionQuality: {
      overall: { score: params.overallScore, passed: params.overallPassed },
      flicker: { flickerEvents: params.flickerEvents ?? 0, score: 1 },
      displayTime: {
        minDurationSeconds: 1.2,
        maxDurationSeconds: 5,
        flashSegmentCount: params.flashSegmentCount ?? 0,
        outOfRecommendedRangeCount: 0,
        score: 1,
      },
      coverage: { captionedSeconds: 5, coverageRatio: 0.95, score: 1 },
      density: {
        maxLines: 2,
        maxCharsPerLine: 25,
        lineOverflowCount: params.lineOverflowCount ?? 0,
        charOverflowCount: params.charOverflowCount ?? 0,
        score: params.densityScore ?? 1,
      },
      punctuation: { missingTerminalPunctuationCount: 0, repeatedPunctuationCount: 0, score: 1 },
      capitalization: { style: 'all_caps', inconsistentStyleCount: 0, score: 1 },
      safeArea: { violationCount: 0, minMarginRatio: 0.1, score: params.safeAreaScore ?? 1 },
      ocrConfidence: { mean: params.ocrMean ?? 0.9, min: 0.8, stddev: 0.02, score: 1 },
      rhythm: {
        meanWps: 2.5,
        stddevWps: 0.5,
        outOfIdealRangeCount: 0,
        outOfAbsoluteRangeCount: 0,
        score: 1,
      },
      alignment: { meanAbsCenterDxRatio: 0.01, maxAbsCenterDxRatio: 0.02, score: 1 },
      placement: { stddevCenterXRatio: 0.01, stddevCenterYRatio: 0.01, score: 1 },
      jitter: { meanCenterDeltaRatio: 0.01, maxCenterDeltaRatio: 0.02, score: 1 },
      style: { maxBboxAreaRatio: 1.01, bboxAreaStdDevRatio: 0.01, score: 1 },
      redundancy: { repeatedSegmentRatio: 0, score: 1 },
      segmentation: { suspiciousSplitsCount: 0, suspiciousMergesCount: 0, score: 1 },
    } as any,
    errors: [],
    analysis: {
      ocrEngine: 'tesseract',
      fps: 2,
      framesAnalyzed: 10,
      analysisTimeMs: 123,
      captionFrameSize: { width: 1080, height: 480 },
      videoFrameSize: { width: 1080, height: 1920 },
      captionCropOffsetY: 1440,
      captionRegion: { yRatio: 0.75, heightRatio: 0.25 },
    },
    createdAt: new Date().toISOString(),
  };
}

describe('runGenerateWithCaptionQualityGate', () => {
  it('returns immediately when initial attempt passes', async () => {
    const rate = vi.fn(async () => stubCaptionRating({ overallScore: 0.9, overallPassed: true }));
    const rerender = vi.fn(async (_settings: unknown) => stubPipelineResult('out.mp4'));

    const result = await runGenerateWithCaptionQualityGate({
      initialPipelineResult: stubPipelineResult('out.mp4'),
      initialSettings: { captionConfigOverrides: {} },
      config: { enabled: true, autoRetry: true, maxRetries: 3, minOverallScore: 0.8 },
      rerender,
      rate,
    });

    expect(result.attempts).toBe(1);
    expect(result.rating?.captionQuality.overall.passed).toBe(true);
    expect(rerender).not.toHaveBeenCalled();
  });

  it('does not retry when autoRetry is disabled', async () => {
    const rate = vi.fn(async () =>
      stubCaptionRating({ overallScore: 0.5, overallPassed: false, flickerEvents: 3 })
    );
    const rerender = vi.fn(async (_settings: unknown) => stubPipelineResult('out.mp4'));

    const result = await runGenerateWithCaptionQualityGate({
      initialPipelineResult: stubPipelineResult('out.mp4'),
      initialSettings: { captionConfigOverrides: {} },
      config: { enabled: true, autoRetry: false, maxRetries: 5, minOverallScore: 0.8 },
      rerender,
      rate,
    });

    expect(result.attempts).toBe(1);
    expect(result.rating?.captionQuality.overall.passed).toBe(false);
    expect(rerender).not.toHaveBeenCalled();
  });

  it('retries and adjusts pacing for flicker/density failures', async () => {
    const rate = vi
      .fn()
      .mockResolvedValueOnce(
        stubCaptionRating({
          overallScore: 0.45,
          overallPassed: false,
          flickerEvents: 2,
          densityScore: 0.7,
          charOverflowCount: 3,
        })
      )
      .mockResolvedValueOnce(stubCaptionRating({ overallScore: 0.85, overallPassed: true }));

    const rerender = vi.fn(async (_settings: unknown) => stubPipelineResult('out.mp4'));

    const result = await runGenerateWithCaptionQualityGate({
      initialPipelineResult: stubPipelineResult('out.mp4'),
      initialSettings: { captionConfigOverrides: {} },
      config: { enabled: true, autoRetry: true, maxRetries: 2, minOverallScore: 0.8 },
      rerender,
      rate,
    });

    expect(result.attempts).toBe(2);
    expect(rerender).toHaveBeenCalledTimes(1);

    const settingsUsed = rerender.mock.calls[0]?.[0];
    expect(settingsUsed).toBeTruthy();
    expect((settingsUsed as any).captionMinOnScreenMs).toBeGreaterThanOrEqual(1400);
    expect((settingsUsed as any).captionMinOnScreenMsShort).toBeGreaterThanOrEqual(1100);
    expect((settingsUsed as any).maxCharsPerLine).toBeLessThanOrEqual(22);
    expect((settingsUsed as any).captionMaxCps).toBeLessThanOrEqual(12);
  });

  it('retries and adjusts safe zone when safe area score is low', async () => {
    const rate = vi
      .fn()
      .mockResolvedValueOnce(
        stubCaptionRating({
          overallScore: 0.4,
          overallPassed: false,
          safeAreaScore: 0.5,
        })
      )
      .mockResolvedValueOnce(stubCaptionRating({ overallScore: 0.85, overallPassed: true }));

    const rerender = vi.fn(async (_settings: unknown) => stubPipelineResult('out.mp4'));

    const result = await runGenerateWithCaptionQualityGate({
      initialPipelineResult: stubPipelineResult('out.mp4'),
      initialSettings: { captionConfigOverrides: {} },
      config: { enabled: true, autoRetry: true, maxRetries: 2, minOverallScore: 0.8 },
      rerender,
      rate,
    });

    expect(result.attempts).toBe(2);
    expect(rerender).toHaveBeenCalledTimes(1);

    const settingsUsed = rerender.mock.calls[0]?.[0];
    expect(settingsUsed).toBeTruthy();
    expect((settingsUsed as any).captionConfigOverrides.safeZone?.enabled).toBe(true);
    expect((settingsUsed as any).captionConfigOverrides.positionOffset?.horizontalPadding).toBe(60);
    expect(
      (settingsUsed as any).captionConfigOverrides.positionOffset?.edgeDistance
    ).toBeGreaterThan(15);
  });
});
