import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const execFileMock = vi.fn();
const probeVideoWithFfprobeMock = vi.fn();
const transcribeAudioMock = vi.fn();
const createWorkerMock = vi.fn();
const analyzeBurnedInCaptionQualityMock = vi.fn();

let baseCaptionQualityReport: unknown;

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
  const makePassingCaptionQualityReport = () => {
    const report = structuredClone(baseCaptionQualityReport as any);
    report.overall = { score: 0.95, passed: true };
    report.flicker = { ...report.flicker, flickerEvents: 0, score: 1 };
    report.safeArea = { ...report.safeArea, violationCount: 0, score: 1 };
    report.density = { ...report.density, lineOverflowCount: 0, charOverflowCount: 0, score: 1 };
    report.punctuation = {
      ...report.punctuation,
      missingTerminalPunctuationCount: 0,
      repeatedPunctuationCount: 0,
      score: 1,
    };
    report.capitalization = { ...report.capitalization, inconsistentStyleCount: 0, score: 1 };
    report.ocrConfidence = { ...report.ocrConfidence, mean: 0.9, min: 0.8, score: 1 };
    return report;
  };

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

    baseCaptionQualityReport = {
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
    };
    analyzeBurnedInCaptionQualityMock.mockReturnValue(baseCaptionQualityReport);
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

  it('returns rating 0 with low_match_ratio error when no OCR words match ASR words', async () => {
    const { rateSyncQuality } = await import('../../../src/score/sync-rater');
    const videoPath = makeTempVideo();

    analyzeBurnedInCaptionQualityMock.mockReturnValue(makePassingCaptionQualityReport());
    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: { text: 'QWERTY ASDF', confidence: 95 },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    });

    const output = await rateSyncQuality(videoPath, { fps: 2 });

    expect(output.rating).toBe(0);
    expect(output.metrics.matchedWords).toBe(0);
    expect(output.errors.some((e) => e.type === 'low_match_ratio')).toBe(true);
  });

  it('applies a partial penalty when matchRatio is between 0.7 and 0.9', async () => {
    const { rateSyncQuality } = await import('../../../src/score/sync-rater');
    const videoPath = makeTempVideo();

    analyzeBurnedInCaptionQualityMock.mockReturnValue(makePassingCaptionQualityReport());
    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: { text: 'one two three four', confidence: 95 },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    });
    transcribeAudioMock.mockResolvedValue({
      engine: 'whisper-cpp',
      duration: 2,
      text: 'one two three four five',
      words: [
        { word: 'one', start: 0.1, end: 0.2, confidence: 0.95 },
        { word: 'two', start: 0.2, end: 0.3, confidence: 0.95 },
        { word: 'three', start: 0.3, end: 0.4, confidence: 0.95 },
        { word: 'four', start: 0.4, end: 0.5, confidence: 0.95 },
        { word: 'five', start: 0.5, end: 0.6, confidence: 0.95 },
      ],
    });

    const output = await rateSyncQuality(videoPath, { fps: 2 });

    expect(output.metrics.matchRatio).toBeCloseTo(0.8, 3);
    expect(output.rating).toBe(90);
  });

  it('applies a heavy penalty when matchRatio is below 0.7 and emits low_match_ratio', async () => {
    const { rateSyncQuality } = await import('../../../src/score/sync-rater');
    const videoPath = makeTempVideo();

    analyzeBurnedInCaptionQualityMock.mockReturnValue(makePassingCaptionQualityReport());
    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: { text: 'one two', confidence: 95 },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    });
    transcribeAudioMock.mockResolvedValue({
      engine: 'whisper-cpp',
      duration: 2,
      text: 'one two three four five',
      words: [
        { word: 'one', start: 0.1, end: 0.2, confidence: 0.95 },
        { word: 'two', start: 0.2, end: 0.3, confidence: 0.95 },
        { word: 'three', start: 0.3, end: 0.4, confidence: 0.95 },
        { word: 'four', start: 0.4, end: 0.5, confidence: 0.95 },
        { word: 'five', start: 0.5, end: 0.6, confidence: 0.95 },
      ],
    });

    const output = await rateSyncQuality(videoPath, { fps: 2 });

    expect(output.metrics.matchRatio).toBeCloseTo(0.4, 3);
    expect(output.rating).toBeLessThan(60);
    expect(output.errors.some((e) => e.type === 'low_match_ratio')).toBe(true);
  });

  it('emits global_offset error when all drifts are consistently positive', async () => {
    const { rateSyncQuality } = await import('../../../src/score/sync-rater');
    const videoPath = makeTempVideo();

    analyzeBurnedInCaptionQualityMock.mockReturnValue(makePassingCaptionQualityReport());
    execFileMock.mockImplementation((cmd, args, options, cb) => {
      if (typeof options === 'function') cb = options;
      const argsList = args ?? [];
      const outputPath = argsList[argsList.length - 1];

      if (argsList.includes('-vn')) {
        fs.writeFileSync(outputPath, 'audio');
      } else if (typeof outputPath === 'string') {
        const framesDir = path.dirname(outputPath);
        fs.mkdirSync(framesDir, { recursive: true });
        for (let i = 1; i <= 6; i++) {
          fs.writeFileSync(path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`), 'f');
        }
      }

      cb?.(null, '', '');
    });

    let calls = 0;
    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockImplementation(async () => {
        calls += 1;
        const text = calls <= 4 ? '' : 'HELLO WORLD';
        return { data: { text, confidence: 95 } };
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
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

    const output = await rateSyncQuality(videoPath, { fps: 2 });

    expect(output.errors.some((e) => e.type === 'global_offset')).toBe(true);
  });

  it('uses robust stats when a single outlier exists and prints raw drift in CLI output', async () => {
    const { rateSyncQuality, formatSyncRatingCLI } = await import('../../../src/score/sync-rater');
    const videoPath = makeTempVideo();

    analyzeBurnedInCaptionQualityMock.mockReturnValue(makePassingCaptionQualityReport());
    createWorkerMock.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue({
        data: { text: 'one two three four five six seven eight nine ten', confidence: 95 },
      }),
      terminate: vi.fn().mockResolvedValue(undefined),
    });

    transcribeAudioMock.mockResolvedValue({
      engine: 'whisper-cpp',
      duration: 4,
      text: 'one two three four five six seven eight nine ten',
      words: [
        { word: 'one', start: 0.1, end: 0.2, confidence: 0.95 },
        { word: 'two', start: 0.2, end: 0.3, confidence: 0.95 },
        { word: 'three', start: 0.3, end: 0.4, confidence: 0.95 },
        { word: 'four', start: 0.35, end: 0.45, confidence: 0.95 },
        { word: 'five', start: 0.4, end: 0.5, confidence: 0.95 },
        { word: 'six', start: 0.45, end: 0.55, confidence: 0.95 },
        { word: 'seven', start: 0.5, end: 0.6, confidence: 0.95 },
        { word: 'eight', start: 0.55, end: 0.65, confidence: 0.95 },
        { word: 'nine', start: 0.6, end: 0.7, confidence: 0.95 },
        { word: 'ten', start: 3.0, end: 3.1, confidence: 0.95 },
      ],
    });

    const output = await rateSyncQuality(videoPath, { fps: 2 });

    expect(output.metrics.outlierCount).toBe(1);
    expect(output.errors.some((e) => e.type === 'sporadic_errors')).toBe(true);

    const rendered = formatSyncRatingCLI(output);
    expect(rendered).toContain('Raw Max Drift');
    expect(rendered).toContain('Outliers');
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
