/**
 * Archetype installer helpers.
 *
 * Installs a single archetype spec file to `~/.cm/archetypes/<id>.(yaml|yml|json)`.
 */
import { cp, mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import AdmZip from 'adm-zip';
import { parse as parseYaml } from 'yaml';
import { ArchetypeSpecSchema } from '../domain';
import { CMError, NotFoundError, SchemaError } from '../core/errors';

interface InstallArchetypeOptions {
  sourcePath: string;
  destDir: string;
  force?: boolean;
}

interface InstallArchetypeResult {
  id: string;
  installPath: string;
}

function isZip(path: string): boolean {
  return extname(path).toLowerCase() === '.zip';
}

async function extractZipToTemp(zipPath: string): Promise<string> {
  const zip = new AdmZip(zipPath);
  const tempDir = await mkdtemp(join(tmpdir(), 'cm-archetype-'));

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const normalized = entry.entryName.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new CMError('INVALID_ARGUMENT', 'Archetype zip contains unsafe paths', {
        entry: entry.entryName,
        fix: 'Remove any absolute paths or .. segments from the archetype zip',
      });
    }

    const destPath = resolve(join(tempDir, normalized));
    if (!destPath.startsWith(tempDir)) {
      throw new CMError('INVALID_ARGUMENT', 'Archetype zip extraction escaped temp dir', {
        entry: entry.entryName,
      });
    }

    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, entry.getData());
  }

  return tempDir;
}

async function findArchetypeFile(root: string): Promise<string> {
  const entries = await readdir(root, { withFileTypes: true });
  const candidates: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const ext = extname(entry.name).toLowerCase();
    if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') continue;
    candidates.push(join(root, entry.name));
  }

  if (candidates.length === 1) return candidates[0] as string;
  if (candidates.length === 0) {
    throw new NotFoundError('No archetype file found in archetype pack', {
      resource: 'archetype',
      identifier: root,
      fix: 'Ensure the pack contains exactly one .yaml/.yml/.json file at its root',
    });
  }

  throw new CMError('INVALID_ARGUMENT', 'Multiple archetype files found in pack', {
    root,
    candidates,
    fix: 'Archetype packs must contain exactly one archetype file at the root',
  });
}

async function loadArchetypeFromFile(path: string) {
  const raw = await readFile(path, 'utf-8');
  const ext = extname(path).toLowerCase();
  let parsed: unknown;
  if (ext === '.yaml' || ext === '.yml') {
    parsed = parseYaml(raw);
  } else {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new SchemaError('Invalid archetype JSON', {
        path,
        error: error instanceof Error ? error.message : String(error),
        fix: 'Fix JSON syntax errors, or use YAML (.yaml/.yml)',
      });
    }
  }

  const validated = ArchetypeSpecSchema.safeParse(parsed);
  if (!validated.success) {
    throw new SchemaError('Invalid archetype spec', {
      path,
      issues: validated.error.issues,
      fix: 'Fix schema issues (id, name, script.template)',
    });
  }

  return { archetype: validated.data, ext };
}

/**
 * Install an archetype into `destDir` from a YAML/JSON file or archetype pack zip.
 */
export async function installArchetypePack(
  options: InstallArchetypeOptions
): Promise<InstallArchetypeResult> {
  const source = resolve(options.sourcePath);
  if (!existsSync(source)) {
    throw new NotFoundError(`Archetype source not found: ${source}`, {
      resource: 'archetype',
      identifier: source,
      fix: 'Provide a valid archetype file path or .zip pack',
    });
  }

  const stats = await stat(source);
  const destDir = resolve(options.destDir);
  const cleanupPaths: string[] = [];

  let archetypeFile = source;
  if (stats.isFile()) {
    if (isZip(source)) {
      const tempDir = await extractZipToTemp(source);
      cleanupPaths.push(tempDir);
      archetypeFile = await findArchetypeFile(tempDir);
    } else {
      const ext = extname(source).toLowerCase();
      if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
        throw new CMError('INVALID_ARGUMENT', 'Archetype source must be YAML/JSON or a .zip pack', {
          source,
          fix: 'Provide a .yaml/.yml/.json file or a .zip pack',
        });
      }
    }
  } else if (stats.isDirectory()) {
    archetypeFile = await findArchetypeFile(source);
  } else {
    throw new CMError(
      'INVALID_ARGUMENT',
      'Archetype source must be a file, directory, or .zip pack',
      {
        source,
      }
    );
  }

  try {
    const { archetype, ext } = await loadArchetypeFromFile(archetypeFile);
    await mkdir(destDir, { recursive: true });
    const installPath = join(destDir, `${archetype.id}${ext}`);

    if (existsSync(installPath)) {
      if (!options.force) {
        throw new CMError('ALREADY_EXISTS', `Archetype already installed: ${archetype.id}`, {
          installPath,
          fix: 'Use --force to overwrite the existing archetype',
        });
      }
      await rm(installPath, { force: true });
    }

    // Use cp for local file copy (works across devices).
    await cp(archetypeFile, installPath);
    return { id: archetype.id, installPath };
  } finally {
    await Promise.all(cleanupPaths.map((p) => rm(p, { recursive: true, force: true })));
  }
}
