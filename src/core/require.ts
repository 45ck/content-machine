import { createRequire } from 'node:module';
import { join } from 'node:path';

// In CJS bundles, `__filename` exists. In ESM (tsx/ts-node), it does not.
// We declare it so TypeScript is happy in ESM source files.
declare const __filename: string | undefined;

/**
 * Create a Node `require` function that works in:
 * - ESM source execution (pass `import.meta.url`)
 * - bundled CJS CLI (`__filename` is available; `import.meta.url` may be undefined)
 */
export function createRequireSafe(metaUrl?: string): NodeRequire {
  const base = typeof __filename === 'string' && __filename ? __filename : metaUrl;
  if (base) return createRequire(base);

  // Last resort: anchor to cwd so we can still require installed dependencies.
  return createRequire(join(process.cwd(), 'index.js'));
}
