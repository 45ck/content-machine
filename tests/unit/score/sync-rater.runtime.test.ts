import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileMock = vi.fn();
const probeVideoWithFfprobeMock = vi.fn();
const transcribeAudioMock = vi.fn();
const createWorkerMock = vi.fn();
const analyzeBurnedInCaptionQualityMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

vi.mock('../../../src/validate/ffprobe', () => ({
  probeVideoWithFfprobe: probeVideoWithFfprobeMock,
}));

vi.mock('../../../src/audio/asr', () => ({
  transcribeAudio: transcribeAudioMock,
}));

vi.mock('tesseract.js', () => ({
  createWorker: createWorkerMock,
}));

vi.mock('../../../src/score/burned-in-caption-quality', () => ({
  analyzeBurnedInCaptionQuality: analyzeBurnedInCaptionQualityMock,
}));

function makeTempVideo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-sync-test-'));
  const filePath = path.join(dir, 'video.mp4');
  fs.writeFileSync(filePath, 'fake');
  return filePath;
}

describe('rateSyncQuality (runtime)', () => {
  beforeEach(() => {
    execFileMock.mockImplementation((cmd, args, options, cb) => {
      if (typeof options === 'function') {
        cb = options;
      }
      const argsList = args ?? [];
      const outputPath = argsList[argsList.length - 1];

      if (argsList.includes('-vn')) {
        fs.writeFileSync(outputPath, 'audio');
      } else if (typeof outputPath === 'string') {
        const framesDir = path.dirname(outputPath);
        fs.mkdirSync(framesDir, { recursive: true });
        fs.writeFileSync(path.join(framesDir, 'frame_0001.png'), 'frame');
        fs.writeFileSync(path.join(framesDir, 'frame_0002.png'), 'frame');
      }

      cb?.(null, '', '');
    });

    probeVideoWithFfprobeMock.mockResolvedValue({
      path: 'video.mp4',
      width: 1080,
      height: 1920,
      durationSeconds: 5,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    });

    transcribeAudioMock.mockResolvedValue({
      engine: 'whisper-cpp',
      duration: 2,
      text: 'hello world',
      words: [
        { word: 'hello', start: 0.1, end: 0.3, confidence: 0.95 },
        { word: 'world', start: 0.6, end: 0.8, confidence: 0.95 },
      ],
    });

    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: { text: 'HELLO WORLD', confidence: 95 },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    });

    analyzeBurnedInCaptionQualityMock.mockReturnValue({
      thresholds: {
        safeMarginRatio: 0.05,
        idealReadingSpeedWps: { min: 2, max: 4 },
        absoluteReadingSpeedWps: { min: 1, max: 7 },
        recommendedCaptionDurationSeconds: { min: 1, max: 7 },
        flashDurationSecondsMax: 0.5,
        density: { maxLines: 3, maxCharsPerLine: 45 },
        capitalization: { allCapsRatioMin: 0.8 },
        alignment: { idealCenterXRatio: 0.5, maxMeanAbsCenterDxRatio: 0.06 },
        placement: { maxStddevCenterXRatio: 0.02, maxStddevCenterYRatio: 0.02 },
        jitter: { maxMeanCenterDeltaPx: 6, maxP95CenterDeltaPx: 14 },
        style: { maxBboxHeightCv: 0.15, maxBboxAreaCv: 0.25 },
        pass: { minOverall: 0.75, minCoverageRatio: 0.6, maxFlickerEvents: 0 },
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
      overall: { score: 0.4, passed: false },
      segments: [],
      rhythm: {
        meanWps: 2,
        stddevWps: 1,
        outOfIdealRangeCount: 1,
        outOfAbsoluteRangeCount: 1,
        score: 0.4,
      },
      displayTime: {
        minDurationSeconds: 0.1,
        maxDurationSeconds: 1.2,
        flashSegmentCount: 1,
        outOfRecommendedRangeCount: 1,
        score: 0.5,
      },
      coverage: {
        captionedSeconds: 1,
        coverageRatio: 0.5,
        score: 0.5,
      },
      density: {
        maxLines: 4,
        maxCharsPerLine: 32,
        lineOverflowCount: 1,
        charOverflowCount: 1,
        score: 0.4,
      },
      punctuation: {
        missingTerminalPunctuationCount: 1,
        repeatedPunctuationCount: 1,
        score: 0.4,
      },
      capitalization: {
        style: 'mixed',
        inconsistentStyleCount: 1,
        score: 0.4,
      },
      ocrConfidence: {
        mean: 0.6,
        min: 0.4,
        stddev: 0.1,
        score: 0.4,
      },
      safeArea: {
        violationCount: 1,
        minMarginRatio: 0.1,
        score: 0.4,
      },
      flicker: {
        flickerEvents: 1,
        score: 0.4,
      },
      alignment: { meanAbsCenterDxRatio: 0.1, maxAbsCenterDxRatio: 0.2, score: 0.2 },
      placement: { stddevCenterXRatio: 0.03, stddevCenterYRatio: 0.05, score: 0.2 },
      jitter: { meanCenterDeltaPx: 12, p95CenterDeltaPx: 18, score: 0.1 },
      style: { bboxHeightCv: 0.3, bboxAreaCv: 0.4, score: 0.2 },
      redundancy: { reappearanceEvents: 1, adjacentOverlapEvents: 1, score: 0.2 },
      segmentation: { danglingConjunctionCount: 1, midSentenceBreakCount: 1, score: 0.2 },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns mock output when mock mode is enabled', async () => {
    const { rateSyncQuality } = await import('../../../src/score/sync-rater');
    const output = await rateSyncQuality('video.mp4', { mock: true });

    expect(output.analysis.asrEngine).toBe('mock');
    expect(output.wordMatches.length).toBeGreaterThan(0);
    expect(output.ratingLabel).toMatch(/good|fair|poor|broken|excellent/);
  });

  it('rejects unsupported OCR engines', async () => {
    const { rateSyncQuality } = await import('../../../src/score/sync-rater');
    await expect(
      rateSyncQuality('video.mp4', { ocrEngine: 'easyocr' as never })
    ).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('runs the real pipeline with mocked dependencies', async () => {
    const { rateSyncQuality } = await import('../../../src/score/sync-rater');
    const videoPath = makeTempVideo();

    const output = await rateSyncQuality(videoPath, { fps: 2 });

    expect(output.videoPath).toBe(videoPath);
    expect(output.analysis.framesAnalyzed).toBeGreaterThan(0);
    expect(output.metrics.matchedWords).toBeGreaterThan(0);
    expect(execFileMock).toHaveBeenCalled();
  });

  it('formats CLI output with issue section when errors exist', async () => {
    const { formatSyncRatingCLI } = await import('../../../src/score/sync-rater');

    const output = {
      schemaVersion: '1.0.0',
      videoPath: '/tmp/video.mp4',
      rating: 35,
      ratingLabel: 'poor',
      passed: false,
      metrics: {
        meanDriftMs: 200,
        maxDriftMs: 400,
        p95DriftMs: 350,
        medianDriftMs: 210,
        meanSignedDriftMs: 150,
        leadingRatio: 0,
        laggingRatio: 1,
        driftStdDev: 90,
        matchedWords: 2,
        totalOcrWords: 10,
        totalAsrWords: 10,
        matchRatio: 0.2,
      },
      wordMatches: [],
      driftTimeline: [],
      errors: [
        {
          type: 'low_match_ratio',
          severity: 'critical',
          message: 'Only 20% of words matched',
        },
      ],
      analysis: {
        ocrEngine: 'tesseract',
        asrEngine: 'whisper-cpp',
        framesAnalyzed: 2,
        analysisTimeMs: 100,
      },
      captionQuality: {
        thresholds: {
          safeMarginRatio: 0.05,
          idealReadingSpeedWps: { min: 2, max: 4 },
          absoluteReadingSpeedWps: { min: 1, max: 7 },
          recommendedCaptionDurationSeconds: { min: 1, max: 7 },
          flashDurationSecondsMax: 0.5,
          density: { maxLines: 3, maxCharsPerLine: 45 },
          capitalization: { allCapsRatioMin: 0.8 },
          alignment: { idealCenterXRatio: 0.5, maxMeanAbsCenterDxRatio: 0.06 },
          placement: { maxStddevCenterXRatio: 0.02, maxStddevCenterYRatio: 0.02 },
          jitter: { maxMeanCenterDeltaPx: 6, maxP95CenterDeltaPx: 14 },
          style: { maxBboxHeightCv: 0.15, maxBboxAreaCv: 0.25 },
          pass: { minOverall: 0.75, minCoverageRatio: 0.6, maxFlickerEvents: 0 },
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
        overall: { score: 0.75, passed: true },
        segments: [],
        rhythm: {
          meanWps: 2,
          stddevWps: 1,
          outOfIdealRangeCount: 0,
          outOfAbsoluteRangeCount: 0,
          score: 0.5,
        },
        displayTime: {
          minDurationSeconds: 0.2,
          maxDurationSeconds: 1.1,
          flashSegmentCount: 0,
          outOfRecommendedRangeCount: 0,
          score: 0.6,
        },
        coverage: {
          captionedSeconds: 1,
          coverageRatio: 0.7,
          score: 0.7,
        },
        density: {
          maxLines: 2,
          maxCharsPerLine: 24,
          lineOverflowCount: 0,
          charOverflowCount: 0,
          score: 0.8,
        },
        punctuation: {
          missingTerminalPunctuationCount: 0,
          repeatedPunctuationCount: 0,
          score: 0.9,
        },
        capitalization: {
          style: 'sentence_case',
          inconsistentStyleCount: 0,
          score: 0.9,
        },
        ocrConfidence: {
          mean: 0.95,
          min: 0.8,
          stddev: 0.05,
          score: 0.9,
        },
        safeArea: {
          violationCount: 0,
          minMarginRatio: 0.1,
          score: 0.9,
        },
        flicker: {
          flickerEvents: 0,
          score: 1,
        },
        alignment: { meanAbsCenterDxRatio: 0.01, maxAbsCenterDxRatio: 0.02, score: 0.9 },
        placement: { stddevCenterXRatio: 0.01, stddevCenterYRatio: 0.01, score: 0.9 },
        jitter: { meanCenterDeltaPx: 0, p95CenterDeltaPx: 0, score: 1 },
        style: { bboxHeightCv: 0.02, bboxAreaCv: 0.05, score: 0.9 },
        redundancy: { reappearanceEvents: 0, adjacentOverlapEvents: 0, score: 1 },
        segmentation: { danglingConjunctionCount: 0, midSentenceBreakCount: 0, score: 1 },
      },
      createdAt: new Date().toISOString(),
    };

    const rendered = formatSyncRatingCLI(output);
    expect(rendered).toContain('SYNC RATING REPORT');
    expect(rendered).toContain('CAPTION QUALITY');
    expect(rendered).toContain('ISSUES');
    expect(rendered).toContain('Only 20% of words matched');
  });
});
