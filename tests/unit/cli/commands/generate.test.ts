import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

vi.mock('../../../../src/core/config', async () => {
  const actual = await vi.importActual<typeof import('../../../../src/core/config')>(
    '../../../../src/core/config'
  );
  return {
    ...actual,
    loadConfig: vi.fn(() => ({
      captions: {
        fontFamily: 'Test Sans',
        fontWeight: 'bold',
        fontFile: undefined,
        fonts: [],
      },
      llm: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxRetries: 2,
      },
      sync: {
        requireWhisper: false,
        asrModel: 'base',
      },
      audioMix: { preset: 'clean', lufsTarget: -16 },
      music: {
        default: undefined,
        volumeDb: -18,
        duckDb: -9,
        loop: true,
        fadeInMs: 100,
        fadeOutMs: 200,
      },
      sfx: {
        pack: undefined,
        placement: 'scene',
        volumeDb: -12,
        minGapMs: 800,
        durationSeconds: 0.4,
      },
      ambience: { default: undefined, volumeDb: -26, loop: true, fadeInMs: 200, fadeOutMs: 400 },
      hooks: {
        library: 'transitionalhooks',
        dir: '~/.cm/assets/hooks',
        audio: 'keep',
        fit: 'cover',
        maxDuration: 3,
        defaultHook: 'no-crunch',
      },
    })),
  };
});

vi.mock('../../../../src/cli/progress', () => ({
  createSpinner: vi.fn(() => ({
    text: '',
    start: function () {
      return this;
    },
    succeed: function () {
      return this;
    },
    fail: function () {
      return this;
    },
    stop: function () {
      return this;
    },
  })),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

vi.mock('../../../../src/validate/ffprobe-audio', () => ({
  probeAudioWithFfprobe: vi.fn(),
}));

vi.mock('../../../../src/cli/hooks', () => ({
  resolveHookFromCli: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../../src/cli/commands/generate-quality', () => ({
  runGenerateWithSyncQualityGate: vi.fn(),
}));

vi.mock('../../../../src/cli/commands/caption-quality-gate', () => ({
  runGenerateWithCaptionQualityGate: vi.fn(),
}));

vi.mock('../../../../src/score/sync-rater', () => ({
  rateSyncQuality: vi.fn(),
  rateCaptionQuality: vi.fn(),
}));

vi.mock('../../../../src/workflows/resolve', () => ({
  resolveWorkflow: vi.fn(),
  formatWorkflowSource: vi.fn(() => 'mock'),
}));

vi.mock('../../../../src/audio/mix/planner', () => ({
  hasAudioMixSources: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../../src/core/pipeline', () => ({
  runPipeline: vi.fn(),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

describe('cli generate command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope on dry run', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(['Redis', '--dry-run', '--output', 'out.mp4'], {
      from: 'user',
    });

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.command).toBe('generate');
    expect(payload.outputs.dryRun).toBe(true);
    expect(payload.args.topic).toBe('Redis');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('prints dry-run summary in human mode', async () => {
    await configureRuntime({ json: false });

    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(
      ['Redis', '--dry-run', '--output', 'out.mp4', '--caption-max-words', '6'],
      { from: 'user' }
    );

    expect(stderrSpy).toHaveBeenCalledWith('Dry-run mode - no execution');
  });

  it('rejects timestamps without audio', async () => {
    await configureRuntime({ json: false });

    const { readInputFile, handleCommandError } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      allWords: [{ word: 'hi', start: 0, end: 0.5 }],
      totalDuration: 1,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper',
    });

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await expect(
      generateCommand.parseAsync(
        ['Redis', '--timestamps', 'timestamps.json', '--output', 'out.mp4'],
        { from: 'user' }
      )
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('rejects invalid sfx placement in dry-run', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await expect(
      generateCommand.parseAsync(
        ['Redis', '--dry-run', '--sfx-at', 'nope', '--output', 'out.mp4'],
        { from: 'user' }
      )
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('runs pipeline with external inputs and emits json output', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        schemaVersion: '1.0.0',
        reasoning: 'ok',
        scenes: [{ id: 'scene-1', text: 'Hello', visualDirection: 'demo' }],
      })
      .mockResolvedValueOnce({
        schemaVersion: '1.0.0',
        allWords: [{ word: 'Hello', start: 0, end: 0.5 }],
        totalDuration: 1,
        ttsEngine: 'kokoro',
        asrEngine: 'whisper',
      })
      .mockResolvedValueOnce({
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'mock',
            assetPath: 'clip.mp4',
            duration: 1,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 1,
      });

    const { probeAudioWithFfprobe } = await import('../../../../src/validate/ffprobe-audio');
    (probeAudioWithFfprobe as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      durationSeconds: 1,
      sampleRate: 44100,
    });

    const { runPipeline } = await import('../../../../src/core/pipeline');
    (runPipeline as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      script: {},
      audio: { audioMixPath: null },
      visuals: {},
      render: {},
      outputPath: 'out.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fileSize: 123,
    });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(
      [
        'Redis',
        '--output',
        'out.mp4',
        '--script',
        'script.json',
        '--audio',
        'audio.wav',
        '--timestamps',
        'timestamps.json',
        '--visuals',
        'visuals.json',
        '--mock',
      ],
      { from: 'user' }
    );

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.outputs.videoPath).toBe('out.mp4');
    expect(exitSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('emits preflight json output when mock is enabled', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(['Redis', '--preflight', '--mock', '--output', 'out.mp4'], {
      from: 'user',
    });

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.outputs.preflightPassed).toBe(true);
    expect(payload.args.preflight).toBe(true);
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('reports preflight errors for timestamps without audio', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      allWords: [{ word: 'hi', start: 0, end: 0.5 }],
      totalDuration: 1,
      ttsEngine: 'kokoro',
      asrEngine: 'whisper',
    });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(
      ['Redis', '--preflight', '--timestamps', 'timestamps.json', '--output', 'out.mp4'],
      { from: 'user' }
    );

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload.outputs.preflightPassed).toBe(false);
    expect(payload.errors.length).toBeGreaterThan(0);
    expect(exitSpy).toHaveBeenCalledWith(2);

    exitSpy.mockRestore();
  });

  it('prints a detailed dry-run summary when many options are set', async () => {
    await configureRuntime({ json: false });

    const stderrSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStderrLine')
      .mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(
      [
        'Redis',
        '--dry-run',
        '--output',
        'out.mp4',
        '--pipeline',
        'audio-first',
        '--whisper-model',
        'small',
        '--caption-group-ms',
        '900',
        '--reconcile',
        '--caption-mode',
        'chunk',
        '--words-per-page',
        '7',
        '--caption-min-words',
        '2',
        '--caption-target-words',
        '5',
        '--caption-max-wpm',
        '200',
        '--caption-max-cps',
        '17',
        '--caption-min-on-screen-ms',
        '1200',
        '--caption-min-on-screen-short-ms',
        '900',
        '--caption-drop-fillers',
        '--caption-filler-words',
        'um,like',
        '--max-lines',
        '3',
        '--chars-per-line',
        '28',
        '--caption-animation',
        'fade',
        '--caption-font-family',
        'Inter',
        '--caption-font-file',
        'fonts/inter.ttf',
        '--mix-preset',
        'punchy',
        '--music',
        'track.mp3',
        '--sfx',
        'sfx1.wav',
        '--sfx',
        'sfx2.wav',
        '--sfx-pack',
        'boings',
        '--ambience',
        'amb.mp3',
        '--gameplay',
        'gameplay.mp4',
        '--gameplay-style',
        'subway-surfers',
        '--gameplay-strict',
        '--gameplay-position',
        'top',
        '--content-position',
        'bottom',
        '--hook',
        'no-crunch',
        '--hook-trim',
        '1.5',
        '--research',
        'true',
        '--audio',
        'audio.wav',
        '--timestamps',
        'timestamps.json',
        '--audio-mix',
        'audio.mix.json',
        '--visuals',
        'visuals.json',
      ],
      { from: 'user' }
    );

    const calls = stderrSpy.mock.calls.map(([line]) => line);
    expect(calls).toContain('Dry-run mode - no execution');
    expect(calls.some((line) => line.includes('Pipeline: audio-first'))).toBe(true);
    expect(calls.some((line) => line.includes('Whisper Model: small'))).toBe(true);
    expect(calls.some((line) => line.includes('Music: track.mp3'))).toBe(true);
    expect(calls.some((line) => line.includes('SFX: sfx1.wav, sfx2.wav'))).toBe(true);
    expect(calls.some((line) => line.includes('Gameplay Strict: enabled'))).toBe(true);
    expect(calls.some((line) => line.includes('Pipeline stages:'))).toBe(true);
  });

  it('applies split-layout presets when rendering', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { runPipeline } = await import('../../../../src/core/pipeline');
    (runPipeline as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      script: {},
      audio: { audioMixPath: null },
      visuals: {},
      render: {},
      outputPath: 'out.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fileSize: 123,
    });

    const output = await import('../../../../src/cli/output');
    vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(
      ['Redis', '--output', 'out.mp4', '--mock', '--split-layout', 'gameplay-top'],
      {
        from: 'user',
      }
    );

    expect(runPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        gameplayPosition: 'top',
        contentPosition: 'bottom',
      })
    );
    expect(exitSpy).toHaveBeenCalled();

    exitSpy.mockRestore();
  });

  it('runs sync quality gating when enabled', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { runPipeline } = await import('../../../../src/core/pipeline');
    (runPipeline as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      script: {},
      audio: { audioMixPath: null },
      visuals: {},
      render: {},
      outputPath: 'out.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fileSize: 123,
    });

    const { rateSyncQuality } = await import('../../../../src/score/sync-rater');
    (rateSyncQuality as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      videoPath: 'out.mp4',
      rating: 40,
      ratingLabel: 'poor',
      passed: false,
      metrics: {
        meanDriftMs: 250,
        maxDriftMs: 500,
        rawMaxDriftMs: 500,
        p95DriftMs: 400,
        medianDriftMs: 250,
        meanSignedDriftMs: 200,
        leadingRatio: 0.1,
        laggingRatio: 0.9,
        driftStdDev: 80,
        outlierCount: 1,
        outlierRatio: 0.1,
        matchedWords: 10,
        totalOcrWords: 12,
        totalAsrWords: 11,
        matchRatio: 0.83,
      },
      wordMatches: [],
      driftTimeline: [],
      errors: [],
      analysis: {
        ocrEngine: 'tesseract',
        asrEngine: 'mock',
        framesAnalyzed: 2,
        analysisTimeMs: 1,
      },
      createdAt: new Date().toISOString(),
    });

    const { runGenerateWithSyncQualityGate } =
      await import('../../../../src/cli/commands/generate-quality');
    (runGenerateWithSyncQualityGate as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ initialSettings, runAttempt, rate }) => {
        const pipelineResult = await runAttempt(initialSettings);
        const rating = await rate(pipelineResult.outputPath);
        return {
          pipelineResult,
          rating,
          attempts: 1,
          attemptHistory: [{ rating }, { rating }],
          finalSettings: initialSettings,
        };
      }
    );

    const { writeOutputFile } = await import('../../../../src/cli/utils');
    const output = await import('../../../../src/cli/output');
    vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(
      ['Redis', '--output', 'out.mp4', '--mock', '--sync-quality-check', '--min-sync-rating', '80'],
      { from: 'user' }
    );

    expect(runGenerateWithSyncQualityGate).toHaveBeenCalled();
    expect(writeOutputFile).toHaveBeenCalledWith(
      expect.stringContaining('sync-report.json'),
      expect.anything()
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('runs caption quality gating when enabled', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { runPipeline } = await import('../../../../src/core/pipeline');
    (runPipeline as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      script: {},
      audio: { audioMixPath: null },
      visuals: {},
      render: {},
      outputPath: 'out.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fileSize: 123,
    });

    const { rateCaptionQuality } = await import('../../../../src/score/sync-rater');
    (rateCaptionQuality as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      videoPath: 'out.mp4',
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
        overall: { score: 0.6, passed: false },
        segments: [],
        rhythm: {
          meanWps: 2,
          stddevWps: 1,
          outOfIdealRangeCount: 0,
          outOfAbsoluteRangeCount: 0,
          score: 0.6,
        },
        displayTime: {
          minDurationSeconds: 0.2,
          maxDurationSeconds: 1.1,
          flashSegmentCount: 0,
          outOfRecommendedRangeCount: 0,
          score: 0.6,
        },
        coverage: { captionedSeconds: 1, coverageRatio: 0.5, score: 0.5 },
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
        capitalization: { style: 'sentence_case', inconsistentStyleCount: 0, score: 0.9 },
        ocrConfidence: { mean: 0.95, min: 0.8, stddev: 0.05, score: 0.9 },
        safeArea: { violationCount: 0, minMarginRatio: 0.1, score: 0.9 },
        flicker: { flickerEvents: 1, score: 0.4 },
        alignment: { meanAbsCenterDxRatio: 0.01, maxAbsCenterDxRatio: 0.02, score: 0.9 },
        placement: { stddevCenterXRatio: 0.01, stddevCenterYRatio: 0.01, score: 0.9 },
        jitter: { meanCenterDeltaPx: 0, p95CenterDeltaPx: 0, score: 1 },
        style: { bboxHeightCv: 0.02, bboxAreaCv: 0.05, score: 0.9 },
        redundancy: { reappearanceEvents: 0, adjacentOverlapEvents: 0, score: 1 },
        segmentation: { danglingConjunctionCount: 0, midSentenceBreakCount: 0, score: 1 },
      },
      errors: [],
      analysis: {
        ocrEngine: 'tesseract',
        fps: 2,
        framesAnalyzed: 2,
        analysisTimeMs: 1,
        captionFrameSize: { width: 1080, height: 600 },
        videoFrameSize: { width: 1080, height: 1920 },
        captionCropOffsetY: 1248,
        captionRegion: { yRatio: 0.65, heightRatio: 0.35 },
      },
      createdAt: new Date().toISOString(),
    });

    const { runGenerateWithCaptionQualityGate } =
      await import('../../../../src/cli/commands/caption-quality-gate');
    (runGenerateWithCaptionQualityGate as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ initialPipelineResult, initialSettings, rerender, rate }) => {
        const pipelineResult = await rerender(initialSettings);
        const rating = await rate(pipelineResult.outputPath);
        return {
          pipelineResult: initialPipelineResult,
          rating,
          attempts: 2,
          attemptHistory: [
            { rating, settings: { ...initialSettings, captionTargetWords: 5 } },
            { rating, settings: { ...initialSettings, captionTargetWords: 6 } },
          ],
        };
      }
    );

    const { writeOutputFile } = await import('../../../../src/cli/utils');
    const output = await import('../../../../src/cli/output');
    vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { generateCommand } = await import('../../../../src/cli/commands/generate');
    await generateCommand.parseAsync(
      [
        'Redis',
        '--output',
        'out.mp4',
        '--mock',
        '--caption-quality-check',
        '--caption-quality-mock',
        '--min-caption-overall',
        '0.9',
        '--auto-retry-captions',
        '--max-caption-retries',
        '2',
      ],
      { from: 'user' }
    );

    expect(runGenerateWithCaptionQualityGate).toHaveBeenCalled();
    expect(writeOutputFile).toHaveBeenCalledWith(
      expect.stringContaining('caption-report.json'),
      expect.anything()
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });
});
