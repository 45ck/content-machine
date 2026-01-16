import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

vi.mock('../../../../src/cli/utils', () => ({
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
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

describe('cli init command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('writes config in json mode with defaults', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { initCommand } = await import('../../../../src/cli/commands/init');
    await initCommand.parseAsync(['--yes'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('init');
    expect(payload.outputs.configPath).toContain('.content-machine.toml');
  });

  it('prompts when not using --yes and prints hints', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const inquirer = (await import('inquirer')).default;
    (inquirer.prompt as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ llmProvider: 'openai' })
      .mockResolvedValueOnce({ llmModel: 'gpt-4o' })
      .mockResolvedValueOnce({ archetype: 'listicle' })
      .mockResolvedValueOnce({ orientation: 'portrait' })
      .mockResolvedValueOnce({ voice: 'af_heart' });

    const { initCommand } = await import('../../../../src/cli/commands/init');
    await initCommand.parseAsync([], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('Configuration saved');
    expect(capture.stdout.join('')).toContain('.content-machine.toml');
  });
});
