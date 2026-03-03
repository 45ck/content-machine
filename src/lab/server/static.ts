import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function getCurrentDir(): string {
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  // Bundled CJS fallback (esbuild injects __dirname).
  return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
}

function findPackageRoot(startDir: string): string {
  let current = resolve(startDir);
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(current, 'package.json')) && existsSync(join(current, 'assets'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}

let cachedAssetsDir: string | null = null;

export function getLabAssetsDir(): string {
  if (cachedAssetsDir) return cachedAssetsDir;
  const root = findPackageRoot(getCurrentDir());
  cachedAssetsDir = join(root, 'assets', 'lab');
  return cachedAssetsDir;
}

function contentTypeForPath(path: string): string {
  const ext = extname(path).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.ico') return 'image/x-icon';
  return 'application/octet-stream';
}

function isSafeStaticPath(urlPath: string): boolean {
  // Prevent traversal.
  return !urlPath.includes('..');
}

export async function tryServeLabStatic(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;

  // Serve the SPA shell at `/`.
  if (path === '/' || path === '/index.html') {
    return serveFile(res, join(getLabAssetsDir(), 'index.html'));
  }

  // Static assets under `/lab/*`.
  if (path.startsWith('/lab/')) {
    if (!isSafeStaticPath(path)) return false;
    const rel = path.slice('/lab/'.length);
    return serveFile(res, join(getLabAssetsDir(), rel));
  }

  return false;
}

async function serveFile(res: ServerResponse, absPath: string): Promise<boolean> {
  try {
    const info = await stat(absPath);
    if (!info.isFile()) return false;
    res.statusCode = 200;
    res.setHeader('Content-Type', contentTypeForPath(absPath));
    res.setHeader('Cache-Control', 'no-store');
    createReadStream(absPath).pipe(res);
    return true;
  } catch {
    return false;
  }
}
