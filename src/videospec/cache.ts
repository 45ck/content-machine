import { join, resolve } from 'node:path';

/**
 * Resolve the VideoSpec module cache directory.
 *
 * Precedence:
 * 1) `explicit` argument
 * 2) `$CM_VIDEOSPEC_CACHE_DIR`
 * 3) `${process.cwd()}/.cache/content-machine/videospec`
 */
export function resolveVideoSpecCacheDir(explicit?: string): string {
  if (explicit) return resolve(explicit);
  if (process.env.CM_VIDEOSPEC_CACHE_DIR) return resolve(process.env.CM_VIDEOSPEC_CACHE_DIR);
  return join(process.cwd(), '.cache', 'content-machine', 'videospec');
}
