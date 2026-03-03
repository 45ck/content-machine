import { describe, expect, it } from 'vitest';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expandTilde } from '../../../src/cli/paths';

describe('cli paths', () => {
  it('expands "~" to the home directory', () => {
    expect(expandTilde('~')).toBe(homedir());
  });

  it('expands "~/" prefix paths', () => {
    expect(expandTilde('~/projects')).toBe(join(homedir(), 'projects'));
  });

  it('expands "~\\\\" prefix paths (Windows-style)', () => {
    expect(expandTilde('~\\projects')).toBe(join(homedir(), 'projects'));
  });

  it('leaves non-tilde paths unchanged', () => {
    expect(expandTilde('/tmp/file.txt')).toBe('/tmp/file.txt');
  });
});
