import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, chmod, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { resolveVideoInput } from '../../../src/videospec/ingest';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function makeDummyYtDlp(binDir: string): Promise<string> {
  const p = join(binDir, 'yt-dlp-dummy.cjs');
  const script = `const fs = require('node:fs');
const path = require('node:path');

const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('dummy');
  process.exit(0);
}

const outIndex = args.indexOf('-o');
if (outIndex === -1 || !args[outIndex + 1]) {
  console.error('missing -o');
  process.exit(2);
}

const out = args[outIndex + 1];
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, 'dummy-video');
`;
  await writeFile(p, script, 'utf-8');
  await chmod(p, 0o755);
  return p;
}

async function makeFailingDummyYtDlp(binDir: string): Promise<string> {
  const p = join(binDir, 'yt-dlp-failing.cjs');
  const script = `const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('dummy');
  process.exit(0);
}

console.error('download failed');
process.exit(3);
`;
  await writeFile(p, script, 'utf-8');
  await chmod(p, 0o755);
  return p;
}

async function makeDummyYtDlpCmd(binDir: string): Promise<string> {
  const p = join(binDir, 'yt-dlp-dummy.cmd');
  const script = `@echo off
setlocal EnableDelayedExpansion

if "%~1"=="--version" (
  echo dummy
  exit /b 0
)

set "out="
set "capture="
for %%A in (%*) do (
  if defined capture (
    set "out=%%~A"
    set "capture="
  ) else if "%%~A"=="-o" (
    set "capture=1"
  )
)

if "%out%"=="" (
  echo missing -o 1>&2
  exit /b 2
)

for %%I in ("%out%") do (
  if not exist "%%~dpI" mkdir "%%~dpI"
)
> "%out%" echo dummy-video
exit /b 0
`;
  await writeFile(p, script, 'utf-8');
  return p;
}

describe('resolveVideoInput', () => {
  it('rejects missing input', async () => {
    await expect(resolveVideoInput({ input: '', cache: true })).rejects.toMatchObject({
      code: 'INVALID_ARGUMENT',
    });
  });

  it('resolves a local file path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-videospec-ingest-'));
    try {
      const videoPath = join(dir, 'in.mp4');
      await writeFile(videoPath, 'x', 'utf-8');

      const r = await resolveVideoInput({ input: videoPath, cache: true });
      expect(resolve(r.inputPath)).toBe(resolve(videoPath));
      expect(r.inputSource).toBe(videoPath);
      expect(r.cleanup).toBeUndefined();
      expect(r.provenanceSeed?.modules?.video_ingestion).toBe('file');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects a missing local file path', async () => {
    const missingPath = join(tmpdir(), `cm-videospec-missing-${Date.now()}.mp4`);

    await expect(resolveVideoInput({ input: missingPath, cache: true })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('downloads a URL to the cache and uses the cache on subsequent runs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-videospec-ingest-'));
    const binDir = await mkdtemp(join(tmpdir(), 'cm-videospec-ytdlp-'));
    const prev = process.env.CM_YTDLP_PATH;
    try {
      const yt = await makeDummyYtDlp(binDir);
      process.env.CM_YTDLP_PATH = yt;

      const url = 'https://example.com/video';
      const r1 = await resolveVideoInput({ input: url, cache: true, cacheDir: dir });
      expect(r1.inputSource).toBe(url);
      expect(r1.cleanup).toBeUndefined();
      expect(r1.provenanceSeed?.modules?.video_ingestion).toContain('yt-dlp (');
      expect(existsSync(r1.inputPath)).toBe(true);
      expect(r1.inputPath).toContain(join(dir, 'downloads'));

      const key = sha256Hex(url).slice(0, 24);
      const metaPath = join(dir, 'downloads', `${key}.source.json`);
      expect(existsSync(metaPath)).toBe(true);
      const meta = JSON.parse(await readFile(metaPath, 'utf-8')) as { url: string };
      expect(meta.url).toBe(url);

      const r2 = await resolveVideoInput({ input: url, cache: true, cacheDir: dir });
      expect(r2.inputPath).toBe(r1.inputPath);
      expect(r2.provenanceSeed?.modules?.video_ingestion).toBe('yt-dlp (cache-hit)');
    } finally {
      if (prev === undefined) delete process.env.CM_YTDLP_PATH;
      else process.env.CM_YTDLP_PATH = prev;
      await rm(dir, { recursive: true, force: true });
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('downloads a URL to a temp file when cache is disabled and cleanup removes it', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-videospec-ingest-'));
    const binDir = await mkdtemp(join(tmpdir(), 'cm-videospec-ytdlp-'));
    const prev = process.env.CM_YTDLP_PATH;
    try {
      const yt = await makeDummyYtDlp(binDir);
      process.env.CM_YTDLP_PATH = yt;

      const url = 'https://example.com/video2';
      const r = await resolveVideoInput({ input: url, cache: false, cacheDir: dir });
      expect(existsSync(r.inputPath)).toBe(true);
      expect(r.cleanup).toBeTypeOf('function');
      await r.cleanup?.();
      expect(existsSync(r.inputPath)).toBe(false);
      expect(r.provenanceSeed?.modules?.video_ingestion).toBe('yt-dlp (tmp)');
    } finally {
      if (prev === undefined) delete process.env.CM_YTDLP_PATH;
      else process.env.CM_YTDLP_PATH = prev;
      await rm(dir, { recursive: true, force: true });
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it('fails with a dependency error when yt-dlp is unavailable for URL inputs', async () => {
    const prev = process.env.CM_YTDLP_PATH;

    try {
      delete process.env.CM_YTDLP_PATH;

      await expect(
        resolveVideoInput({ input: 'https://example.com/no-ytdlp', cache: true })
      ).rejects.toMatchObject({
        code: 'DEPENDENCY_MISSING',
      });
    } finally {
      if (prev === undefined) delete process.env.CM_YTDLP_PATH;
      else process.env.CM_YTDLP_PATH = prev;
    }
  });

  it('surfaces yt-dlp download failures as external tool errors', async () => {
    const binDir = await mkdtemp(join(tmpdir(), 'cm-videospec-ytdlp-fail-'));
    const prev = process.env.CM_YTDLP_PATH;

    try {
      process.env.CM_YTDLP_PATH = await makeFailingDummyYtDlp(binDir);

      await expect(
        resolveVideoInput({ input: 'https://example.com/failure', cache: true })
      ).rejects.toMatchObject({
        code: 'EXTERNAL_TOOL_FAILED',
      });
    } finally {
      if (prev === undefined) delete process.env.CM_YTDLP_PATH;
      else process.env.CM_YTDLP_PATH = prev;
      await rm(binDir, { recursive: true, force: true });
    }
  });

  it.runIf(process.platform === 'win32')(
    'supports cmd-based yt-dlp shims from CM_YTDLP_PATH',
    async () => {
      const dir = await mkdtemp(join(tmpdir(), 'cm-videospec-ingest-cmd-'));
      const binDir = await mkdtemp(join(tmpdir(), 'cm-videospec-ytdlp-cmd-'));
      const prev = process.env.CM_YTDLP_PATH;

      try {
        process.env.CM_YTDLP_PATH = await makeDummyYtDlpCmd(binDir);

        const url = 'https://example.com/cmd';
        const result = await resolveVideoInput({ input: url, cache: true, cacheDir: dir });

        expect(existsSync(result.inputPath)).toBe(true);
        expect(result.provenanceSeed?.modules?.video_ingestion).toBe('yt-dlp (cache-write)');
      } finally {
        if (prev === undefined) delete process.env.CM_YTDLP_PATH;
        else process.env.CM_YTDLP_PATH = prev;
        await rm(dir, { recursive: true, force: true });
        await rm(binDir, { recursive: true, force: true });
      }
    }
  );
});
