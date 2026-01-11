import { describe, expect, it } from 'vitest';
import { setOutputWriter } from '../../../src/cli/output';
import { createSpinner } from '../../../src/cli/progress';
import { resetCliRuntime, setCliRuntime } from '../../../src/cli/runtime';

describe('cli progress', () => {
  it('does not write to stderr in json mode', () => {
    resetCliRuntime();
    setCliRuntime({ json: true, isTty: true });

    const writes: string[] = [];
    setOutputWriter((fd, chunk) => {
      if (fd === process.stderr.fd) writes.push(String(chunk));
    });

    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.succeed('Done');

    setOutputWriter(null);

    expect(writes.length).toBe(0);
  });

  it('prints lines in non-tty mode', () => {
    resetCliRuntime();
    setCliRuntime({ json: false, isTty: false });

    const writes: string[] = [];
    setOutputWriter((fd, chunk) => {
      if (fd === process.stderr.fd) writes.push(String(chunk));
    });

    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.succeed('Done');

    setOutputWriter(null);

    const joined = writes.join('');
    expect(joined).toContain('INFO: Working...');
    expect(joined).toContain('INFO: Done');
  });
});
