/**
 * Remote asset caching for rendering.
 *
 * Downloads remote video URLs (e.g. Pexels) into a local cache folder so they can
 * be copied into the Remotion bundle `public/` folder and referenced via `staticFile()`.
 */
import { createWriteStream } from 'fs';
import { mkdir, rename, rm, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import type { VisualAssetBundlePlan } from './visual-asset-bundler';

export interface BundleAssetCopy {
  sourcePath: string;
  destPath: string;
}

export interface RemoteAssetDownloadOptions {
  cacheRoot: string;
  /**
   * Best-effort progress hook for CLI UX.
   * `progress` is 0..1 and indicates overall plan completion.
   */
  onProgress?: (event: { progress: number; message?: string }) => void;
  /**
   * Logger-like object (pino child logger fits).
   */
  log?: {
    debug: (obj: unknown, msg?: string) => void;
    info: (obj: unknown, msg?: string) => void;
    warn: (obj: unknown, msg?: string) => void;
  };
}

async function isOkFile(path: string): Promise<boolean> {
  try {
    const st = await stat(path);
    return st.isFile() && st.size > 0;
  } catch {
    return false;
  }
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  if (!response.body) {
    throw new Error('No response body');
  }

  await mkdir(dirname(destPath), { recursive: true });

  const tmpPath = `${destPath}.part`;
  // Clean up any previous partial file.
  await rm(tmpPath, { force: true }).catch(() => {});

  const fileStream = createWriteStream(tmpPath);
  // `fetch()` in Node returns a WHATWG ReadableStream; `Readable.fromWeb` expects the Node web stream type.
  // The runtime shape is compatible; cast to avoid type conflicts between DOM and Node typings.
  const readable = Readable.fromWeb(response.body as any);
  await pipeline(readable, fileStream);

  await rename(tmpPath, destPath);
}

export async function downloadRemoteAssetsToCache(
  plan: VisualAssetBundlePlan,
  options: RemoteAssetDownloadOptions
): Promise<{ extraAssets: BundleAssetCopy[]; succeededUrls: Set<string> }> {
  const { cacheRoot, onProgress, log } = options;
  const succeededUrls = new Set<string>();
  const extraAssets: BundleAssetCopy[] = [];
  const total = plan.assets.length;

  for (let index = 0; index < plan.assets.length; index++) {
    const asset = plan.assets[index];
    const cachePath = join(cacheRoot, asset.bundlePath);

    const completed = index;
    onProgress?.({
      progress: total > 0 ? completed / total : 1,
      message: `Downloading stock assets (${completed}/${total})`,
    });

    try {
      if (!(await isOkFile(cachePath))) {
        log?.info({ url: asset.sourceUrl, cachePath }, 'Downloading remote asset');
        await downloadToFile(asset.sourceUrl, cachePath);
      } else {
        log?.debug({ url: asset.sourceUrl, cachePath }, 'Using cached remote asset');
      }

      succeededUrls.add(asset.sourceUrl);
      extraAssets.push({ sourcePath: cachePath, destPath: asset.bundlePath });
    } catch (error) {
      log?.warn({ url: asset.sourceUrl, error }, 'Failed to download remote asset, falling back');
      // Keep the original URL in visuals (caller should only rewrite succeeded items).
    }
  }

  onProgress?.({ progress: 1, message: total ? 'Stock assets ready' : 'No stock assets needed' });
  return { extraAssets, succeededUrls };
}
