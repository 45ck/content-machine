import { describe, expect, it, vi, beforeEach } from 'vitest';

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

vi.mock('../../../../src/script/generator', () => ({
  generateScript: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
}));

vi.mock('../../../../src/cli/ui', () => ({
  formatKeyValueRows: vi.fn((rows) => rows.map(([k, v]) => `${k}:${v}`)),
  writeSummaryCard: vi.fn(),
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

describe('cli script command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json envelope on dry run', async () => {
    await configureRuntime({ json: true });
    const capture = await captureStdout();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { scriptCommand } = await import('../../../../src/cli/commands/script');
    await scriptCommand.parseAsync(
      ['--topic', 'Redis', '--dry-run', '--duration', '30', '--output', 'out.json'],
      { from: 'user' }
    );

    await capture.reset();
    exitSpy.mockRestore();

    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('script');
    expect(payload.outputs.dryRun).toBe(true);
  });

  it('runs script generation and prints output path in human mode', async () => {
    await configureRuntime({ json: false });
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    const { generateScript } = await import('../../../../src/script/generator');
    (generateScript as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      title: 'Hello',
      scenes: [{ id: 'scene-001', text: 'Hi', shots: [] }],
      meta: { wordCount: 10 },
    });

    const { writeOutputFile } = await import('../../../../src/cli/utils');
    const { writeStdoutLine: _writeStdoutLine } = await import('../../../../src/cli/output');
    const stdoutSpy = vi.spyOn(await import('../../../../src/cli/output'), 'writeStdoutLine');

    const { scriptCommand } = await import('../../../../src/cli/commands/script');
    await scriptCommand.parseAsync(
      ['--topic', 'Redis', '--duration', '45', '--output', 'out.json', '--mock'],
      { from: 'user' }
    );

    exitSpy.mockRestore();

    expect(writeOutputFile).toHaveBeenCalledWith('out.json', expect.any(Object));
    expect(stdoutSpy).toHaveBeenCalledWith('out.json');
  });

  it('handles invalid duration via handleCommandError', async () => {
    await configureRuntime({ json: false });
    const { handleCommandError } = await import('../../../../src/cli/utils');

    const { scriptCommand } = await import('../../../../src/cli/commands/script');
    await expect(
      scriptCommand.parseAsync(['--topic', 'Redis', '--duration', '0', '--output', 'out.json'], {
        from: 'user',
      })
    ).rejects.toThrow('handled');

    expect(handleCommandError).toHaveBeenCalled();
  });
});
