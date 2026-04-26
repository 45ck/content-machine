import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve the package root for both source execution and bundled dist execution.
 *
 * We cannot rely on static `../../package.json` style paths after bundling,
 * because those are evaluated relative to the flattened bundle file, not the
 * original source module location.
 */
export function resolvePackageRoot(startUrl: string): string {
  let currentDir = resolve(dirname(fileURLToPath(startUrl)));

  for (let i = 0; i < 8; i++) {
    if (existsSync(join(currentDir, 'package.json'))) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  throw new Error(`Could not resolve package root from ${startUrl}`);
}

/** Resolve the package.json path for the current package root. */
export function resolvePackageJsonPath(startUrl: string): string {
  return join(resolvePackageRoot(startUrl), 'package.json');
}
