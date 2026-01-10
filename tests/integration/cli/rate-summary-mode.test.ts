import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync } from 'fs';
import { join } from 'path';

describe('cm rate --summary', () => {
  it('prints a compact summary in human mode', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'rate-summary-mode');
    mkdirSync(outDir, { recursive: true });

    const reportPath = join(outDir, 'sync-report.json');
    const videoPath = join(process.cwd(), 'mock-test.mp4');

    const result = await runCli(
      ['rate', '--input', videoPath, '--mock', '--summary', '--output', reportPath],
      undefined,
      120000
    );

    expect(result.code).toBe(0);
    expect(result.stderr).toContain('rating');
    expect(result.stderr).toContain('Report');
  });
});

