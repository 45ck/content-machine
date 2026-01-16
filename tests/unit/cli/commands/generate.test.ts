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
});
