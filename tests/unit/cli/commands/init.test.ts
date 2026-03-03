import { describe, it, expect, vi, beforeEach } from 'vitest';

const writeFileMock = vi.fn();
vi.mock('fs/promises', () => ({
  writeFile: writeFileMock,
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
    writeFileMock.mockReset();
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
    expect(writeFileMock).toHaveBeenCalled();
    const [, toml] = writeFileMock.mock.calls[0];
    expect(String(toml)).toContain('[visuals]');
    expect(String(toml)).toContain('motion_strategy = "kenburns"');
    expect(String(toml)).toContain('[visuals.nanobanana]');
    expect(String(toml)).toContain('model = "gemini-2.5-flash-image"');
    expect(String(toml)).not.toContain('fallback_provider');
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
      .mockResolvedValueOnce({ voice: 'af_heart' })
      .mockResolvedValueOnce({ visualsProvider: 'pexels' });

    const { initCommand } = await import('../../../../src/cli/commands/init');
    await initCommand.parseAsync([], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('Configuration saved');
    expect(capture.stdout.join('')).toContain('.content-machine.toml');
  });
});
