import { createWriteStream, existsSync } from 'fs';
import { mkdir, rename } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { homedir } from 'os';
import { basename, join, resolve } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { DEFAULT_HOOKS_DIR, DEFAULT_HOOK_LIBRARY } from '../src/hooks/constants';
import { TRANSITIONAL_HOOKS } from '../src/hooks/libraries/transitionalhooks';
import type { HookDefinition } from '../src/hooks/schema';

type ArgValue = string | undefined;
const execFileAsync = promisify(execFile);
const DEFAULT_LIBRARY_PAGE = 'https://transitionalhooks.com/social-media-video-hook-library/';
const HOOK_URL_PATTERN = /https:\/\/transitionalhooks\.com\/wp-content\/uploads\/[^"'\s<>]+\.mp4/gi;

function readArg(flag: string): ArgValue {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseInteger(value: ArgValue, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function expandTilde(inputPath: string): string {
  if (inputPath === '~') return homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return join(homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function resolveLibrary(library: string): HookDefinition[] {
  if (library === 'transitionalhooks') return TRANSITIONAL_HOOKS;
  throw new Error(`Unknown hook library: ${library}`);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  return base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildHookDefinitionFromUrl(url: string): HookDefinition {
  const parsed = new URL(url);
  const filename = decodeURIComponent(basename(parsed.pathname));
  const base = filename.replace(/\.[^.]+$/, '');
  return {
    id: slugify(base),
    title: titleFromFilename(filename),
    filename,
    url,
  };
}

function extractHookUrls(html: string): string[] {
  const matches = html.match(HOOK_URL_PATTERN) ?? [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const match of matches) {
    const normalized = match.split('?')[0];
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    urls.push(normalized);
  }
  return urls;
}

function ensureUniqueIds(entries: HookDefinition[]): HookDefinition[] {
  const seen = new Map<string, number>();
  return entries.map((entry) => {
    const count = seen.get(entry.id) ?? 0;
    seen.set(entry.id, count + 1);
    if (count === 0) return entry;
    return { ...entry, id: `${entry.id}-${count + 1}` };
  });
}

async function scrapeHookLibrary(pageUrl: string): Promise<HookDefinition[]> {
  const response = await fetch(pageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch hook library page: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  const urls = extractHookUrls(html);
  if (urls.length === 0) {
    throw new Error(`No hook clips found on ${pageUrl}`);
  }
  return ensureUniqueIds(urls.map(buildHookDefinitionFromUrl));
}

async function downloadHook(entry: HookDefinition, targetDir: string, force: boolean): Promise<void> {
  const destination = join(targetDir, entry.filename);
  if (!force && existsSync(destination)) {
    console.log(`[cached] ${entry.id}`);
    return;
  }

  const response = await fetch(entry.url);
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${entry.id}: ${response.status} ${response.statusText}`);
  }

  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
  console.log(`[downloaded] ${entry.id} -> ${destination}`);
}

async function getVideoCodec(path: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name',
      '-of',
      'json',
      path,
    ]);
    const parsed = JSON.parse(stdout) as { streams?: Array<{ codec_name?: string }> };
    return parsed.streams?.[0]?.codec_name ?? 'unknown';
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error('ffprobe is required for --no-transcode=false (install ffmpeg)');
    }
    throw error;
  }
}

async function transcodeToH264(path: string): Promise<void> {
  const tempPath = `${path}.h264.tmp.mp4`;
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      path,
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '23',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      tempPath,
    ]);
    await rename(tempPath, path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT') {
      throw new Error('ffmpeg is required for hook transcoding (install ffmpeg)');
    }
    throw error;
  }
}

async function ensureH264(path: string): Promise<void> {
  const codec = await getVideoCodec(path);
  if (codec === 'h264') return;
  console.log(`[transcode] ${path} (codec=${codec})`);
  await transcodeToH264(path);
}

async function run(): Promise<void> {
  const library = readArg('--library') ?? DEFAULT_HOOK_LIBRARY;
  const rootDir = resolve(expandTilde(readArg('--dir') ?? DEFAULT_HOOKS_DIR));
  const force = hasFlag('--force');
  const onlyRaw = readArg('--only');
  const concurrency = parseInteger(readArg('--concurrency'), 3);
  const limit = parseInteger(readArg('--limit'), 0);
  const scrape = hasFlag('--scrape');
  const pageUrl = readArg('--page') ?? DEFAULT_LIBRARY_PAGE;
  const transcode = !hasFlag('--no-transcode');

  if (scrape && library !== 'transitionalhooks') {
    throw new Error('Scrape mode currently supports only the transitionalhooks library.');
  }

  const entries = scrape ? await scrapeHookLibrary(pageUrl) : resolveLibrary(library);
  const only = onlyRaw
    ? new Set(onlyRaw.split(',').map((value) => value.trim()).filter(Boolean))
    : null;
  const selected = only ? entries.filter((entry) => only.has(entry.id)) : entries;
  const limited = limit > 0 ? selected.slice(0, limit) : selected;

  if (limited.length === 0) {
    console.log('No hooks matched the selection.');
    return;
  }

  const targetDir = join(rootDir, library);
  await mkdir(targetDir, { recursive: true });

  let cursor = 0;
  const failures: Array<{ id: string; error: string }> = [];

  if (scrape) {
    console.log(`[scrape] Found ${entries.length} clips from ${pageUrl}`);
  }
  if (limit > 0 && selected.length > limited.length) {
    console.log(`[limit] Downloading ${limited.length} of ${selected.length} clips`);
  }

  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < limited.length) {
      const entry = limited[cursor++];
      try {
        await downloadHook(entry, targetDir, force);
        if (transcode) {
          const destination = join(targetDir, entry.filename);
          if (existsSync(destination)) {
            await ensureH264(destination);
          }
        }
      } catch (error) {
        failures.push({
          id: entry.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  });

  await Promise.all(workers);

  if (failures.length > 0) {
    console.error('Hook sync completed with errors:');
    for (const failure of failures) {
      console.error(`- ${failure.id}: ${failure.error}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Hook sync complete (${limited.length} clips).`);
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
