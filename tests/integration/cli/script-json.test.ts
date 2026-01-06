import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

describe('cm script --json', () => {
  it('includes research path in dry-run JSON output', async () => {
    const result = await runCli([
      'script',
      '--topic',
      'Redis caching',
      '--dry-run',
      '--json',
      '--research',
      'research.json',
    ]);

    expect(result.code).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.command).toBe('script');
    expect(parsed.args.research).toBe('research.json');
    expect(parsed.outputs.dryRun).toBe(true);
  });

  it('returns schema error JSON when research file is invalid', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp');
    mkdirSync(tmpDir, { recursive: true });
    const badPath = join(tmpDir, 'bad-research.json');
    writeFileSync(badPath, '{"not":"valid"}', 'utf-8');

    const result = await runCli([
      'script',
      '--topic',
      'Redis caching',
      '--mock',
      '--json',
      '--research',
      badPath,
    ]);

    expect(result.code).toBe(2);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.errors[0].code).toBe('SCHEMA_ERROR');
    expect(parsed.errors[0].context.fix).toContain('cm research');
  });
});
