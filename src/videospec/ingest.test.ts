import { describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile, chmod, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolveVideoInput } from './ingest';

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function makeDummyYtDlp(binDir: string): Promise<string> {
  const p = join(binDir, 'yt-dlp-dummy.sh');
  const script = `#!/usr/bin/env bash
set -euo pipefail

if [[ "\${1:-}" == "--version" ]]; then
  echo "dummy"
  exit 0
fi

out=""
for ((i=1; i<=$#; i++)); do
  arg="\${!i}"
  if [[ "$arg" == "-o" ]]; then
    j=$((i+1))
    out="\${!j}"
  fi
done

if [[ -z "$out" ]]; then
  echo "missing -o" >&2
  exit 2
fi

mkdir -p "$(dirname "$out")"
printf "dummy-video" > "$out"
exit 0
`;
  await writeFile(p, script, 'utf-8');
  await chmod(p, 0o755);
  return p;
}

describe('resolveVideoInput', () => {
  it('resolves a local file path', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-videospec-ingest-'));
    try {
      const videoPath = join(dir, 'in.mp4');
      await writeFile(videoPath, 'x', 'utf-8');

      const r = await resolveVideoInput({ input: videoPath, cache: true });
      expect(resolve(r.inputPath)).toBe(resolve(videoPath));
      expect(r.inputSource).toBe(videoPath);
      expect(r.provenanceSeed?.modules?.video_ingestion).toBe('file');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('downloads a URL to the cache when cache is enabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-videospec-ingest-'));
    const binDir = await mkdtemp(join(tmpdir(), 'cm-videospec-ytdlp-'));
    const prev = process.env.CM_YTDLP_PATH;
    try {
      const yt = await makeDummyYtDlp(binDir);
      process.env.CM_YTDLP_PATH = yt;

      const url = 'https://example.com/video';
      const r = await resolveVideoInput({ input: url, cache: true, cacheDir: dir });

      expect(r.inputSource).toBe(url);
      expect(r.cleanup).toBeUndefined();
      expect(r.provenanceSeed?.modules?.video_ingestion?.startsWith('yt-dlp (')).toBe(true);
      expect(existsSync(r.inputPath)).toBe(true);
      expect(r.inputPath).toContain(join(dir, 'downloads'));

      const key = sha256Hex(url).slice(0, 24);
      const metaPath = join(dir, 'downloads', `${key}.source.json`);
      expect(existsSync(metaPath)).toBe(true);
      const meta = JSON.parse(await readFile(metaPath, 'utf-8')) as { url: string };
      expect(meta.url).toBe(url);
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
    } finally {
      if (prev === undefined) delete process.env.CM_YTDLP_PATH;
      else process.env.CM_YTDLP_PATH = prev;
      await rm(dir, { recursive: true, force: true });
      await rm(binDir, { recursive: true, force: true });
    }
  });
});
