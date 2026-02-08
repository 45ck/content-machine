/**
 * Archetype registry.
 *
 * Archetypes are data files, not hardcoded enums.
 *
 * Resolution order (id mode):
 * 1) project: `./.cm/archetypes/<id>.(yaml|yml|json)`
 * 2) user:    `~/.cm/archetypes/<id>.(yaml|yml|json)`
 * 3) builtin: `<packageRoot>/assets/archetypes/<id>.(yaml|yml|json)`
 *
 * Path mode:
 * - If the spec looks like a path, load it directly.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { NotFoundError, SchemaError } from '../core/errors';
import { createRequireSafe } from '../core/require';
import { ArchetypeSpecSchema } from '../domain';
import type { ArchetypeListEntry, ResolvedArchetype } from './types';

function expandTilde(inputPath: string): string {
  if (inputPath === '~') return homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\'))
    return join(homedir(), inputPath.slice(2));
  return inputPath;
}

function looksLikePath(spec: string): boolean {
  return (
    spec.includes('/') ||
    spec.includes('\\') ||
    spec.startsWith('.') ||
    spec.startsWith('~') ||
    /^[a-zA-Z]:[\\/]/.test(spec) ||
    spec.endsWith('.json') ||
    spec.endsWith('.yaml') ||
    spec.endsWith('.yml')
  );
}

function getPackageRoot(): string {
  const require = createRequireSafe(import.meta.url);
  const pkgJsonPath = require.resolve('../../package.json');
  return dirname(pkgJsonPath);
}

function getBuiltinDir(): string {
  return join(getPackageRoot(), 'assets', 'archetypes');
}

function tryParseArchetype(
  raw: string,
  pathHint: string
): ReturnType<typeof ArchetypeSpecSchema.parse> {
  let parsed: unknown;
  const lower = pathHint.toLowerCase();
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) {
    parsed = parseYaml(raw);
  } else {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new SchemaError('Invalid archetype JSON', {
        path: pathHint,
        error: error instanceof Error ? error.message : String(error),
        fix: 'Fix JSON syntax, or use YAML (.yaml/.yml)',
      });
    }
  }

  const validated = ArchetypeSpecSchema.safeParse(parsed);
  if (!validated.success) {
    throw new SchemaError('Invalid archetype spec', {
      path: pathHint,
      issues: validated.error.issues,
      fix: 'Validate required fields (id, name, script.template) and fix schema issues',
    });
  }

  return validated.data;
}

function candidatePathsForId(id: string): Array<{ source: 'file' | 'builtin'; path: string }> {
  const exts = ['.yaml', '.yml', '.json'];
  const projectRoot = join(process.cwd(), '.cm', 'archetypes');
  const userRoot = join(homedir(), '.cm', 'archetypes');
  const builtinRoot = getBuiltinDir();

  const candidates: Array<{ source: 'file' | 'builtin'; path: string }> = [];
  for (const ext of exts) {
    candidates.push({ source: 'file', path: join(projectRoot, `${id}${ext}`) });
  }
  for (const ext of exts) {
    candidates.push({ source: 'file', path: join(userRoot, `${id}${ext}`) });
  }
  for (const ext of exts) {
    candidates.push({ source: 'builtin', path: join(builtinRoot, `${id}${ext}`) });
  }

  return candidates;
}

async function loadArchetypeFromFile(
  filePath: string
): Promise<ReturnType<typeof ArchetypeSpecSchema.parse>> {
  const absolutePath = resolve(expandTilde(filePath));
  const raw = await readFile(absolutePath, 'utf-8');
  return tryParseArchetype(raw, absolutePath);
}

/**
 * Resolve an archetype by id (builtin/user/project) or by explicit file path.
 */
export async function resolveArchetype(spec: string): Promise<ResolvedArchetype> {
  if (!spec || !spec.trim()) {
    throw new SchemaError('Invalid --archetype value', {
      spec,
      fix: 'Provide an archetype id, or a path to an archetype file (.yaml/.yml/.json)',
    });
  }

  const trimmed = spec.trim();

  // Path mode (explicit only). Avoid treating an archetype id like "listicle"
  // as a filesystem path just because a file happens to exist with that name.
  if (looksLikePath(trimmed)) {
    const archetypePath = resolve(expandTilde(trimmed));
    if (!existsSync(archetypePath)) {
      throw new NotFoundError(`Archetype file not found: ${archetypePath}`, {
        resource: 'archetype',
        identifier: spec,
        fix: 'Provide a valid path to an archetype YAML/JSON file',
      });
    }
    const archetype = await loadArchetypeFromFile(archetypePath);
    return { archetype, spec, source: 'file', archetypePath };
  }

  // Id mode
  const candidates = candidatePathsForId(trimmed);
  for (const candidate of candidates) {
    try {
      const archetype = await loadArchetypeFromFile(candidate.path);
      return {
        archetype,
        spec,
        source: candidate.source === 'builtin' ? 'builtin' : 'file',
        archetypePath: candidate.path,
      };
    } catch (error: unknown) {
      // Treat missing candidate files as "not found" and continue the search.
      // This also makes the registry resilient to overly-broad test mocks of existsSync().
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as any).code as string | undefined;
        if (code === 'ENOENT' || code === 'ENOTDIR') continue;
      }
      throw error;
    }
  }

  throw new NotFoundError(`Unknown archetype: ${trimmed}`, {
    resource: 'archetype',
    identifier: trimmed,
    searched: candidates.map((c) => c.path),
    fix: 'Run `cm archetypes list` or install an archetype to ~/.cm/archetypes/<id>.yaml',
  });
}

function listArchetypeFilesInDir(rootDir: string): string[] {
  if (!existsSync(rootDir)) return [];
  const files = readdirSync(rootDir, { withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml') || name.endsWith('.json'));
  return files.map((f) => join(rootDir, f));
}

function readArchetypeSync(filePath: string): ReturnType<typeof ArchetypeSpecSchema.parse> | null {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    return tryParseArchetype(raw, filePath);
  } catch {
    return null;
  }
}

/**
 * List archetypes from project, user, and builtin locations (project takes precedence).
 */
export function listArchetypes(): ArchetypeListEntry[] {
  const builtinDir = getBuiltinDir();
  const projectDir = join(process.cwd(), '.cm', 'archetypes');
  const userDir = join(homedir(), '.cm', 'archetypes');

  const entries: ArchetypeListEntry[] = [];

  // Precedence: project > user > builtin
  const seen = new Set<string>();
  const sources: Array<{ source: 'file' | 'builtin'; dir: string }> = [
    { source: 'file', dir: projectDir },
    { source: 'file', dir: userDir },
    { source: 'builtin', dir: builtinDir },
  ];

  for (const source of sources) {
    for (const filePath of listArchetypeFilesInDir(source.dir)) {
      const spec = readArchetypeSync(filePath);
      if (!spec) continue;
      if (seen.has(spec.id)) continue;
      seen.add(spec.id);
      entries.push({
        id: spec.id,
        name: spec.name,
        description: spec.description,
        source: source.source === 'builtin' ? 'builtin' : 'file',
        path: filePath,
      });
    }
  }

  // Sort stable by id
  entries.sort((a, b) => a.id.localeCompare(b.id));
  return entries;
}

function candidateBaselinePaths(): string[] {
  return [
    join(process.cwd(), '.cm', 'archetypes', 'baseline.md'),
    join(homedir(), '.cm', 'archetypes', 'baseline.md'),
    join(getBuiltinDir(), 'baseline.md'),
  ];
}

/**
 * Load baseline rules used by all archetypes, if present.
 */
export function loadBaselineRules(): { content: string; path?: string } {
  for (const p of candidateBaselinePaths()) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, 'utf-8').trim();
      if (!raw) continue;
      return { content: raw, path: p };
    } catch {
      continue;
    }
  }
  return { content: '' };
}

/**
 * Format a resolved archetype origin for display/logging.
 */
export function formatArchetypeSource(resolved: ResolvedArchetype): string {
  if (resolved.source === 'builtin') return `builtin:${resolved.archetype.id}`;
  return resolved.archetypePath ? `file:${resolved.archetypePath}` : 'file';
}

/**
 * Infer an archetype id from a YAML/JSON archetype file path.
 */
export function inferArchetypeIdFromPath(pathLike: string): string | null {
  const file = basename(pathLike);
  const match = file.match(/^(.+?)\.(yaml|yml|json)$/i);
  return match ? match[1] : null;
}
