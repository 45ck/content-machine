import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { join } from 'path';

describe('cm visuals input validation', () => {
  it('fails fast with a Fix: hint when given script.json instead of timestamps.json', async () => {
    const scriptPath = join(process.cwd(), 'test-fixtures', 'script.json');

    const result = await runCli(['visuals', '--input', scriptPath, '--mock'], undefined, 60000);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('ERROR:');
    expect(result.stderr).toContain('Fix:');
    expect(result.stderr).toContain('cm audio');
  });
});

