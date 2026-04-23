import { describe, expect, it } from 'vitest';
import { runCli } from './helpers';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm assets', () => {
  it('cm assets paths --json emits resolved cache paths', async () => {
    const result = await runCli(['assets', 'paths', '--json'], undefined, 60000);
    expect(result.code).toBe(0);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('assets:paths');
    expect(parsed.errors).toEqual([]);
    expect(typeof parsed.outputs.whisperDir).toBe('string');
    expect(typeof parsed.outputs.hooksDir).toBe('string');
    expect(typeof parsed.outputs.assetCacheDir).toBe('string');
  }, 90_000);

  it('cm assets whisper status fails when Whisper is missing', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'assets-command', 'whisper-missing');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const whisperDir = join(outDir, 'whisper');

    const result = await runCli(
      ['assets', 'whisper', 'status', '--json', '--model', 'base'],
      { CM_WHISPER_DIR: whisperDir },
      60000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('assets:whisper:status');
    expect(parsed.errors.some((e: any) => e.code === 'DEPENDENCY_MISSING')).toBe(true);
  }, 90_000);

  it('cm --offline assets whisper install fails fast (no downloads)', async () => {
    const outDir = join(
      process.cwd(),
      'tests',
      '.tmp',
      'assets-command',
      'whisper-install-offline'
    );
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const whisperDir = join(outDir, 'whisper');

    const result = await runCli(
      ['--offline', 'assets', 'whisper', 'install', '--json', '--model', 'base'],
      { CM_WHISPER_DIR: whisperDir },
      60000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('assets:whisper:install');
    expect(parsed.errors[0].code).toBe('OFFLINE');
  }, 90_000);
});
