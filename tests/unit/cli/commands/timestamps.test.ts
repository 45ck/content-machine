import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: Error) => {
    if (error && error.message === 'exit') return;
  }),
}));

vi.mock('../../../../src/cli/progress', () => ({
  createSpinner: vi.fn(() => ({
    text: '',
    start() {
      return this;
    },
    succeed() {
      return this;
    },
    fail() {
      return this;
    },
  })),
}));

vi.mock('../../../../src/cli/ui', () => ({
  formatKeyValueRows: vi.fn((rows) => rows.map(([k, v]) => `${k}:${v}`)),
  writeSummaryCard: vi.fn(),
}));

vi.mock('../../../../src/importers/timestamps', () => ({
  generateTimestamps: vi.fn(),
}));

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureStdout() {
  const { setOutputWriter } = await import('../../../../src/cli/output');
  const stdout: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 1) stdout.push(String(chunk));
  });
  return {
    stdout,
    reset: async () => {
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli timestamps command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fails when audio path is missing', async () => {
    await configureRuntime({ json: false });
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { handleCommandError } = await import('../../../../src/cli/utils');
    const { timestampsCommand } = await import('../../../../src/cli/commands/timestamps');
    await timestampsCommand.parseAsync(['--audio', 'missing.wav'], { from: 'user' });
    expect(handleCommandError).toHaveBeenCalled();
  });

  it('emits json output when requested', async () => {
    await configureRuntime({ json: true });
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);
    const { generateTimestamps } = await import('../../../../src/importers/timestamps');
    (generateTimestamps as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalDuration: 2,
      allWords: [{ word: 'Hi', start: 0, end: 1 }],
      scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 2, words: [] }],
      schemaVersion: 'audio-v1',
      ttsEngine: 'external',
      asrEngine: 'whisper',
    });

    const capture = await captureStdout();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    const { timestampsCommand } = await import('../../../../src/cli/commands/timestamps');
    await timestampsCommand.parseAsync(['--audio', 'audio.wav', '--output', 'out.json'], {
      from: 'user',
    });

    await capture.reset();
    exitSpy.mockRestore();

    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('timestamps');
    expect(payload.outputs.timestampsPath).toBe('out.json');
  });

  it('writes output and summary in human mode', async () => {
    await configureRuntime({ json: false });
    const { existsSync } = await import('fs');
    (existsSync as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { generateTimestamps } = await import('../../../../src/importers/timestamps');
    (generateTimestamps as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalDuration: 2,
      allWords: [{ word: 'Hi', start: 0, end: 1 }],
      scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 2, words: [] }],
      schemaVersion: 'audio-v1',
      ttsEngine: 'external',
      asrEngine: 'whisper',
    });

    const { writeOutputFile } = await import('../../../../src/cli/utils');
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { timestampsCommand } = await import('../../../../src/cli/commands/timestamps');
    await timestampsCommand.parseAsync(['--audio', 'audio.wav', '--output', 'out.json'], {
      from: 'user',
    });

    exitSpy.mockRestore();
    expect(writeOutputFile).toHaveBeenCalledWith('out.json', expect.any(Object));
  });
});
