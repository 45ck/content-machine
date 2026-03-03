import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn((error: Error) => {
    if (error && error.message === 'exit') return;
    throw new Error('handled');
  }),
}));

vi.mock('../../../../src/score/scorer', () => ({
  scoreScript: vi.fn(),
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

async function configureRuntime(update: { json: boolean }) {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureOutput() {
  const { setOutputWriter } = await import('../../../../src/cli/output');
  const stdout: string[] = [];
  const stderr: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 1) stdout.push(String(chunk));
    if (fd === 2) stderr.push(String(chunk));
  });
  return {
    stdout,
    stderr,
    reset: async () => {
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli score command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json output', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('exit');
    });

    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hi', visualDirection: 'demo' }],
      reasoning: 'ok',
      title: 't',
      meta: {
        archetype: 'listicle',
        topic: 't',
        generatedAt: new Date().toISOString(),
      },
    });

    const { scoreScript } = await import('../../../../src/score/scorer');
    (scoreScript as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      overall: 0.9,
      passed: true,
      checks: [],
    });

    const { scoreCommand } = await import('../../../../src/cli/commands/score');
    await scoreCommand.parseAsync(['--input', 'script.json'], { from: 'user' });

    await capture.reset();
    exitSpy.mockRestore();

    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('score');
    expect(payload.outputs.overall).toBe(0.9);
  });

  it('handles invalid min-overall values', async () => {
    await configureRuntime({ json: false });
    const { readInputFile } = await import('../../../../src/cli/utils');
    (readInputFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hi', visualDirection: 'demo' }],
      reasoning: 'ok',
      title: 't',
      meta: {
        archetype: 'listicle',
        topic: 't',
        generatedAt: new Date().toISOString(),
      },
    });

    const { scoreScript } = await import('../../../../src/score/scorer');
    (scoreScript as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      overall: 0.9,
      passed: true,
      checks: [],
    });

    const { scoreCommand } = await import('../../../../src/cli/commands/score');
    await expect(
      scoreCommand.parseAsync(['--input', 'script.json', '--min-overall', 'bad'], {
        from: 'user',
      })
    ).rejects.toThrow('handled');
  });
});
