import { describe, expect, it } from 'vitest';
import { compareRenderedCaptions, runCaptionSyncGate } from '../../../src/validate/caption-sync';

function makeExpectedCaptions() {
  return {
    schemaVersion: '1.0.0' as const,
    captions: [],
    segments: [
      {
        text: 'I ruined my sister wedding',
        startMs: 0,
        endMs: 1400,
        timestampMs: 0,
        confidence: 0.9,
        words: [],
      },
      {
        text: 'And somehow she thanked me',
        startMs: 1500,
        endMs: 3000,
        timestampMs: 1500,
        confidence: 0.9,
        words: [],
      },
      {
        text: 'That should not have happened',
        startMs: 3100,
        endMs: 4700,
        timestampMs: 3100,
        confidence: 0.9,
        words: [],
      },
    ],
    quality: {
      passed: true,
      score: 0.92,
      thresholds: {
        maxCharsPerSecond: 18,
        minSegmentMs: 700,
        maxWordsPerSegment: 7,
        minConfidence: 0.5,
      },
      summary: {
        segmentCount: 3,
        maxCharsPerSecond: 10,
        shortestSegmentMs: 1400,
        maxWordsPerSegment: 5,
        lowConfidenceCount: 0,
      },
      issues: [],
    },
  };
}

function makeObserved(overrides?: {
  segments?: Array<{
    text: string;
    startSeconds: number;
    endSeconds: number;
    durationSeconds: number;
    wordCount: number;
    lineCount: number;
    maxCharsPerLine: number;
    meanConfidence: number;
  }>;
  coverageRatio?: number;
  overallScore?: number;
  meanConfidence?: number;
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
        score: overrides?.overallScore ?? 0.9,
        passed: true,
      },
      segments: overrides?.segments ?? [
        {
          text: 'I ruined my sister wedding',
          normalizedText: 'i ruined my sister wedding',
          startSeconds: 0.05,
          endSeconds: 1.45,
          durationSeconds: 1.4,
          wordCount: 5,
          lineCount: 1,
          maxCharsPerLine: 27,
          meanConfidence: 0.9,
        },
        {
          text: 'And somehow she thanked me',
          normalizedText: 'and somehow she thanked me',
          startSeconds: 1.6,
          endSeconds: 3.02,
          durationSeconds: 1.42,
          wordCount: 5,
          lineCount: 1,
          maxCharsPerLine: 27,
          meanConfidence: 0.88,
        },
        {
          text: 'That should not have happened',
          normalizedText: 'that should not have happened',
          startSeconds: 3.2,
          endSeconds: 4.72,
          durationSeconds: 1.52,
          wordCount: 5,
          lineCount: 1,
          maxCharsPerLine: 30,
          meanConfidence: 0.91,
        },
      ],
      rhythm: {
        meanWps: 3.2,
        stddevWps: 0.4,
        outOfIdealRangeCount: 0,
        outOfAbsoluteRangeCount: 0,
        score: 0.9,
      },
      displayTime: {
        minDurationSeconds: 1.4,
        maxDurationSeconds: 1.52,
        flashSegmentCount: 0,
        outOfRecommendedRangeCount: 0,
        score: 0.9,
      },
      coverage: {
        captionedSeconds: 4.3,
        coverageRatio: overrides?.coverageRatio ?? 0.82,
        score: 0.9,
      },
      density: {
        maxLines: 1,
        maxCharsPerLine: 30,
        lineOverflowCount: 0,
        charOverflowCount: 0,
        score: 0.9,
      },
      punctuation: { missingTerminalPunctuationCount: 0, repeatedPunctuationCount: 0, score: 0.9 },
      capitalization: { style: 'sentence_case' as const, inconsistentStyleCount: 0, score: 0.9 },
      ocrConfidence: {
        mean: overrides?.meanConfidence ?? 0.88,
        min: 0.8,
        stddev: 0.05,
        score: 0.9,
      },
      safeArea: { violationCount: 0, minMarginRatio: 0.08, score: 0.9 },
      flicker: { flickerEvents: 0, score: 0.9 },
      alignment: { meanAbsCenterDxRatio: 0.01, maxAbsCenterDxRatio: 0.02, score: 0.9 },
      placement: { stddevCenterXRatio: 0.01, stddevCenterYRatio: 0.01, score: 0.9 },
      jitter: { meanCenterDeltaPx: 1, p95CenterDeltaPx: 3, score: 0.9 },
      style: { bboxHeightCv: 0.1, bboxAreaCv: 0.1, score: 0.9 },
      redundancy: { reappearanceEvents: 0, adjacentOverlapEvents: 0, score: 0.9 },
      segmentation: { danglingConjunctionCount: 0, midSentenceBreakCount: 0, score: 0.9 },
    },
    errors: [],
    analysis: {
      ocrEngine: 'tesseract' as const,
      fps: 3,
      framesAnalyzed: 18,
      analysisTimeMs: 250,
      captionFrameSize: { width: 1080, height: 672 },
      videoFrameSize: { width: 1080, height: 1920 },
      captionCropOffsetY: 1248,
      captionRegion: { yRatio: 0.65, heightRatio: 0.35 },
    },
    createdAt: '2026-04-26T00:00:00.000Z',
  };
}

describe('compareRenderedCaptions', () => {
  it('passes when rendered captions stay close to the expected timing', () => {
    const report = compareRenderedCaptions({
      videoPath: '/tmp/video.mp4',
      expected: makeExpectedCaptions(),
      observed: makeObserved(),
    });

    expect(report.passed).toBe(true);
    expect(report.segmentMatchRatio).toBe(1);
    expect(report.medianStartDriftMs).toBeLessThan(350);
    expect(runCaptionSyncGate(report).passed).toBe(true);
  });

  it('fails when rendered caption timing drifts badly', () => {
    const report = compareRenderedCaptions({
      videoPath: '/tmp/video.mp4',
      expected: makeExpectedCaptions(),
      observed: makeObserved({
        segments: [
          {
            text: 'I ruined my sister wedding',
            normalizedText: 'i ruined my sister wedding',
            startSeconds: 0.95,
            endSeconds: 2.0,
            durationSeconds: 1.05,
            wordCount: 5,
            lineCount: 1,
            maxCharsPerLine: 27,
            meanConfidence: 0.9,
          },
          {
            text: 'And somehow she thanked me',
            normalizedText: 'and somehow she thanked me',
            startSeconds: 2.75,
            endSeconds: 4.05,
            durationSeconds: 1.3,
            wordCount: 5,
            lineCount: 1,
            maxCharsPerLine: 27,
            meanConfidence: 0.88,
          },
        ],
      }),
    });

    expect(report.passed).toBe(false);
    expect(report.issues.map((issue) => issue.type)).toContain('high-median-drift');
    expect(runCaptionSyncGate(report).passed).toBe(false);
  });
});
