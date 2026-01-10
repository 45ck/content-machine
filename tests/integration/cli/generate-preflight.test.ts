import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm generate --preflight', () => {
  it('emits a JSON envelope and does not create output files', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'generate-preflight');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const outVideo = join(outDir, 'video.mp4');
    const result = await runCli(
      ['generate', 'Redis', '--mock', '--preflight', '--json', '-o', outVideo],
      undefined,
      60000
    );

    expect(result.code).toBe(0);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('generate');
    expect(parsed.errors).toEqual([]);
    expect(parsed.outputs.preflightPassed).toBe(true);
    expect(Array.isArray(parsed.outputs.checks)).toBe(true);
    expect(existsSync(outVideo)).toBe(false);
  }, 90_000);

  it('fails fast on missing gameplay path', async () => {
    const result = await runCli(
      ['generate', 'Redis', '--mock', '--preflight', '--json', '--gameplay', 'missing.mp4'],
      undefined,
      60000
    );

    expect(result.code).toBe(2);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.errors[0].code).toBe('FILE_NOT_FOUND');
  }, 90_000);
});
