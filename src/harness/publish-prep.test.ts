import { beforeEach, describe, expect, it, vi } from 'vitest';

const toolMocks = vi.hoisted(() => ({
  readJsonArtifact: vi.fn(),
  writeJsonArtifact: vi.fn(),
  scoreScript: vi.fn(),
  generatePublish: vi.fn(),
  validateVideoPath: vi.fn(),
  analyzeRenderedCaptionSync: vi.fn(),
}));

vi.mock('./artifacts', () => ({
  readJsonArtifact: toolMocks.readJsonArtifact,
  writeJsonArtifact: toolMocks.writeJsonArtifact,
}));

vi.mock('../score/scorer', () => ({
  scoreScript: toolMocks.scoreScript,
}));

vi.mock('../publish/generator', () => ({
  generatePublish: toolMocks.generatePublish,
}));

vi.mock('../validate/validate', () => ({
  validateVideoPath: toolMocks.validateVideoPath,
}));

vi.mock('../validate/caption-sync', () => ({
  analyzeRenderedCaptionSync: toolMocks.analyzeRenderedCaptionSync,
  runCaptionSyncGate: vi.fn((report: { passed: boolean }) => ({
    gateId: 'caption-sync',
    passed: report.passed,
    severity: 'error',
    fix: 'fix captions',
    message: report.passed ? 'Caption sync OK' : 'Caption sync bad',
    details: {
      expectedSegmentCount: 10,
      observedSegmentCount: 10,
      matchedSegmentCount: report.passed ? 10 : 3,
      segmentMatchRatio: report.passed ? 1 : 0.3,
      durationMatchRatio: report.passed ? 1 : 0.2,
      medianStartDriftMs: report.passed ? 120 : 900,
      p95StartDriftMs: report.passed ? 240 : 1200,
      maxStartDriftMs: report.passed ? 300 : 1500,
      coverageRatio: report.passed ? 0.8 : 0.1,
      captionQualityScore: report.passed ? 0.85 : 0.2,
      meanConfidence: report.passed ? 0.8 : 0.2,
      minSegmentMatchRatio: 0.65,
      minDurationMatchRatio: 0.55,
      maxMedianStartDriftMs: 350,
      maxP95StartDriftMs: 900,
    },
  })),
}));

import { PublishPrepRequestSchema, runPublishPrep } from './publish-prep';

const fixedDate = '2026-04-26T00:00:00.000Z';
const defaultPackaging = { enabled: false, variants: 5 } as const;
const defaultPublish = { mode: 'deterministic' } as const;

function makeScript() {
  return {
    schemaVersion: '1.0.0',
    title: 'Example short',
    hook: 'Example hook',
    cta: 'Follow for more',
    scenes: [
      {
        id: 'scene-1',
        text: 'Example scene',
        visualDirection: 'Use motion',
        mood: 'energetic',
      },
    ],
    hashtags: [],
    reasoning: 'Regression fixture',
  };
}

function makeScoreOutput() {
  return {
    schemaVersion: '1.0.0',
    input: { scriptPath: '/tmp/run/script/script.json' },
    passed: true,
    overall: 0.93,
    dimensions: {
      title: 0.8,
      hook: 0.9,
      structure: 0.85,
      safety: 1,
    },
    checks: [
      {
        checkId: 'title-present',
        passed: true,
        severity: 'error',
        message: 'Title present',
      },
    ],
    createdAt: fixedDate,
  };
}

function makePublishOutput() {
  return {
    schemaVersion: '1.0.0',
    platform: 'tiktok',
    title: 'Example short',
    description: 'Example description',
    hashtags: ['#example'],
    checklist: [{ id: 'upload', label: 'Upload', required: true }],
    createdAt: fixedDate,
  };
}

function makeCaptionExport() {
  return {
    schemaVersion: '1.0.0',
    captions: [],
    segments: [
      {
        text: 'Example caption',
        startMs: 0,
        endMs: 1000,
        timestampMs: 0,
        confidence: 0.9,
        words: [{ text: 'Example', startMs: 0, endMs: 400, confidence: 0.9 }],
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
        segmentCount: 1,
        maxCharsPerSecond: 8,
        shortestSegmentMs: 1000,
        maxWordsPerSegment: 2,
        lowConfidenceCount: 0,
      },
      issues: [],
    },
  };
}

function makeAudioSignalValidateReport() {
  return {
    schemaVersion: '1.0.0',
    videoPath: '/tmp/run/render/video.mp4',
    profile: 'portrait',
    passed: true,
    summary: {
      width: 1080,
      height: 1920,
      durationSeconds: 38,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    },
    gates: [
      {
        gateId: 'audio-signal',
        passed: false,
        severity: 'warning',
        fix: 'remix-audio',
        message: 'Audio signal issues: loudness -60.0 LUFS < -24 LUFS (too quiet)',
        details: {
          loudnessLUFS: -60,
          truePeakDBFS: -40,
          loudnessRange: 0,
          clippingRatio: 0,
          snrDB: 0,
          loudnessMinLUFS: -24,
          loudnessMaxLUFS: -8,
          maxClippingRatio: 0.01,
          truePeakMaxDBFS: -1,
        },
      },
    ],
    createdAt: fixedDate,
    runtimeMs: 12,
  };
}

function makeFreezeValidateReport() {
  return {
    schemaVersion: '1.0.0',
    videoPath: '/tmp/run/render/video.mp4',
    profile: 'portrait',
    passed: true,
    summary: {
      width: 1080,
      height: 1920,
      durationSeconds: 42,
      container: 'mp4',
      videoCodec: 'h264',
      audioCodec: 'aac',
    },
    gates: [
      {
        gateId: 'freeze',
        passed: false,
        severity: 'warning',
        fix: 'regenerate-video',
        message: 'Freeze issues: freeze ratio 31.0% > 15.0%',
        details: {
          freezeRatio: 0.31,
          blackRatio: 0.02,
          freezeEvents: 12,
          blackFrames: 3,
          totalFrames: 120,
          maxFreezeRatio: 0.15,
          maxBlackRatio: 0.05,
        },
      },
    ],
    createdAt: fixedDate,
    runtimeMs: 15,
  };
}

describe('PublishPrepRequestSchema', () => {
  it('enables fail-closed short-form gates by default', () => {
    const parsed = PublishPrepRequestSchema.parse({
      videoPath: '/tmp/run/render/video.mp4',
      scriptPath: '/tmp/run/script/script.json',
    });

    expect(parsed.validate).toEqual({
      profile: 'portrait',
      cadence: true,
      quality: false,
      temporal: false,
      audioSignal: true,
      freeze: false,
      flowConsistency: false,
      captionSync: true,
    });
  });
});

describe('runPublishPrep', () => {
  beforeEach(() => {
    Object.values(toolMocks).forEach((mock) => mock.mockReset());

    toolMocks.readJsonArtifact.mockResolvedValue(makeScript());
    toolMocks.scoreScript.mockReturnValue(makeScoreOutput());
    toolMocks.generatePublish.mockResolvedValue(makePublishOutput());
    toolMocks.analyzeRenderedCaptionSync.mockResolvedValue({
      passed: true,
      matchedSegmentCount: 1,
      expectedSegmentCount: 1,
      medianStartDriftMs: 120,
    });
    toolMocks.writeJsonArtifact.mockResolvedValue(undefined);
  });

  it('fails closed when the review gate detects silent audio', async () => {
    toolMocks.validateVideoPath.mockResolvedValue(makeAudioSignalValidateReport());
    toolMocks.readJsonArtifact
      .mockResolvedValueOnce(makeScript())
      .mockResolvedValueOnce(makeCaptionExport());

    const result = await runPublishPrep({
      videoPath: '/tmp/run/render/video.mp4',
      scriptPath: '/tmp/run/script/script.json',
      captionExportPath: '/tmp/run/render/captions.remotion.json',
      outputDir: '/tmp/run/publish-prep',
      platform: 'tiktok',
      packaging: defaultPackaging,
      publish: defaultPublish,
      validate: {
        profile: 'portrait',
        cadence: false,
        quality: false,
        temporal: false,
        audioSignal: true,
        freeze: false,
        flowConsistency: false,
        captionSync: true,
      },
    });

    expect(toolMocks.validateVideoPath).toHaveBeenCalledWith(
      '/tmp/run/render/video.mp4',
      expect.objectContaining({
        profile: 'portrait',
        audioSignal: { enabled: true },
        freeze: { enabled: false },
      })
    );
    expect(toolMocks.analyzeRenderedCaptionSync).toHaveBeenCalled();
    expect(result.result.passed).toBe(false);
    expect(result.result.validatePath).toBe('/tmp/run/publish-prep/validate.json');
    expect(result.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/tmp/run/publish-prep/validate.json',
          kind: 'file',
        }),
      ])
    );
  });

  it('fails closed when the review gate detects a frozen portrait short', async () => {
    toolMocks.validateVideoPath.mockResolvedValue(makeFreezeValidateReport());
    toolMocks.readJsonArtifact
      .mockResolvedValueOnce(makeScript())
      .mockResolvedValueOnce(makeCaptionExport());

    const result = await runPublishPrep({
      videoPath: '/tmp/run/render/video.mp4',
      scriptPath: '/tmp/run/script/script.json',
      captionExportPath: '/tmp/run/render/captions.remotion.json',
      outputDir: '/tmp/run/publish-prep',
      platform: 'tiktok',
      packaging: defaultPackaging,
      publish: defaultPublish,
      validate: {
        profile: 'portrait',
        cadence: false,
        quality: false,
        temporal: false,
        audioSignal: false,
        freeze: true,
        flowConsistency: false,
        captionSync: true,
      },
    });

    expect(toolMocks.validateVideoPath).toHaveBeenCalledWith(
      '/tmp/run/render/video.mp4',
      expect.objectContaining({
        profile: 'portrait',
        audioSignal: { enabled: false },
        freeze: { enabled: true },
      })
    );
    expect(toolMocks.analyzeRenderedCaptionSync).toHaveBeenCalled();
    expect(result.result.passed).toBe(false);
    expect(result.result.publishPath).toBe('/tmp/run/publish-prep/publish.json');
  });

  it('uses the fail-closed short-form validator defaults when validate options are omitted', async () => {
    toolMocks.validateVideoPath.mockResolvedValue({
      ...makeAudioSignalValidateReport(),
      gates: [
        {
          gateId: 'audio-signal',
          passed: true,
          severity: 'warning',
          fix: 'none',
          message: 'Audio signal OK (-14.2 LUFS, peak -1.5 dBFS)',
          details: {
            loudnessLUFS: -14.2,
            truePeakDBFS: -1.5,
            loudnessRange: 8,
            clippingRatio: 0,
            snrDB: 25,
            loudnessMinLUFS: -24,
            loudnessMaxLUFS: -8,
            maxClippingRatio: 0.01,
            truePeakMaxDBFS: -1,
          },
        },
      ],
    });
    toolMocks.readJsonArtifact
      .mockResolvedValueOnce(makeScript())
      .mockResolvedValueOnce(makeCaptionExport());

    await runPublishPrep(
      PublishPrepRequestSchema.parse({
        videoPath: '/tmp/run/render/video.mp4',
        scriptPath: '/tmp/run/script/script.json',
        captionExportPath: '/tmp/run/render/captions.remotion.json',
        outputDir: '/tmp/run/publish-prep',
        platform: 'tiktok',
        packaging: defaultPackaging,
        publish: defaultPublish,
      })
    );

    expect(toolMocks.validateVideoPath).toHaveBeenCalledWith(
      '/tmp/run/render/video.mp4',
      expect.objectContaining({
        profile: 'portrait',
        cadence: { enabled: true },
        quality: { enabled: false },
        temporal: { enabled: false },
        audioSignal: { enabled: true },
        freeze: { enabled: false },
        flowConsistency: { enabled: false },
      })
    );
  });

  it('passes when the review gate reports healthy audio and motion', async () => {
    toolMocks.validateVideoPath.mockResolvedValue({
      ...makeAudioSignalValidateReport(),
      passed: true,
      gates: [
        {
          gateId: 'audio-signal',
          passed: true,
          severity: 'warning',
          fix: 'none',
          message: 'Audio signal OK (-14.2 LUFS, peak -1.5 dBFS)',
          details: {
            loudnessLUFS: -14.2,
            truePeakDBFS: -1.5,
            loudnessRange: 8,
            clippingRatio: 0,
            snrDB: 25,
            loudnessMinLUFS: -24,
            loudnessMaxLUFS: -8,
            maxClippingRatio: 0.01,
            truePeakMaxDBFS: -1,
          },
        },
      ],
    });
    toolMocks.readJsonArtifact
      .mockResolvedValueOnce(makeScript())
      .mockResolvedValueOnce(makeCaptionExport());

    const result = await runPublishPrep({
      videoPath: '/tmp/run/render/video.mp4',
      scriptPath: '/tmp/run/script/script.json',
      captionExportPath: '/tmp/run/render/captions.remotion.json',
      outputDir: '/tmp/run/publish-prep',
      platform: 'tiktok',
      packaging: defaultPackaging,
      publish: defaultPublish,
      validate: {
        profile: 'portrait',
        cadence: false,
        quality: false,
        temporal: false,
        audioSignal: true,
        freeze: true,
        flowConsistency: false,
        captionSync: true,
      },
    });

    expect(result.result.passed).toBe(true);
    expect(result.artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/tmp/run/publish-prep/publish.json',
          kind: 'file',
        }),
      ])
    );
  });

  it('fails closed when rendered caption sync cannot be verified', async () => {
    toolMocks.validateVideoPath.mockResolvedValue({
      schemaVersion: '1.0.0',
      videoPath: '/tmp/run/render/video.mp4',
      profile: 'portrait',
      passed: true,
      summary: {
        width: 1080,
        height: 1920,
        durationSeconds: 38,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
      },
      gates: [],
      createdAt: fixedDate,
      runtimeMs: 12,
    });

    const result = await runPublishPrep({
      videoPath: '/tmp/run/render/video.mp4',
      scriptPath: '/tmp/run/script/script.json',
      outputDir: '/tmp/run/publish-prep',
      platform: 'tiktok',
      packaging: defaultPackaging,
      publish: defaultPublish,
      validate: {
        profile: 'portrait',
        cadence: false,
        quality: false,
        temporal: false,
        audioSignal: false,
        freeze: false,
        flowConsistency: false,
        captionSync: true,
      },
    });

    expect(toolMocks.analyzeRenderedCaptionSync).not.toHaveBeenCalled();
    expect(result.result.passed).toBe(false);
    expect(toolMocks.writeJsonArtifact).toHaveBeenCalledWith(
      '/tmp/run/publish-prep/validate.json',
      expect.objectContaining({
        gates: expect.arrayContaining([
          expect.objectContaining({
            gateId: 'caption-sync',
            passed: false,
          }),
        ]),
      })
    );
  });
});
