import { describe, expect, it } from 'vitest';
import { assessSourceTextRisk } from './source-text-guard';
import type { CaptionQualityRatingOutput } from '../domain';

function makeReport(params: {
  coverageRatio: number;
  captionedSeconds: number;
  overallScore: number;
  meanConfidence: number;
  segmentCount: number;
}): CaptionQualityRatingOutput {
  return {
    schemaVersion: '1.0.0',
    videoPath: '/tmp/source.mp4',
    captionQuality: {
      thresholds: {
        safeMarginRatio: 0.05,
        idealReadingSpeedWps: { min: 2, max: 4 },
        absoluteReadingSpeedWps: { min: 1, max: 7 },
        recommendedCaptionDurationSeconds: { min: 1, max: 7 },
        flashDurationSecondsMax: 0.5,
        density: { maxLines: 3, maxCharsPerLine: 45 },
        capitalization: { allCapsRatioMin: 0.8 },
        alignment: {
          idealCenterXRatio: 0.5,
          maxMeanAbsCenterDxRatio: 0.1,
        },
        placement: {
          maxStddevCenterXRatio: 0.02,
          maxStddevCenterYRatio: 0.02,
        },
        jitter: {
          maxMeanCenterDeltaPx: 10,
          maxP95CenterDeltaPx: 40,
        },
        style: {
          maxBboxHeightCv: 0.25,
          maxBboxAreaCv: 0.4,
        },
        pass: {
          minOverall: 0.75,
          minCoverageRatio: 0.6,
          maxFlickerEvents: 1,
        },
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
        score: params.overallScore,
        passed: params.overallScore >= 0.75,
      },
      segments: Array.from({ length: params.segmentCount }, (_, index) => ({
        text: `Caption ${index + 1}`,
        normalizedText: `caption ${index + 1}`,
        startSeconds: index,
        endSeconds: index + 1,
        durationSeconds: 1,
        wordCount: 2,
        lineCount: 1,
        maxCharsPerLine: 9,
        meanConfidence: params.meanConfidence,
      })),
      rhythm: {
        meanWps: 3,
        stddevWps: 0.5,
        outOfIdealRangeCount: 0,
        outOfAbsoluteRangeCount: 0,
        score: 0.9,
      },
      displayTime: {
        minDurationSeconds: 1,
        maxDurationSeconds: 2,
        flashSegmentCount: 0,
        outOfRecommendedRangeCount: 0,
        score: 0.9,
      },
      coverage: {
        captionedSeconds: params.captionedSeconds,
        coverageRatio: params.coverageRatio,
        score: params.coverageRatio,
      },
      density: {
        maxLines: 1,
        maxCharsPerLine: 9,
        lineOverflowCount: 0,
        charOverflowCount: 0,
        score: 1,
      },
      punctuation: { missingTerminalPunctuationCount: 0, repeatedPunctuationCount: 0, score: 1 },
      capitalization: { style: 'sentence_case', inconsistentStyleCount: 0, score: 1 },
      ocrConfidence: {
        mean: params.meanConfidence,
        min: params.meanConfidence,
        stddev: 0.02,
        score: 0.9,
      },
      safeArea: { violationCount: 0, minMarginRatio: 0.12, score: 1 },
      flicker: { flickerEvents: 0, score: 1 },
      alignment: { meanAbsCenterDxRatio: 0.02, maxAbsCenterDxRatio: 0.03, score: 1 },
      placement: { stddevCenterXRatio: 0.01, stddevCenterYRatio: 0.01, score: 1 },
      jitter: { meanCenterDeltaPx: 4, p95CenterDeltaPx: 7, score: 1 },
      style: { bboxHeightCv: 0.1, bboxAreaCv: 0.1, score: 1 },
      redundancy: { reappearanceEvents: 0, adjacentOverlapEvents: 0, score: 1 },
      segmentation: { danglingConjunctionCount: 0, midSentenceBreakCount: 0, score: 1 },
    },
    errors: [],
    analysis: {
      ocrEngine: 'tesseract',
      fps: 1.5,
      framesAnalyzed: 12,
      analysisTimeMs: 100,
      captionFrameSize: { width: 1080, height: 1920 },
      videoFrameSize: { width: 1080, height: 1920 },
      captionCropOffsetY: 0,
      captionRegion: { yRatio: 0, heightRatio: 1 },
    },
    createdAt: '2026-04-23T00:00:00.000Z',
  };
}

describe('assessSourceTextRisk', () => {
  it('flags persistent caption-like text', () => {
    const assessment = assessSourceTextRisk({
      report: makeReport({
        coverageRatio: 0.52,
        captionedSeconds: 4.5,
        overallScore: 0.88,
        meanConfidence: 0.81,
        segmentCount: 4,
      }),
    });

    expect(assessment.flagged).toBe(true);
    expect(assessment.reasons.length).toBeGreaterThan(0);
  });

  it('does not flag incidental low-confidence text', () => {
    const assessment = assessSourceTextRisk({
      report: makeReport({
        coverageRatio: 0.08,
        captionedSeconds: 0.6,
        overallScore: 0.41,
        meanConfidence: 0.34,
        segmentCount: 1,
      }),
    });

    expect(assessment.flagged).toBe(false);
  });
});
