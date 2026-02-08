/**
 * Local Image Provider
 *
 * "Bring your own" image provider backed by a folder of user images.
 * Intended to be used with motion strategies (e.g. Ken Burns) at render time.
 */

import type { AssetProvider, AssetSearchOptions, VisualAssetResult } from './types.js';
import { readdir, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp']);

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

function isImageFile(path: string): boolean {
  return IMAGE_EXTS.has(extname(path).toLowerCase());
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

export type LocalImageProviderOptions = {
  dir?: string;
  recursive?: boolean;
};

/**
 * Local file provider for selecting still images from a directory.
 * Outputs image assets which typically require a motion strategy in the renderer.
 */
export class LocalImageProvider implements AssetProvider {
  readonly name = 'localimage';
  readonly assetType = 'image' as const;
  readonly requiresMotion = true;
  readonly costPerAsset = 0;

  private dir: string | undefined;
  private recursive: boolean;
  private indexPromise:
    | Promise<Array<{ file: string; tokens: Set<string>; size: number }>>
    | undefined;

  constructor(options: LocalImageProviderOptions = {}) {
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
    const files = (await listFilesRecursive(dir, this.recursive)).filter(isImageFile);
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
      if (b.score !== a.score) return b.score - a.score;
      return b.size - a.size;
    });

    const best = scored[0];
    if (!best) return [];

    const dims =
      options.orientation === 'landscape'
        ? { width: 1920, height: 1080 }
        : options.orientation === 'square'
          ? { width: 1080, height: 1080 }
          : { width: 1080, height: 1920 };

    return [
      {
        id: best.file,
        url: best.file,
        type: 'image',
        ...dims,
        metadata: { score: best.score },
      },
    ];
  }
}
