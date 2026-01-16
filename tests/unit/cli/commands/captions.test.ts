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
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

vi.mock('../../../../src/cli/ui', () => ({
  formatKeyValueRows: vi.fn((rows: Array<[string, string]>) =>
    rows.map(([label, value]) => `${label}:${value}`)
  ),
  writeSummaryCard: vi.fn(),
}));

vi.mock('../../../../src/score/caption-diagnostics', () => ({
  analyzeCaptionChunks: vi.fn(),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

const baseTimestamps = {
  schemaVersion: '1.0.0',
  allWords: [
    { word: 'Hello', start: 0, end: 0.5 },
    { word: 'world', start: 0.5, end: 1 },
  ],
  totalDuration: 1,
  ttsEngine: 'kokoro',
  asrEngine: 'whisper',
};

const fastReport = {
  totalChunks: 2,
  avgDurationMs: 700,
  minDurationMs: 500,
  maxDurationMs: 900,
  maxCps: 12,
  maxWpm: 240,
  fastChunkCount: 1,
  chunks: [
    {
      index: 0,
      text: 'Hello world',
      wordCount: 2,
      charCount: 11,
      startMs: 0,
      endMs: 500,
      durationMs: 500,
      requiredMinMs: 800,
      cps: 22,
      wpm: 240,
      meetsMinDuration: false,
    },
  ],
};

describe('cli captions command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope and exits non-zero for fast chunks', async () => {
    await configureRuntime({ json: true });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseTimestamps);

    const { analyzeCaptionChunks } = await import('../../../../src/score/caption-diagnostics');
    (analyzeCaptionChunks as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fastReport);

    const output = await import('../../../../src/cli/output');
    const writeJsonSpy = vi.spyOn(output, 'writeJsonEnvelope').mockImplementation(() => undefined);

    const { captionsCommand } = await import('../../../../src/cli/commands/captions');
    await captionsCommand.parseAsync(
      [
        '--timestamps',
        'timestamps.json',
        '--output',
        'caption-diagnostics.json',
        '--caption-preset',
        'Reels',
        '--caption-mode',
        'page',
        '--caption-max-words',
        '6',
        '--caption-min-words',
        '2',
        '--caption-target-words',
        '4',
        '--caption-max-wpm',
        '200',
        '--caption-max-cps',
        '15',
        '--caption-min-on-screen-ms',
        '800',
        '--caption-min-on-screen-short-ms',
        '600',
        '--caption-drop-fillers',
        '--caption-filler-words',
        'um, like',
      ],
      { from: 'user' }
    );

    const payload = writeJsonSpy.mock.calls[0]?.[0];
    expect(payload).toBeTruthy();
    expect(payload.command).toBe('captions');
    expect(payload.args.captionPreset).toBe('reels');
    expect(payload.args.captionMode).toBe('page');
    expect(payload.args.captionDropFillers).toBe(true);
    expect(payload.args.captionFillerWords).toEqual(['um', 'like']);
    expect(payload.outputs.fastChunkCount).toBe(1);
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
  });

  it('writes summary output and exits zero when no fast chunks', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseTimestamps);

    const { analyzeCaptionChunks } = await import('../../../../src/score/caption-diagnostics');
    (analyzeCaptionChunks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      ...fastReport,
      fastChunkCount: 0,
    });

    const stdoutSpy = vi
      .spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine')
      .mockImplementation(() => undefined);

    const { writeSummaryCard } = await import('../../../../src/cli/ui');

    const { captionsCommand } = await import('../../../../src/cli/commands/captions');
    await captionsCommand.parseAsync(['--timestamps', 'timestamps.json'], { from: 'user' });

    expect(writeSummaryCard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Caption diagnostics',
        footerLines: ['Next: cm render --timestamps timestamps.json'],
      })
    );
    expect(stdoutSpy).toHaveBeenCalledWith('caption-diagnostics.json');
    expect(exitSpy).toHaveBeenCalledWith(0);

    exitSpy.mockRestore();
  });

  it('includes fast chunk details unless summary is requested', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(baseTimestamps);

    const { analyzeCaptionChunks } = await import('../../../../src/score/caption-diagnostics');
    (analyzeCaptionChunks as unknown as ReturnType<typeof vi.fn>).mockReturnValue(fastReport);

    vi.spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine').mockImplementation(
      () => undefined
    );
    const { writeSummaryCard } = await import('../../../../src/cli/ui');

    const { captionsCommand } = await import('../../../../src/cli/commands/captions');
    await captionsCommand.parseAsync(['--timestamps', 'timestamps.json', '--summary'], {
      from: 'user',
    });

    expect(writeSummaryCard).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: expect.not.arrayContaining([expect.stringContaining('Fast chunks (first 5):')]),
      })
    );

    exitSpy.mockRestore();
  });

  it('rejects invalid preset and caption mode', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { captionsCommand } = await import('../../../../src/cli/commands/captions');
    await expect(
      captionsCommand.parseAsync(
        ['--timestamps', 'timestamps.json', '--caption-preset', 'nope', '--caption-mode', 'oops'],
        { from: 'user' }
      )
    ).rejects.toThrow();

    expect(handleCommandError).toHaveBeenCalled();
  });
});
