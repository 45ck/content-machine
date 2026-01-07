import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

function assertPureJson(stdout: string): unknown {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm generate --sync-quality-check', () => {
  it('emits JSON sync fields and exits 0 when rating passes', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'generate-sync-quality-pass');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const outVideo = join(outDir, 'video.mp4');
    const expectedReport = join(outDir, 'sync-report.json');

    const result = await runCli(
      [
        'generate',
        'Redis',
        '--mock',
        '--sync-quality-check',
        '--min-sync-rating',
        '0',
        '--json',
        '-o',
        outVideo,
      ],
      undefined,
      240000
    );

    expect(result.code).toBe(0);
    const parsed = assertPureJson(result.stdout) as any;
    expect(parsed.command).toBe('generate');
    expect(parsed.errors).toEqual([]);
    expect(parsed.outputs.videoPath).toBe(outVideo);
    expect(parsed.outputs.syncReportPath).toBe(expectedReport);
    expect(typeof parsed.outputs.syncRating).toBe('number');
    expect(parsed.outputs.syncPassed).toBe(true);
    expect(parsed.outputs.syncAttempts).toBe(1);

    expect(existsSync(expectedReport)).toBe(true);
  }, 300_000);

  it('exits 1 when rating fails and can auto-retry', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'generate-sync-quality-retry');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const outVideo = join(outDir, 'video.mp4');
    const expectedReport = join(outDir, 'sync-report.json');
    const expectedAttempt1 = join(outDir, 'sync-report-attempt1.json');
    const expectedAttempt2 = join(outDir, 'sync-report-attempt2.json');

    const result = await runCli(
      [
        'generate',
        'Redis',
        '--mock',
        '--sync-quality-check',
        '--auto-retry-sync',
        '--min-sync-rating',
        '100',
        '--json',
        '-o',
        outVideo,
      ],
      undefined,
      300000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout) as any;
    expect(parsed.command).toBe('generate');
    expect(parsed.errors).toEqual([]);
    expect(parsed.outputs.videoPath).toBe(outVideo);
    expect(parsed.outputs.syncReportPath).toBe(expectedReport);
    expect(parsed.outputs.syncPassed).toBe(false);
    expect(parsed.outputs.syncAttempts).toBe(2);

    expect(existsSync(expectedReport)).toBe(true);
    expect(existsSync(expectedAttempt1)).toBe(true);
    expect(existsSync(expectedAttempt2)).toBe(true);
  }, 420_000);
});
