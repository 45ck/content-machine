import { beforeEach, describe, expect, it, vi } from 'vitest';

async function configureRuntime(update: { json: boolean }): Promise<void> {
  const { resetCliRuntime, setCliRuntime } = await import('../../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime({ json: update.json, isTty: false, verbose: false, offline: false, yes: false });
}

async function captureOutput(): Promise<{
  stderr: string[];
  stdout: string[];
  reset: () => Promise<void>;
}> {
  const { setOutputWriter } = await import('../../../../src/cli/output');
  const stderr: string[] = [];
  const stdout: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 2) stderr.push(String(chunk));
    if (fd === 1) stdout.push(String(chunk));
  });
  return {
    stderr,
    stdout,
    reset: async () => {
      const { setOutputWriter } = await import('../../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli prompts command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists prompts in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { promptsCommand } = await import('../../../../src/cli/commands/prompts');
    await promptsCommand.parseAsync(['list', '--category', 'image-generation', '--limit', '5'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('prompts:list');
    expect(Array.isArray(payload.outputs.prompts)).toBe(true);
    expect(payload.outputs.prompts.length).toBeGreaterThan(0);
  });

  it('shows a Seed Creative template in human mode', async () => {
    await configureRuntime({ json: false });
    const capture = await captureOutput();

    const { promptsCommand } = await import('../../../../src/cli/commands/prompts');
    await promptsCommand.parseAsync(['show', 'image-generation/seedream-hero-still'], {
      from: 'user',
    });

    await capture.reset();
    const out = capture.stderr.join('');
    expect(out).toContain('Prompt: image-generation/seedream-hero-still');
    expect(out).toContain('Variables:');
    expect(out).toContain('Template:');
  });

  it('searches prompts in json mode', async () => {
    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { promptsCommand } = await import('../../../../src/cli/commands/prompts');
    await promptsCommand.parseAsync(['search', 'seedance', '--limit', '3'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('prompts:search');
    expect(Array.isArray(payload.outputs.results)).toBe(true);
    expect(payload.outputs.results.length).toBeGreaterThan(0);
  });
});
