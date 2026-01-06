import { describe, expect, it, vi } from 'vitest';
import { createSpinner } from '../../../src/cli/progress';
import { resetCliRuntime, setCliRuntime } from '../../../src/cli/runtime';

describe('cli progress', () => {
  it('does not write to stderr in json mode', () => {
    resetCliRuntime();
    setCliRuntime({ json: true, isTty: true });

    const writes: string[] = [];
    const original = process.stderr.write;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stderr.write as any) = (chunk: string) => {
      writes.push(chunk);
      return true;
    };

    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.succeed('Done');

    (process.stderr.write as any) = original;

    expect(writes.length).toBe(0);
  });

  it('prints lines in non-tty mode', () => {
    resetCliRuntime();
    setCliRuntime({ json: false, isTty: false });

    const writes: string[] = [];
    const original = process.stderr.write;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stderr.write as any) = (chunk: string) => {
      writes.push(chunk);
      return true;
    };

    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.succeed('Done');

    (process.stderr.write as any) = original;

    const joined = writes.join('');
    expect(joined).toContain('INFO: Working...');
    expect(joined).toContain('INFO: Done');
  });
});
