import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

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

vi.mock('../../../../src/core/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/core/config')>();
  return {
    ...actual,
    loadConfig: vi.fn(() => ({
      defaults: { archetype: 'listicle', orientation: 'portrait', voice: 'af_heart' },
      render: { fps: 30, template: undefined },
      captions: {
        fontFamily: 'Test Sans',
        fontWeight: 'bold',
        fontFile: undefined,
        fonts: [],
        preset: undefined,
        config: undefined,
      },
    })),
  };
});

vi.mock('../../../../src/render/service', () => ({
  renderVideo: vi.fn(),
}));

vi.mock('../../../../src/visuals/duration', () => ({
  ensureVisualCoverage: vi.fn((scenes) => scenes),
}));

vi.mock('../../../../src/audio/asr/validator', () => ({
  validateWordTimings: vi.fn(),
  repairWordTimings: vi.fn((words) => words),
  TimestampValidationError: class extends Error {
    wordIndex = 0;
    word = 'word';
    issue = 'gap';
  },
}));

vi.mock('../../../../src/cli/hooks', () => ({
  resolveHookFromCli: vi.fn().mockResolvedValue(null),
}));

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn(() => true),
  };
});

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

const visuals = {
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
  fallbacks: 0,
};

const timestamps = {
  schemaVersion: '1.0.0',
  allWords: [{ word: 'hello', start: 0, end: 0.5 }],
  totalDuration: 1,
  ttsEngine: 'kokoro',
  asrEngine: 'whisper',
};

describe('cli render command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits preflight json output when inputs are invalid', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ bad: 'visuals' })
      .mockResolvedValueOnce(timestamps);

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await renderCommand.parseAsync(
      [
        '--input',
        'visuals.json',
        '--audio',
        'audio.wav',
        '--timestamps',
        'timestamps.json',
        '--preflight',
      ],
      { from: 'user' }
    );

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload.outputs.preflightPassed).toBe(false);
    expect(payload.errors.length).toBeGreaterThan(0);
    expect(exitSpy).toHaveBeenCalledWith(2);

    exitSpy.mockRestore();
  });

  it('renders video and emits json envelope', async () => {
    await configureRuntime({ json: true });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(visuals)
      .mockResolvedValueOnce(timestamps);

    const { renderVideo } = await import('../../../../src/render/service');
    (renderVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      outputPath: 'video.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 12345,
    });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await renderCommand.parseAsync(
      [
        '--input',
        'visuals.json',
        '--audio',
        'audio.wav',
        '--timestamps',
        'timestamps.json',
        '--output',
        'video.mp4',
        '--caption-font-weight',
        '700',
      ],
      { from: 'user' }
    );

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload.outputs.videoPath).toBe('video.mp4');
  });

  it('rejects invalid chrome mode', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await expect(
      renderCommand.parseAsync(
        [
          '--input',
          'visuals.json',
          '--audio',
          'audio.wav',
          '--timestamps',
          'timestamps.json',
          '--chrome-mode',
          'nope',
        ],
        { from: 'user' }
      )
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('allows disabling caption highlight', async () => {
    await configureRuntime({ json: true });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(visuals)
      .mockResolvedValueOnce(timestamps);

    const { renderVideo } = await import('../../../../src/render/service');
    (renderVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      outputPath: 'video.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 12345,
    });

    const output = await import('../../../../src/cli/output');
    vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await renderCommand.parseAsync(
      [
        '--input',
        'visuals.json',
        '--audio',
        'audio.wav',
        '--timestamps',
        'timestamps.json',
        '--caption-highlight',
        'none',
      ],
      { from: 'user' }
    );

    expect(renderVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        captionConfig: expect.objectContaining({
          highlightMode: 'none',
        }),
      })
    );
  });

  it('supports per-word caption animation flags', async () => {
    await configureRuntime({ json: true });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(visuals)
      .mockResolvedValueOnce(timestamps);

    const { renderVideo } = await import('../../../../src/render/service');
    (renderVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      outputPath: 'video.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 12345,
    });

    const output = await import('../../../../src/cli/output');
    vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await renderCommand.parseAsync(
      [
        '--input',
        'visuals.json',
        '--audio',
        'audio.wav',
        '--timestamps',
        'timestamps.json',
        '--caption-word-animation',
        'shake',
        '--caption-word-animation-ms',
        '160',
        '--caption-word-animation-intensity',
        '0.8',
      ],
      { from: 'user' }
    );

    expect(renderVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        captionConfig: expect.objectContaining({
          wordAnimation: 'shake',
          wordAnimationMs: 160,
          wordAnimationIntensity: 0.8,
        }),
      })
    );
  });

  it('repairs timestamps when validation fails', async () => {
    await configureRuntime({ json: true });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(visuals)
      .mockResolvedValueOnce({
        ...timestamps,
        allWords: [
          { word: 'hello', start: 0, end: 0.2 },
          { word: 'world', start: 0.1, end: 0.4 },
        ],
      });

    const validator = await import('../../../../src/audio/asr/validator');
    const error = new (validator.TimestampValidationError as unknown as typeof Error)();
    (validator.validateWordTimings as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => {
        throw error;
      }
    );
    (validator.repairWordTimings as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { word: 'hello', start: 0, end: 0.3 },
      { word: 'world', start: 0.3, end: 0.6 },
    ]);

    const { renderVideo } = await import('../../../../src/render/service');
    (renderVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      outputPath: 'video.mp4',
      duration: 1,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 12345,
    });

    const output = await import('../../../../src/cli/output');
    vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await renderCommand.parseAsync(
      ['--input', 'visuals.json', '--audio', 'audio.wav', '--timestamps', 'timestamps.json'],
      { from: 'user' }
    );

    expect(renderVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamps: expect.objectContaining({
          allWords: [
            expect.objectContaining({ end: 0.3 }),
            expect.objectContaining({ start: 0.3 }),
          ],
        }),
      })
    );
  });

  it('extends visuals when ensureVisualCoverage adds scenes', async () => {
    await configureRuntime({ json: true });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(visuals)
      .mockResolvedValueOnce(timestamps);

    const duration = await import('../../../../src/visuals/duration');
    (duration.ensureVisualCoverage as unknown as ReturnType<typeof vi.fn>).mockReturnValue([
      { startMs: 0, endMs: 1000, url: 'clip.mp4', durationMs: 1000 },
      { startMs: 1000, endMs: 2000, url: null, durationMs: 1000, backgroundColor: '#000' },
    ]);

    const { renderVideo } = await import('../../../../src/render/service');
    (renderVideo as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      outputPath: 'video.mp4',
      duration: 2,
      width: 1080,
      height: 1920,
      fps: 30,
      fileSize: 12345,
    });

    const output = await import('../../../../src/cli/output');
    vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await renderCommand.parseAsync(
      ['--input', 'visuals.json', '--audio', 'audio.wav', '--timestamps', 'timestamps.json'],
      { from: 'user' }
    );

    expect(renderVideo).toHaveBeenCalledWith(
      expect.objectContaining({
        visuals: expect.objectContaining({
          totalAssets: 2,
          fallbacks: 1,
        }),
      })
    );
  });

  it('rejects invalid gameplay position', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { renderCommand } = await import('../../../../src/cli/commands/render');
    await expect(
      renderCommand.parseAsync(
        [
          '--input',
          'visuals.json',
          '--audio',
          'audio.wav',
          '--timestamps',
          'timestamps.json',
          '--gameplay-position',
          'left',
        ],
        { from: 'user' }
      )
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });
});
