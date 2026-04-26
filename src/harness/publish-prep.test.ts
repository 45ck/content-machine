import { beforeEach, describe, expect, it, vi } from 'vitest';

const toolMocks = vi.hoisted(() => ({
  readJsonArtifact: vi.fn(),
  writeJsonArtifact: vi.fn(),
  scoreScript: vi.fn(),
  generatePublish: vi.fn(),
  validateVideoPath: vi.fn(),
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
    });
  });
});

describe('runPublishPrep', () => {
  beforeEach(() => {
    Object.values(toolMocks).forEach((mock) => mock.mockReset());

    toolMocks.readJsonArtifact.mockResolvedValue(makeScript());
    toolMocks.scoreScript.mockReturnValue(makeScoreOutput());
    toolMocks.generatePublish.mockResolvedValue(makePublishOutput());
    toolMocks.writeJsonArtifact.mockResolvedValue(undefined);
  });

  it('fails closed when the review gate detects silent audio', async () => {
    toolMocks.validateVideoPath.mockResolvedValue(makeAudioSignalValidateReport());

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
        audioSignal: true,
        freeze: false,
        flowConsistency: false,
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
        freeze: true,
        flowConsistency: false,
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

    await runPublishPrep(
      PublishPrepRequestSchema.parse({
        videoPath: '/tmp/run/render/video.mp4',
        scriptPath: '/tmp/run/script/script.json',
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
        audioSignal: true,
        freeze: true,
        flowConsistency: false,
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
});
