import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync } from 'fs';
import { join } from 'path';

describe('cm script duration validation', () => {
  it('fails fast with exit code 2 for invalid --duration', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'script-duration-validation');
    mkdirSync(outDir, { recursive: true });
    const scriptPath = join(outDir, 'script.json');

    const result = await runCli(
      ['script', '--topic', 'Redis', '--duration', 'abc', '--mock', '--output', scriptPath],
      undefined,
      60000
    );

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('ERROR:');
    expect(result.stderr).toContain('Fix:');
    expect(result.stderr).toContain('--duration');
  });
});
