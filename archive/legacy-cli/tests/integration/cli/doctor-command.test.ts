import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { runCli } from './helpers';

function assertPureJson(stdout: string): any {
  const trimmed = stdout.trim();
  expect(trimmed.startsWith('{')).toBe(true);
  expect(trimmed.endsWith('}')).toBe(true);
  return JSON.parse(trimmed);
}

describe('cm doctor', () => {
  it('emits json output and fails when whisper is missing', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'doctor-command', 'missing-whisper');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const fakeHome = join(outDir, 'home');
    mkdirSync(fakeHome, { recursive: true });

    const whisperDir = join(fakeHome, '.cm', 'assets', 'whisper');

    const result = await runCli(
      ['--json', 'doctor'],
      {
        HOME: fakeHome,
        CM_WHISPER_DIR: whisperDir,
        OPENAI_API_KEY: '',
        PEXELS_API_KEY: '',
      },
      60_000
    );

    expect(result.code).toBe(1);
    const parsed = assertPureJson(result.stdout);
    expect(parsed.command).toBe('doctor');
    expect(parsed.outputs.ok).toBe(false);
    expect(parsed.outputs.checks.some((c: any) => c.label === 'Whisper model')).toBe(true);
  });
});
