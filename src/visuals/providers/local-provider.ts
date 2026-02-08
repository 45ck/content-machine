/**
 * Local Provider
 *
 * "Bring your own" visuals provider backed by a folder of user assets.
 *
 * This is intentionally simple:
 * - Scans a directory for video files (mp4/mov/webm/mkv).
 * - Scores candidates based on token overlap with the query + folder/name tokens.
 * - Returns the best match as a local file path (copied into the Remotion bundle later).
 */

import type { AssetProvider, AssetSearchOptions, VisualAssetResult } from './types.js';
import { readdir, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.mkv']);

function normalizeToken(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(input: string): string[] {
  const normalized = normalizeToken(input);
  if (!normalized) return [];
  return normalized.split(/\s+/).filter(Boolean);
}

function isVideoFile(path: string): boolean {
  return VIDEO_EXTS.has(extname(path).toLowerCase());
}

async function listFilesRecursive(dir: string, recursive: boolean): Promise<string[]> {
  const out: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!recursive) continue;
      out.push(...(await listFilesRecursive(full, recursive)));
      continue;
    }
    if (!entry.isFile()) continue;
    out.push(full);
  }
  return out;
}

function scoreCandidate(queryTokens: string[], candidateTokens: Set<string>): number {
  if (queryTokens.length === 0) return 0;
  let hit = 0;
  for (const t of queryTokens) {
    if (candidateTokens.has(t)) hit++;
  }
  return hit / queryTokens.length;
}

export type LocalProviderOptions = {
  dir?: string;
  recursive?: boolean;
};

/**
 * Local file provider for selecting stock video clips from a directory.
 */
export class LocalProvider implements AssetProvider {
  readonly name = 'local';
  readonly assetType = 'video' as const;
  readonly requiresMotion = false;
  readonly costPerAsset = 0;

  private dir: string | undefined;
  private recursive: boolean;
  private indexPromise:
    | Promise<Array<{ file: string; tokens: Set<string>; size: number }>>
    | undefined;

  constructor(options: LocalProviderOptions = {}) {
    this.dir = options.dir;
    this.recursive = options.recursive ?? true;
  }

  isAvailable(): boolean {
    return Boolean(this.dir && this.dir.trim().length > 0);
  }

  estimateCost(): number {
    return 0;
  }

  private async buildIndex(
    dir: string
  ): Promise<Array<{ file: string; tokens: Set<string>; size: number }>> {
    const files = (await listFilesRecursive(dir, this.recursive)).filter(isVideoFile);
    const indexed = await Promise.all(
      files.map(async (file) => {
        const nameTokens = tokenize(basename(file, extname(file)));
        const folderTokens = tokenize(resolve(file).replaceAll('\\', '/'));
        const tokens = new Set([...nameTokens, ...folderTokens]);
        const info = await stat(file);
        return { file, tokens, size: info.size };
      })
    );
    return indexed;
  }

  async search(options: AssetSearchOptions): Promise<VisualAssetResult[]> {
    const dir = this.dir ? resolve(this.dir) : null;
    if (!dir) return [];

    const queryTokens = tokenize(options.query);
    this.indexPromise ??= this.buildIndex(dir);
    const index = await this.indexPromise;
    if (index.length === 0) return [];

    const scored = index.map((entry) => ({
      file: entry.file,
      score: scoreCandidate(queryTokens, entry.tokens),
      size: entry.size,
    }));

    scored.sort((a, b) => {
      // Prefer higher overlap; then larger file as a crude proxy for "real asset" over tiny stubs.
      if (b.score !== a.score) return b.score - a.score;
      return b.size - a.size;
    });

    const best = scored[0];
    if (!best) return [];

    return [
      {
        id: best.file,
        url: best.file, // local path; bundler will copy into the bundle
        type: 'video',
        width: options.orientation === 'landscape' ? 1920 : 1080,
        height: options.orientation === 'landscape' ? 1080 : 1920,
        metadata: { score: best.score },
      },
    ];
  }
}
