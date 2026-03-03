import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { CMError } from '../core/errors';
import { resolveVideoSpecCacheDir } from './cache';

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function findUpwards(startDir: string, relPath: string, maxHops = 10): string | null {
  let current = resolve(startDir);
  for (let i = 0; i < maxHops; i++) {
    const candidate = join(current, relPath);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return null;
}

async function spawnOk(command: string, args: string[], timeoutMs: number): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: 'ignore' });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`));
    }, timeoutMs);

    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolvePromise();
      else reject(new Error(`Command failed (${code ?? 'null'}): ${command} ${args.join(' ')}`));
    });
  });
}

export interface ResolvedVideoInput {
  inputPath: string;
  inputSource: string;
  cleanup?: () => Promise<void>;
  provenanceSeed?: { modules?: Record<string, string>; notes?: string[] };
}

function computeDownloadPaths(params: { cacheRoot: string; url: string }): {
  downloadsDir: string;
  cacheKey: string;
  videoPath: string;
  metaPath: string;
} {
  const cacheKey = sha256Hex(params.url.trim()).slice(0, 24);
  const downloadsDir = join(params.cacheRoot, 'downloads');
  const videoPath = join(downloadsDir, `${cacheKey}.mp4`);
  const metaPath = join(downloadsDir, `${cacheKey}.source.json`);
  return { downloadsDir, cacheKey, videoPath, metaPath };
}

async function resolveYtDlpBinary(): Promise<string | null> {
  const env = process.env.CM_YTDLP_PATH;
  if (env && existsSync(env)) return env;

  // Repo-friendly fallback: a checked-in virtualenv (if present).
  const venvPosix = findUpwards(process.cwd(), join('.venv-yt-dlp', 'bin', 'yt-dlp'));
  if (venvPosix) return venvPosix;
  const venvWin = findUpwards(process.cwd(), join('.venv-yt-dlp', 'Scripts', 'yt-dlp.exe'));
  if (venvWin) return venvWin;

  try {
    await spawnOk('yt-dlp', ['--version'], 8000);
    return 'yt-dlp';
  } catch {
    // ignore
  }

  return null;
}

/**
 * Resolve an input that may be a local file path or an http(s) URL.
 * URL inputs are downloaded via yt-dlp to a local mp4 so ffmpeg/ffprobe can run.
 */
export async function resolveVideoInput(params: {
  input: string;
  cache: boolean;
  cacheDir?: string;
}): Promise<ResolvedVideoInput> {
  const input = String(params.input ?? '').trim();
  if (!input) {
    throw new CMError('INVALID_ARGUMENT', 'Missing input', { fix: 'Pass -i <path-or-url>' });
  }

  if (!isHttpUrl(input)) {
    const abs = resolve(input);
    if (!existsSync(abs)) {
      throw new CMError('NOT_FOUND', `Input video not found: ${abs}`, {
        fix: 'Pass a valid path, or pass an http(s) URL to download with yt-dlp.',
      });
    }
    return {
      inputPath: abs,
      inputSource: input,
      provenanceSeed: { modules: { video_ingestion: 'file' } },
    };
  }

  const ytDlp = await resolveYtDlpBinary();
  if (!ytDlp) {
    throw new CMError('DEPENDENCY_MISSING', 'yt-dlp is required to analyze a URL input', {
      fix: 'Install yt-dlp (and ffmpeg), or set CM_YTDLP_PATH=/abs/path/to/yt-dlp.',
    });
  }

  const cacheRoot = resolveVideoSpecCacheDir(params.cacheDir);
  const { downloadsDir, videoPath, metaPath } = computeDownloadPaths({ cacheRoot, url: input });

  if (params.cache && existsSync(videoPath)) {
    return {
      inputPath: videoPath,
      inputSource: input,
      provenanceSeed: { modules: { video_ingestion: 'yt-dlp (cache-hit)' } },
    };
  }

  await mkdir(downloadsDir, { recursive: true });
  const tmpOut = join(downloadsDir, `${basename(videoPath)}.${Date.now()}.tmp.mp4`);

  const args = [
    '--no-playlist',
    '--no-progress',
    '--retries',
    '3',
    '--fragment-retries',
    '3',
    '-f',
    'bv*+ba/b',
    '--merge-output-format',
    'mp4',
    '-o',
    tmpOut,
    input,
  ];

  try {
    await spawnOk(ytDlp, args, 5 * 60_000);
  } catch (error) {
    await rm(tmpOut, { force: true }).catch(() => undefined);
    throw new CMError(
      'EXTERNAL_TOOL_FAILED',
      `Failed to download URL input with yt-dlp: ${input}`,
      {
        fix: 'Verify the URL is accessible. Ensure yt-dlp is up to date and ffmpeg is installed.',
        meta: { error: error instanceof Error ? error.message : String(error) },
      }
    );
  }

  const promoteTo = params.cache ? videoPath : join(tmpdir(), `cm-videospec.${Date.now()}.mp4`);
  await mkdir(dirname(promoteTo), { recursive: true });
  await rename(tmpOut, promoteTo);

  const sourceMeta = {
    url: input,
    downloaded_at: new Date().toISOString(),
    downloader: ytDlp,
  };
  await writeFile(metaPath, JSON.stringify(sourceMeta, null, 2), 'utf-8').catch(() => undefined);

  return {
    inputPath: promoteTo,
    inputSource: input,
    cleanup: params.cache
      ? undefined
      : async () => {
          await rm(promoteTo, { force: true });
        },
    provenanceSeed: {
      modules: { video_ingestion: `yt-dlp (${params.cache ? 'cache-write' : 'tmp'})` },
    },
  };
}
