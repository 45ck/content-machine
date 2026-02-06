import { describe, expect, it, beforeEach } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

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

function uniqueTmpPath(name: string): string {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return join(tmpdir(), `content-machine-${name}-${id}`);
}

describe('cli feedback command', () => {
  beforeEach(() => {
    // Ensure module state doesn't leak between tests (inquirer cache, etc.)
  });

  it('adds an entry and lists it in JSON mode', async () => {
    const artifactsDir = uniqueTmpPath('artifacts');
    const storePath = join(uniqueTmpPath('store'), 'feedback.jsonl');
    await mkdir(artifactsDir, { recursive: true });
    // Provide a script.json so topic inference has something to read.
    await writeFile(
      join(artifactsDir, 'script.json'),
      JSON.stringify({ meta: { topic: 'Test topic' } }, null, 2),
      'utf-8'
    );

    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { feedbackCommand } = await import('../../../../src/cli/commands/feedback');
    await feedbackCommand.parseAsync(
      [
        'add',
        artifactsDir,
        '--store',
        storePath,
        '--no-interactive',
        '--overall',
        '88',
        '--script',
        '77',
        '--visuals',
        '66',
        '--captions',
        '55',
        '--sync',
        '44',
        '--notes',
        'needs tighter hook',
      ],
      { from: 'user' }
    );

    // Clear previous stdout, then list.
    capture.stdout.length = 0;

    await feedbackCommand.parseAsync(['list', '--store', storePath, '--limit', '5'], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('feedback:list');
    expect(payload.outputs.entries.length).toBeGreaterThanOrEqual(1);
    expect(payload.outputs.entries[0].topic).toBe('Test topic');
    expect(payload.outputs.entries[0].ratings.overall).toBe(88);
  });

  it('exports entries to a JSON file in JSON mode', async () => {
    const artifactsDir = uniqueTmpPath('artifacts');
    const storePath = join(uniqueTmpPath('store'), 'feedback.jsonl');
    const exportPath = join(uniqueTmpPath('export'), 'feedback.export.json');
    await mkdir(artifactsDir, { recursive: true });

    await configureRuntime({ json: true });
    const capture = await captureOutput();

    const { feedbackCommand } = await import('../../../../src/cli/commands/feedback');
    await feedbackCommand.parseAsync(
      ['add', artifactsDir, '--store', storePath, '--no-interactive', '--overall', '70'],
      { from: 'user' }
    );

    capture.stdout.length = 0;

    await feedbackCommand.parseAsync(['export', '--store', storePath, '-o', exportPath], {
      from: 'user',
    });

    await capture.reset();
    const payload = JSON.parse(capture.stdout.join(''));
    expect(payload.command).toBe('feedback:export');
    expect(payload.outputs.count).toBeGreaterThanOrEqual(1);
    expect(payload.outputs.path).toBe(exportPath);
  });
});
