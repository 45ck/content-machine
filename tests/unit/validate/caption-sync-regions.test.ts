import { beforeEach, describe, expect, it, vi } from 'vitest';

const rateCaptionQualityMock = vi.fn();

vi.mock('../../../src/score', () => ({
  rateCaptionQuality: rateCaptionQualityMock,
}));

function makeExpectedCaptions() {
  return {
    schemaVersion: '1.0.0' as const,
    captions: [],
    segments: [
      {
        text: 'My roommate staged fake work calls',
        startMs: 0,
        endMs: 1800,
        timestampMs: 0,
        confidence: 0.9,
        words: [],
      },
      {
        text: 'So I rebuilt the set overnight',
        startMs: 1900,
        endMs: 3600,
        timestampMs: 1900,
        confidence: 0.9,
        words: [],
      },
    ],
    quality: {
      passed: true,
      score: 0.9,
      thresholds: {
        maxCharsPerSecond: 18,
        minSegmentMs: 700,
        maxWordsPerSegment: 7,
        minConfidence: 0.5,
      },
      summary: {
        segmentCount: 2,
        maxCharsPerSecond: 12,
        shortestSegmentMs: 1700,
        maxWordsPerSegment: 6,
        lowConfidenceCount: 0,
      },
      issues: [],
    },
  };
}

function makeObserved(params: {
  score: number;
  meanConfidence: number;
  segments: Array<{
    text: string;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    wordCount: number;
    lineCount: number;
    maxCharsPerLine: number;
    meanConfidence: number;
  }>;
  captionRegion: { yRatio: number; heightRatio: number };
}) {
  return {
    schemaVersion: '1.0.0' as const,
    videoPath: '/tmp/video.mp4',
    captionQuality: {
      thresholds: {
        safeMarginRatio: 0.05,
        idealReadingSpeedWps: { min: 2, max: 4 },
        absoluteReadingSpeedWps: { min: 1, max: 7 },
        recommendedCaptionDurationSeconds: { min: 1, max: 7 },
        flashDurationSecondsMax: 0.5,
        density: { maxLines: 3, maxCharsPerLine: 45 },
        capitalization: { allCapsRatioMin: 0.8 },
        alignment: { idealCenterXRatio: 0.5, maxMeanAbsCenterDxRatio: 0.1 },
        placement: { maxStddevCenterXRatio: 0.02, maxStddevCenterYRatio: 0.02 },
        jitter: { maxMeanCenterDeltaPx: 10, maxP95CenterDeltaPx: 40 },
        style: { maxBboxHeightCv: 0.25, maxBboxAreaCv: 0.4 },
        pass: { minOverall: 0.75, minCoverageRatio: 0.6, maxFlickerEvents: 1 },
      },
      weights: {
        rhythm: 0.12,
        displayTime: 0.08,
        coverage: 0.12,
        safeArea: 0.1,
        density: 0.06,
        punctuation: 0.04,
        capitalization: 0.03,
        alignment: 0.06,
        placement: 0.06,
        jitter: 0.08,
        style: 0.05,
        redundancy: 0.05,
        segmentation: 0.06,
        ocrConfidence: 0.09,
      },
      overall: {
        score: params.score,
        passed: params.score >= 0.75,
      },
      segments: params.segments.map((segment) => ({
        ...segment,
        normalizedText: segment.text.toLowerCase(),
      })),
      rhythm: { meanWps: 3, stddevWps: 0.3, outOfIdealRangeCount: 0, outOfAbsoluteRangeCount: 0, score: params.score },
      displayTime: { minDurationSeconds: 1.2, maxDurationSeconds: 1.8, flashSegmentCount: 0, outOfRecommendedRangeCount: 0, score: params.score },
      coverage: { captionedSeconds: 3.4, coverageRatio: 0.9, score: params.score },
      density: { maxLines: 1, maxCharsPerLine: 36, lineOverflowCount: 0, charOverflowCount: 0, score: params.score },
      punctuation: { missingTerminalPunctuationCount: 0, repeatedPunctuationCount: 0, score: params.score },
      capitalization: { style: 'sentence_case' as const, inconsistentStyleCount: 0, score: params.score },
      ocrConfidence: { mean: params.meanConfidence, min: params.meanConfidence, stddev: 0.05, score: params.score },
      safeArea: { violationCount: 0, minMarginRatio: 0.08, score: params.score },
      flicker: { flickerEvents: 0, score: params.score },
      alignment: { meanAbsCenterDxRatio: 0.01, maxAbsCenterDxRatio: 0.02, score: params.score },
      placement: { stddevCenterXRatio: 0.01, stddevCenterYRatio: 0.01, score: params.score },
      jitter: { meanCenterDeltaPx: 1, p95CenterDeltaPx: 3, score: params.score },
      style: { bboxHeightCv: 0.1, bboxAreaCv: 0.1, score: params.score },
      redundancy: { reappearanceEvents: 0, adjacentOverlapEvents: 0, score: params.score },
      segmentation: { danglingConjunctionCount: 0, midSentenceBreakCount: 0, score: params.score },
    },
    errors: [],
    analysis: {
      ocrEngine: 'tesseract' as const,
      fps: 3,
      framesAnalyzed: 12,
      analysisTimeMs: 300,
      captionFrameSize: { width: 1080, height: Math.round(1920 * params.captionRegion.heightRatio) },
      videoFrameSize: { width: 1080, height: 1920 },
      captionCropOffsetY: Math.round(1920 * params.captionRegion.yRatio),
      captionRegion: params.captionRegion,
    },
    createdAt: '2026-04-26T00:00:00.000Z',
  };
}

describe('analyzeRenderedCaptionSync', () => {
  beforeEach(() => {
    rateCaptionQualityMock.mockReset();
  });

  it('retries with a center-band OCR region when the default bottom crop reads garbage', async () => {
    rateCaptionQualityMock
      .mockResolvedValueOnce(
        makeObserved({
          score: 0.32,
          meanConfidence: 0.28,
          captionRegion: { yRatio: 0.65, heightRatio: 0.35 },
          segments: [
            {
              text: 'PE AY BN =',
              startSeconds: 1.0,
              endSeconds: 1.5,
              durationSeconds: 0.5,
              wordCount: 3,
              lineCount: 1,
              maxCharsPerLine: 10,
              meanConfidence: 0.28,
            },
          ],
        })
      )
      .mockResolvedValueOnce(
        makeObserved({
          score: 0.9,
          meanConfidence: 0.87,
          captionRegion: { yRatio: 0.42, heightRatio: 0.16 },
          segments: [
            {
              text: 'My roommate staged fake work calls',
              startSeconds: 0.02,
              endSeconds: 1.8,
              durationSeconds: 1.78,
              wordCount: 5,
              lineCount: 1,
              maxCharsPerLine: 34,
              meanConfidence: 0.87,
            },
            {
              text: 'So I rebuilt the set overnight',
              startSeconds: 1.92,
              endSeconds: 3.6,
              durationSeconds: 1.68,
              wordCount: 6,
              lineCount: 1,
              maxCharsPerLine: 31,
              meanConfidence: 0.87,
            },
          ],
        })
      );

    const { analyzeRenderedCaptionSync } = await import('../../../src/validate/caption-sync');
    const report = await analyzeRenderedCaptionSync({
      videoPath: '/tmp/video.mp4',
      expected: makeExpectedCaptions(),
    });

    expect(report.passed).toBe(true);
    expect(report.segmentMatchRatio).toBe(1);
    expect(rateCaptionQualityMock).toHaveBeenCalledTimes(2);
    expect(rateCaptionQualityMock).toHaveBeenLastCalledWith(
      '/tmp/video.mp4',
      expect.objectContaining({
        captionRegion: { yRatio: 0.42, heightRatio: 0.16 },
      })
    );
  });
});
