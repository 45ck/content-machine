import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

describe('core doctor', () => {
  it('fails when Whisper is missing (default pipeline)', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'doctor', 'missing-whisper');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const prevHome = process.env.HOME;
    const prevWhisperDir = process.env.CM_WHISPER_DIR;
    const prevOpenAi = process.env.OPENAI_API_KEY;
    const prevPexels = process.env.PEXELS_API_KEY;

    const whisperDir = join(outDir, 'whisper');
    process.env.HOME = outDir;
    process.env.CM_WHISPER_DIR = whisperDir;
    delete process.env.OPENAI_API_KEY;
    delete process.env.PEXELS_API_KEY;

    const { clearConfigCache } = await import('../../../src/core/config');
    clearConfigCache();

    const { runDoctor } = await import('../../../src/core/doctor');
    const report = await runDoctor({ strict: false });

    const modelCheck = report.checks.find((c) => c.label === 'Whisper model');
    expect(modelCheck?.status).toBe('fail');
    expect(modelCheck?.fix).toContain('cm setup whisper');

    const binaryCheck = report.checks.find((c) => c.label === 'Whisper binary');
    expect(binaryCheck?.status).toBe('fail');

    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (prevWhisperDir === undefined) delete process.env.CM_WHISPER_DIR;
    else process.env.CM_WHISPER_DIR = prevWhisperDir;
    if (prevOpenAi === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = prevOpenAi;
    if (prevPexels === undefined) delete process.env.PEXELS_API_KEY;
    else process.env.PEXELS_API_KEY = prevPexels;
  });
});
