import { realpath, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { CMError } from '../../core/errors';

function isPathInside(childPath: string, parentPath: string): boolean {
  const rel = relative(parentPath, childPath);
  if (!rel) return true;
  return !rel.startsWith(`..${sep}`) && rel !== '..';
}

export interface AllowedRoot {
  path: string;
  realpath: string;
}

export async function resolveAllowedRoots(roots: string[]): Promise<AllowedRoot[]> {
  const unique = Array.from(new Set(roots.map((r) => resolve(r))));
  const resolved: AllowedRoot[] = [];

  for (const root of unique) {
    try {
      const info = await stat(root);
      if (!info.isDirectory()) continue;
      const real = await realpath(root);
      resolved.push({ path: root, realpath: real });
    } catch {
      // Ignore missing/unreadable roots; caller can decide whether to be strict.
    }
  }

  return resolved;
}

export async function assertImportPathAllowed(params: {
  inputPath: string;
  allowedRoots: AllowedRoot[];
}): Promise<{ absPath: string; realPath: string }> {
  const abs = resolve(params.inputPath);
  const real = await realpath(abs);

  for (const root of params.allowedRoots) {
    if (isPathInside(real, root.realpath)) {
      return { absPath: abs, realPath: real };
    }
  }

  throw new CMError('FORBIDDEN', `Path is outside allowed roots: ${abs}`, {
    path: abs,
    fix: 'Start `cm lab` with additional `--allow-root` entries for your artifacts directory.',
    allowedRoots: params.allowedRoots.map((r) => r.path),
  });
}

export async function safeResolveUnderRoot(params: {
  rootRealpath: string;
  candidatePath: string;
}): Promise<string> {
  const abs = resolve(params.candidatePath);
  const real = await realpath(abs);
  if (!isPathInside(real, params.rootRealpath)) {
    throw new CMError('FORBIDDEN', 'Resolved path is outside registered run root', {
      path: abs,
      fix: 'Do not use symlinks or .. traversal inside the run directory.',
    });
  }
  return real;
}
