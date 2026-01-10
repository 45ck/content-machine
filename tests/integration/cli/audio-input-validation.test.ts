import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('cm audio input validation', () => {
  it('fails fast with a Fix: hint when input JSON is not a script.json', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'audio-input-validation');
    mkdirSync(outDir, { recursive: true });

    const badInputPath = join(outDir, 'not-a-script.json');
    writeFileSync(badInputPath, JSON.stringify({ schemaVersion: '1.0.0' }, null, 2), 'utf-8');

    const result = await runCli(['audio', '--input', badInputPath, '--mock'], undefined, 60000);

    expect(result.code).toBe(2);
    expect(result.stderr).toContain('ERROR:');
    expect(result.stderr).toContain('Fix:');
    expect(result.stderr).toContain('cm script');
  });
});

