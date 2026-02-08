/**
 * Archetype developer tooling.
 *
 * - scaffoldArchetype(): create a new archetype YAML file
 * - packArchetype(): bundle an archetype file into a .zip pack for install
 */
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import AdmZip from 'adm-zip';
import { stringify as stringifyYaml, parse as parseYaml } from 'yaml';
import { CMError, NotFoundError, SchemaError } from '../core/errors';
import { ArchetypeSpecSchema, type ArchetypeSpec } from '../domain';
import { resolveArchetype } from './registry';

export interface ScaffoldArchetypeOptions {
  id: string;
  rootDir: string;
  /** Base archetype id or path. Defaults to `listicle`. */
  from?: string;
  /** Overwrite if the destination file already exists. */
  force?: boolean;
}

export interface ScaffoldArchetypeResult {
  id: string;
  archetypePath: string;
}

function toTitleCaseFromId(id: string): string {
  return id
    .trim()
    .split(/[-_ ]+/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function assertNonEmpty(value: string, label: string): string {
  if (!value || !value.trim()) {
    throw new SchemaError(`Invalid ${label}`, {
      [label]: value,
      fix: `Provide a non-empty ${label}`,
    });
  }
  return value.trim();
}

function toArchetypeYaml(spec: ArchetypeSpec): string {
  // YAML library stringifies multiline strings fine, but we want predictable block scalars.
  // We keep it simple and rely on `yaml` formatting.
  return `${stringifyYaml(spec).trim()}\n`;
}

/**
 * Scaffold a new archetype YAML file under `rootDir`.
 */
export async function scaffoldArchetype(
  options: ScaffoldArchetypeOptions
): Promise<ScaffoldArchetypeResult> {
  const id = assertNonEmpty(options.id, 'id');
  const rootDir = resolve(assertNonEmpty(options.rootDir, 'rootDir'));
  const from = options.from ? assertNonEmpty(options.from, 'from') : 'listicle';

  await mkdir(rootDir, { recursive: true });

  const archetypePath = join(rootDir, `${id}.yaml`);
  if (existsSync(archetypePath)) {
    if (!options.force) {
      throw new CMError('ALREADY_EXISTS', `Archetype already exists: ${archetypePath}`, {
        archetypePath,
        fix: 'Use --force to overwrite the existing archetype file',
      });
    }
    await rm(archetypePath, { force: true });
  }

  const resolvedBase = await resolveArchetype(from);
  const base = resolvedBase.archetype;

  const candidate: ArchetypeSpec = {
    ...base,
    id,
    name: toTitleCaseFromId(id) || base.name || id,
    description: base.description,
  };

  const validated = ArchetypeSpecSchema.parse(candidate);
  await writeFile(archetypePath, toArchetypeYaml(validated), 'utf-8');
  return { id: validated.id, archetypePath };
}

export interface PackArchetypeOptions {
  path: string;
  /** Output path for the archetype pack zip. Defaults to `<parent>/<id>.cmarchetype.zip`. */
  outputPath?: string;
}

export interface PackArchetypeResult {
  id: string;
  outputPath: string;
}

async function loadArchetypeFromFile(
  archetypePath: string
): Promise<{ archetype: ArchetypeSpec; ext: string }> {
  const raw = await readFile(archetypePath, 'utf-8');
  const ext = extname(archetypePath).toLowerCase();
  let parsed: unknown;
  if (ext === '.yaml' || ext === '.yml') {
    parsed = parseYaml(raw);
  } else {
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new SchemaError('Invalid archetype JSON', {
        path: archetypePath,
        error: error instanceof Error ? error.message : String(error),
        fix: 'Fix JSON syntax, or use YAML (.yaml/.yml)',
      });
    }
  }

  const validated = ArchetypeSpecSchema.safeParse(parsed);
  if (!validated.success) {
    throw new SchemaError('Invalid archetype spec', {
      path: archetypePath,
      issues: validated.error.issues,
      fix: 'Fix schema issues (id, name, script.template)',
    });
  }
  return { archetype: validated.data, ext };
}

async function resolveArchetypePath(pathOrDir: string): Promise<string> {
  const input = resolve(assertNonEmpty(pathOrDir, 'path'));
  if (!existsSync(input)) {
    throw new NotFoundError(`Archetype path not found: ${input}`, {
      resource: 'archetype',
      identifier: input,
      fix: 'Provide a valid archetype file path or a directory containing one archetype file',
    });
  }

  const st = await stat(input);
  if (st.isDirectory()) {
    // Heuristic: if the dir contains exactly one archetype spec file, pack it.
    const entries = await readdir(input, { withFileTypes: true });
    const files = entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((n) => {
        const ext = extname(n).toLowerCase();
        return ext === '.yaml' || ext === '.yml' || ext === '.json';
      });
    if (files.length === 1) return join(input, files[0] as string);
    if (files.length === 0) {
      throw new NotFoundError('No archetype file found in directory', {
        resource: 'archetype',
        identifier: input,
        fix: 'Ensure the directory contains exactly one .yaml/.yml/.json archetype file',
      });
    }
    throw new CMError('INVALID_ARGUMENT', 'Multiple archetype files found in directory', {
      dir: input,
      files,
      fix: 'Provide a single archetype file path, or a directory with exactly one archetype file',
    });
  }

  const ext = extname(input).toLowerCase();
  if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
    throw new CMError('INVALID_ARGUMENT', 'Archetype must be YAML or JSON', {
      path: input,
      fix: 'Use a .yaml/.yml/.json archetype file',
    });
  }
  return input;
}

/**
 * Pack an archetype file into a `.cmarchetype.zip` bundle.
 */
export async function packArchetype(options: PackArchetypeOptions): Promise<PackArchetypeResult> {
  const archetypePath = await resolveArchetypePath(options.path);
  const { archetype, ext } = await loadArchetypeFromFile(archetypePath);

  const outputPath = resolve(
    options.outputPath
      ? assertNonEmpty(options.outputPath, 'outputPath')
      : join(dirname(archetypePath), `${archetype.id}.cmarchetype.zip`)
  );

  if (existsSync(outputPath)) {
    await rm(outputPath, { force: true });
  }
  await mkdir(dirname(outputPath), { recursive: true });

  const zip = new AdmZip();
  zip.addLocalFile(archetypePath, '', `${archetype.id}${ext}`);
  zip.writeZip(outputPath);

  return { id: archetype.id, outputPath };
}
