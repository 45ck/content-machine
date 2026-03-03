import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../../src/cli/utils', () => ({
  readInputFile: vi.fn(),
  writeOutputFile: vi.fn(),
  handleCommandError: vi.fn(() => {
    throw new Error('handled');
  }),
}));

vi.mock('../../../../src/publish/generator', () => ({
  generatePublish: vi.fn(),
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

describe('cli publish command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('emits json output', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

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

    const { generatePublish } = await import('../../../../src/publish/generator');
    (generatePublish as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      title: 't',
      hashtags: ['#x'],
      checklist: [],
    });

    const { publishCommand } = await import('../../../../src/cli/commands/publish');
    await publishCommand.parseAsync(['--input', 'script.json'], { from: 'user' });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('publish');
    expect(payload.outputs.publishPath).toBe('publish.json');
  });

  it('prints summary in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

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

    const { generatePublish } = await import('../../../../src/publish/generator');
    (generatePublish as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      title: 't',
      hashtags: ['#x'],
      checklist: [],
    });

    const { publishCommand } = await import('../../../../src/cli/commands/publish');
    await publishCommand.parseAsync(['--input', 'script.json'], { from: 'user' });

    await capture.reset();
    expect(capture.stderr.join('')).toContain('Publish:');
    expect(capture.stdout.join('')).toContain('publish.json');
  });
});
