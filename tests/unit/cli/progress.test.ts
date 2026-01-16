import { describe, expect, it, vi } from 'vitest';

async function configureRuntime(update: { json: boolean; isTty: boolean }): Promise<void> {
  const { resetCliRuntime, setCliRuntime } = await import('../../../src/cli/runtime');
  resetCliRuntime();
  setCliRuntime(update);
}

async function captureOutput(): Promise<{
  stderr: string[];
  reset: () => Promise<void>;
}> {
  const { setOutputWriter } = await import('../../../src/cli/output');
  const stderr: string[] = [];
  setOutputWriter((fd, chunk) => {
    if (fd === 2) stderr.push(String(chunk));
  });
  return {
    stderr,
    reset: async () => {
      const { setOutputWriter } = await import('../../../src/cli/output');
      setOutputWriter(null);
    },
  };
}

describe('cli progress', () => {
  it('does not write to stderr in json mode', async () => {
    await configureRuntime({ json: true, isTty: true });
    const capture = await captureOutput();

    const { createSpinner } = await import('../../../src/cli/progress');
    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.fail('Nope');
    spinner.succeed('Done');
    spinner.stop();

    await capture.reset();
    expect(capture.stderr.length).toBe(0);
  });

  it('prints lines in non-tty mode', async () => {
    await configureRuntime({ json: false, isTty: false });
    const capture = await captureOutput();

    const { createSpinner } = await import('../../../src/cli/progress');
    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.fail('Nope');
    spinner.succeed('Done');

    await capture.reset();

    const joined = capture.stderr.join('');
    expect(joined).toContain('INFO: Working...');
    expect(joined).toContain('ERROR: Nope');
    expect(joined).toContain('INFO: Done');
  });

  it('uses ora when running in a TTY', async () => {
    vi.resetModules();
    const ora = vi.fn(() => ({
      text: '',
      start: () => ({ text: '' }),
      succeed: () => ({ text: '' }),
      fail: () => ({ text: '' }),
      stop: () => ({ text: '' }),
    }));
    vi.doMock('ora', () => ({ default: ora }));

    await configureRuntime({ json: false, isTty: true });

    const { createSpinner } = await import('../../../src/cli/progress');
    const spinner = createSpinner('Working...');

    expect(ora).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Working...', isEnabled: true, stream: process.stderr })
    );
    expect(spinner).toBeDefined();
  });
});
