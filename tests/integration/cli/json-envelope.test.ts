import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

function assertPureJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('CLI --json envelope contract', () => {
  it('cm script --dry-run --json emits a single JSON object', async () => {
    const result = await runCli(
      ['script', '--topic', 'Redis', '--dry-run', '--json'],
      undefined,
      60000
    );
    expect(result.code).toBe(0);
    const parsed = assertPureJson(result.stdout) as any;
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.command).toBe('script');
    expect(parsed.errors).toEqual([]);
  }, 90_000);

  it.skip('cm script --json invalid research returns exit 2 and fix guidance', async () => {
    const tmpDir = join(process.cwd(), 'tests', '.tmp');
    mkdirSync(tmpDir, { recursive: true });
    const badPath = join(tmpDir, 'bad-research.json');
    writeFileSync(badPath, '{"not":"valid"}', 'utf-8');

    const result = await runCli(
      ['script', '--topic', 'Redis', '--mock', '--json', '--research', badPath],
      undefined,
      60000
    );

    expect(result.code).toBe(2);
    const parsed = assertPureJson(result.stdout) as any;
    expect(parsed.errors[0].code).toBe('SCHEMA_ERROR');
    expect(parsed.errors[0].context.fix).toContain('cm research');
  }, 90_000);

  it('cm audio --json errors are JSON and exit 2 for missing input', async () => {
    const result = await runCli(
      ['audio', '--input', 'missing-script.json', '--json'],
      undefined,
      60000
    );
    expect(result.code).toBe(2);
    const parsed = assertPureJson(result.stdout) as any;
    expect(parsed.errors[0].code).toBe('FILE_NOT_FOUND');
    expect(parsed.errors[0].context.fix).toContain('re-run');
  }, 90_000);
});
