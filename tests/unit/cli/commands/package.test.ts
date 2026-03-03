import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/package/generator', () => ({
  generatePackage: vi.fn(),
}));

vi.mock('../../../../src/cli/utils', () => ({
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
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
    stop() {
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

describe('cli package command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json dry-run output', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { packageCommand } = await import('../../../../src/cli/commands/package');
    await packageCommand.parseAsync(['topic', '--dry-run', '--output', 'pack.json'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('package');
    expect(payload.outputs.dryRun).toBe(true);
  });

  it('handles invalid select values', async () => {
    await configureRuntime({ json: false });
    const { packageCommand } = await import('../../../../src/cli/commands/package');
    await expect(
      packageCommand.parseAsync(['topic', '--select', '0'], { from: 'user' })
    ).rejects.toThrow('handled');
  });

  it('generates packaging in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { generatePackage } = await import('../../../../src/package/generator');
    (generatePackage as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      topic: 'topic',
      platform: 'tiktok',
      variants: [{ title: 'A' }, { title: 'B' }],
      selected: { title: 'A' },
      selectedIndex: 0,
    });

    const { packageCommand } = await import('../../../../src/cli/commands/package');
    await packageCommand.parseAsync(['topic', '--output', 'pack.json', '--mock'], {
      from: 'user',
    });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('Packaging:');
    expect(capture.stdout.join('')).toContain('pack.json');
  });
});
