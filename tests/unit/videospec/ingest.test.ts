import { describe, expect, it, vi, beforeEach } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

import { resolveVideoInput } from '../../../src/videospec/ingest';

const { spawnMock } = vi.hoisted(() => ({
  spawnMock: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Create a dummy yt-dlp file (just needs to exist for existsSync check). */
async function makeDummyYtDlp(binDir: string): Promise<string> {
  const p = join(binDir, 'yt-dlp-dummy');
  await writeFile(p, '', 'utf-8');
  return p;
}

/** Configure spawn mock to simulate yt-dlp: find -o arg, write dummy output file. */
function setupSpawnMock() {
  spawnMock.mockImplementation((_cmd: string, args: string[]) => {
    const child = new EventEmitter() as EventEmitter & { kill: ReturnType<typeof vi.fn> };
    child.kill = vi.fn();

    const oIdx = args.indexOf('-o');
    const outPath = oIdx >= 0 ? args[oIdx + 1] : null;

    process.nextTick(async () => {
      try {
        if (outPath) {
          const dir = dirname(outPath);
          if (!existsSync(dir)) {
            await mkdir(dir, { recursive: true });
          }
          await writeFile(outPath, 'dummy-video', 'utf-8');
        }
        child.emit('close', 0);
      } catch (err) {
        child.emit('error', err);
      }
    });

    return child;
  });
}

describe('resolveVideoInput', () => {
  beforeEach(() => {
    spawnMock.mockReset();
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

  it('downloads a URL to the cache and uses the cache on subsequent runs', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-videospec-ingest-'));
    const binDir = await mkdtemp(join(tmpdir(), 'cm-videospec-ytdlp-'));
    const prev = process.env.CM_YTDLP_PATH;
    try {
      const yt = await makeDummyYtDlp(binDir);
      process.env.CM_YTDLP_PATH = yt;
      setupSpawnMock();

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
      setupSpawnMock();

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
});
