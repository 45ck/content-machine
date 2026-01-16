import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

vi.mock('../../../../src/core/config', () => ({
  loadConfig: vi.fn(),
}));

vi.mock('../../../../src/audio/pipeline', () => ({
  generateAudio: vi.fn(),
}));

vi.mock('../../../../src/cli/ui', () => ({
  formatKeyValueRows: vi.fn((rows: Array<[string, string]>) =>
    rows.map(([label, value]) => `${label}:${value}`)
  ),
  writeSummaryCard: vi.fn(),
}));

vi.mock('../../../../src/audio/mix/planner', () => ({
  hasAudioMixSources: vi.fn(),
}));

const runtimeState = {
  json: false,
  verbose: false,
  offline: false,
  yes: false,
  isTty: false,
  startTime: Date.now(),
  command: undefined as string | undefined,
};

vi.mock('../../../../src/cli/runtime', () => ({
  getCliRuntime: () => runtimeState,
  setCliRuntime: (update: Partial<typeof runtimeState>) => Object.assign(runtimeState, update),
  resetCliRuntime: () => {
    runtimeState.json = false;
    runtimeState.verbose = false;
    runtimeState.offline = false;
    runtimeState.yes = false;
    runtimeState.isTty = false;
    runtimeState.startTime = Date.now();
    runtimeState.command = undefined;
  },
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

const baseScript = {
  schemaVersion: '1.0.0',
  reasoning: 'ok',
  scenes: [
    {
      id: 'scene-1',
      text: 'Hello world',
      visualDirection: 'demo',
    },
  ],
  meta: {
    archetype: 'listicle',
    topic: 'demo',
    generatedAt: new Date().toISOString(),
  },
};

const baseAudioOutput = {
  schemaVersion: '1.0.0',
  audioPath: 'audio.wav',
  timestampsPath: 'timestamps.json',
  timestamps: {
    schemaVersion: '1.0.0',
    allWords: [{ word: 'Hello', start: 0, end: 0.5 }],
    totalDuration: 1,
    ttsEngine: 'kokoro',
    asrEngine: 'whisper',
  },
  duration: 1,
  wordCount: 1,
  voice: 'af_heart',
  sampleRate: 48000,
};

const baseConfig = {
  audioMix: { preset: 'clean', lufsTarget: -16 },
  music: {
    default: 'music.mp3',
    volumeDb: -18,
    duckDb: -9,
    loop: true,
    fadeInMs: 100,
    fadeOutMs: 200,
  },
  sfx: { pack: 'pack', placement: 'scene', volumeDb: -12, minGapMs: 800, durationSeconds: 0.4 },
  ambience: { default: 'ambience.mp3', volumeDb: -26, loop: true, fadeInMs: 200, fadeOutMs: 400 },
};

describe('cli audio command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope and passes mix request when audio mix is explicit', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseScript);

    const { loadConfig } = await import('../../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue(baseConfig);

    const { hasAudioMixSources } = await import('../../../../src/audio/mix/planner');
    (hasAudioMixSources as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { generateAudio } = await import('../../../../src/audio/pipeline');
    (generateAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseAudioOutput,
      audioMixPath: 'audio.mix.json',
      audioMix: { layers: [] },
    });

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { audioCommand } = await import('../../../../src/cli/commands/audio');
    await audioCommand.parseAsync(
      [
        '--input',
        'script.json',
        '--output',
        'audio.wav',
        '--audio-mix',
        'mix.json',
        '--sync-strategy',
        'audio-first',
      ],
      { from: 'user' }
    );

    exitSpy.mockRestore();

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.command).toBe('audio');
    expect(payload.args.reconcile).toBe(true);
    expect(payload.args.requireWhisper).toBe(true);
    expect(payload.args.audioMix).toBe('mix.json');

    expect(generateAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        audioMix: expect.objectContaining({
          outputPath: 'mix.json',
          emitEmpty: true,
        }),
      })
    );
  });

  it('prints summary and stdout path in human mode with mix sources', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseScript);

    const { loadConfig } = await import('../../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue(baseConfig);

    const { hasAudioMixSources } = await import('../../../../src/audio/mix/planner');
    (hasAudioMixSources as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { generateAudio } = await import('../../../../src/audio/pipeline');
    (generateAudio as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...baseAudioOutput,
      audioMixPath: 'audio.mix.json',
      audioMix: { layers: ['voice'] },
    });

    const { writeSummaryCard } = await import('../../../../src/cli/ui');
    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { audioCommand } = await import('../../../../src/cli/commands/audio');
    await audioCommand.parseAsync(
      [
        '--input',
        'script.json',
        '--output',
        'voice.wav',
        '--timestamps',
        'ts.json',
        '--voice',
        'af_bold',
        '--tts-speed',
        '1.2',
        '--sync-strategy',
        'standard',
        '--reconcile',
        '--music',
        'track.mp3',
        '--sfx',
        'hit.wav',
        '--sfx-at',
        'hook',
        '--ambience',
        'room.mp3',
      ],
      { from: 'user' }
    );

    exitSpy.mockRestore();

    expect(writeSummaryCard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Audio ready',
        footerLines: expect.arrayContaining([expect.stringContaining('cm visuals')]),
      })
    );
    expect(stdoutSpy).toHaveBeenCalledWith('audio.wav');
    expect(generateAudio).toHaveBeenCalledWith(
      expect.objectContaining({
        reconcile: true,
        requireWhisper: false,
      })
    );
  });

  it('handles invalid script schema via handleCommandError', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError, readInputFile } = await import('../../../../src/cli/utils');

    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const { audioCommand } = await import('../../../../src/cli/commands/audio');
    await expect(
      audioCommand.parseAsync(['--input', 'script.json'], { from: 'user' })
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });

  it('rejects invalid numeric options before generating audio', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseScript);

    const { loadConfig } = await import('../../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue(baseConfig);

    const { audioCommand } = await import('../../../../src/cli/commands/audio');
    await expect(
      audioCommand.parseAsync(['--input', 'script.json', '--music-volume', 'nope'], {
        from: 'user',
      })
    ).rejects.toThrow();

    exitSpy.mockRestore();
  });

  it('rejects invalid tts speed', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseScript);

    const { loadConfig } = await import('../../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue(baseConfig);

    const { audioCommand } = await import('../../../../src/cli/commands/audio');
    await expect(
      audioCommand.parseAsync(['--input', 'script.json', '--tts-speed', '0'], {
        from: 'user',
      })
    ).rejects.toThrow();

    exitSpy.mockRestore();
  });

  it('rejects invalid sfx placement and int options', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseScript);

    const { loadConfig } = await import('../../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue(baseConfig);

    const { audioCommand } = await import('../../../../src/cli/commands/audio');
    await expect(
      audioCommand.parseAsync(
        ['--input', 'script.json', '--sfx-at', 'bad', '--sfx-min-gap', 'nope'],
        { from: 'user' }
      )
    ).rejects.toThrow();

    exitSpy.mockRestore();
  });

  it('rejects invalid integer options', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseScript);

    const { loadConfig } = await import('../../../../src/core/config');
    (loadConfig as unknown as ReturnType<typeof vi.fn>).mockReturnValue(baseConfig);

    const { audioCommand } = await import('../../../../src/cli/commands/audio');
    await expect(
      audioCommand.parseAsync(['--input', 'script.json', '--music-fade-in', 'nope'], {
        from: 'user',
      })
    ).rejects.toThrow();

    exitSpy.mockRestore();
  });
});
