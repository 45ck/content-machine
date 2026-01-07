import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync } from 'fs';
import { join } from 'path';

describe('CLI stdout/stderr contract (human mode)', () => {
  it('cm script --dry-run prints to stderr and keeps stdout empty', async () => {
    const result = await runCli(['script', '--topic', 'Redis', '--dry-run'], undefined, 60000);
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe('');
    expect(result.stderr).toContain('Dry-run mode');
  }, 90_000);

  it('cm script --mock prints only the output path to stdout', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'stdout-contract');
    mkdirSync(outDir, { recursive: true });
    const outPath = join(outDir, 'script.json');

    const result = await runCli(
      ['script', '--topic', 'Redis', '--mock', '-o', outPath],
      undefined,
      60000
    );
    expect(result.code).toBe(0);
    expect(result.stdout.trim()).toBe(outPath);
    expect(result.stderr).toContain('Script:');
  }, 90_000);
});
