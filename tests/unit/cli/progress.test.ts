import { describe, expect, it } from 'vitest';
import { createSpinner } from '../../../src/cli/progress';
import { resetCliRuntime, setCliRuntime } from '../../../src/cli/runtime';

describe('cli progress', () => {
  it('does not write to stderr in json mode', () => {
    resetCliRuntime();
    setCliRuntime({ json: true, isTty: true });

    const writes: string[] = [];
    const original = process.stderr.write;
    process.stderr.write = ((chunk: string) => {
      writes.push(chunk);
      return true;
    }) as typeof process.stderr.write;

    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.succeed('Done');

    process.stderr.write = original;

    expect(writes.length).toBe(0);
  });

  it('prints lines in non-tty mode', () => {
    resetCliRuntime();
    setCliRuntime({ json: false, isTty: false });

    const writes: string[] = [];
    const original = process.stderr.write;
    process.stderr.write = ((chunk: string) => {
      writes.push(chunk);
      return true;
    }) as typeof process.stderr.write;

    const spinner = createSpinner('Working...');
    spinner.start();
    spinner.succeed('Done');

    process.stderr.write = original;

    const joined = writes.join('');
    expect(joined).toContain('INFO: Working...');
    expect(joined).toContain('INFO: Done');
  });
});
