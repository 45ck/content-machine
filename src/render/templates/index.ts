/**
 * Video Templates
 *
 * Resolve video templates by id or file path.
 * Templates are data-only presets for render defaults + composition selection.
 */
import { readFile } from 'fs/promises';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { stat } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { dirname } from 'node:path';
import { NotFoundError, SchemaError } from '../../core/errors';
import { VideoTemplateSchema, type VideoTemplate } from '../../domain/render-templates';
import { createRequireSafe } from '../../core/require';
export { getTemplateGameplaySlot, getTemplateParams } from './slots';
export { resolveRemotionTemplateProject, type ResolvedRemotionTemplateProject } from './remotion';

export type { VideoTemplate } from '../../domain/render-templates';

export interface ResolvedVideoTemplate {
  template: VideoTemplate;
  /** Original spec provided (id or path). */
  spec: string;
  /** Where the template was loaded from. */
  source: 'builtin' | 'file';
  /** Absolute template.json path when source === 'file'. */
  templatePath?: string;
}

function getPackageRoot(): string {
  const require = createRequireSafe(import.meta.url);
  const candidates = ['../../../package.json', '../../package.json', '../package.json', './package.json'];
  for (const candidate of candidates) {
    try {
      const pkgJsonPath = require.resolve(candidate);
      return dirname(pkgJsonPath);
    } catch {
      continue;
    }
  }
  throw new SchemaError('Unable to locate package.json to resolve built-in templates', {
    fix: 'Run CM from an installed package or from a repository checkout that contains package.json',
  });
}

function getBuiltinTemplatesDir(): string {
  return join(getPackageRoot(), 'assets', 'templates');
}

function loadBuiltinTemplatesSync(): Record<string, VideoTemplate> {
  const root = getBuiltinTemplatesDir();
  if (!existsSync(root)) return {};

  const entries = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
  const templates: Record<string, VideoTemplate> = {};

  for (const entry of entries) {
    const templatePath = join(root, entry.name, 'template.json');
    if (!existsSync(templatePath)) continue;

    const raw = readFileSync(templatePath, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw new SchemaError('Invalid built-in template JSON', {
        path: templatePath,
        error: error instanceof Error ? error.message : String(error),
        fix: 'Fix JSON syntax in assets/templates/*/template.json',
      });
    }

    const validated = VideoTemplateSchema.safeParse(parsed);
    if (!validated.success) {
      throw new SchemaError('Invalid built-in video template', {
        path: templatePath,
        issues: validated.error.issues,
        fix: 'Fix schema issues in assets/templates/*/template.json',
      });
    }

    templates[validated.data.id] = validated.data;
  }

  return templates;
}

const BUILTIN_TEMPLATES: Record<string, VideoTemplate> = loadBuiltinTemplatesSync();

/**
 * List built-in templates shipped with the package.
 */
export function listBuiltinVideoTemplates(): VideoTemplate[] {
  return Object.values(BUILTIN_TEMPLATES);
}

/**
 * Get a built-in template by id.
 */
export function getBuiltinVideoTemplate(id: string): VideoTemplate | undefined {
  return BUILTIN_TEMPLATES[id];
}

function expandTilde(inputPath: string): string {
  if (inputPath === '~') return homedir();
  if (inputPath.startsWith('~/') || inputPath.startsWith('~\\')) {
    return join(homedir(), inputPath.slice(2));
  }
  return inputPath;
}

function looksLikePath(spec: string): boolean {
  // Heuristic: treat as path if it includes separators, starts with ., ~, or is a Windows drive path.
  return (
    spec.includes('/') ||
    spec.includes('\\') ||
    spec.startsWith('.') ||
    spec.startsWith('~') ||
    /^[a-zA-Z]:[\\/]/.test(spec) ||
    spec.endsWith('.json')
  );
}

async function loadTemplateFromFile(templatePath: string): Promise<VideoTemplate> {
  const absolutePath = resolve(expandTilde(templatePath));
  const raw = await readFile(absolutePath, 'utf-8');

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new SchemaError('Invalid template JSON', {
      path: absolutePath,
      fix: 'Fix JSON syntax and re-run with `cm render --template <path>`',
      error: error instanceof Error ? error.message : String(error),
    });
  }

  const parsed = VideoTemplateSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new SchemaError('Invalid video template', {
      path: absolutePath,
      issues: parsed.error.issues,
      fix: 'Validate required fields (id, name, compositionId) and fix schema issues',
    });
  }

  return parsed.data;
}

async function resolveTemplateFilePath(spec: string): Promise<string> {
  const expanded = resolve(expandTilde(spec));

  // If user points at a directory, assume <dir>/template.json
  if (existsSync(expanded)) {
    const st = await stat(expanded);
    if (st.isDirectory()) return join(expanded, 'template.json');
    return expanded;
  }

  return expanded;
}

/**
 * Resolve a template by id or by file path.
 *
 * - If `spec` looks like a path (or exists), it is treated as a file/dir.
 * - Otherwise, it's treated as an id, and we search:
 *   1) built-in templates
 *   2) project templates: `./.cm/templates/<id>/template.json`
 *   3) user templates: `~/.cm/templates/<id>/template.json`
 */
export async function resolveVideoTemplate(spec: string): Promise<ResolvedVideoTemplate> {
  if (!spec || !spec.trim()) {
    throw new SchemaError('Invalid --template value', {
      spec,
      fix: 'Provide a template id or a path to template.json',
    });
  }

  // Path mode
  if (looksLikePath(spec) || existsSync(resolve(expandTilde(spec)))) {
    const templatePath = await resolveTemplateFilePath(spec);
    if (!existsSync(templatePath)) {
      throw new NotFoundError(`Template file not found: ${templatePath}`, {
        resource: 'video-template',
        identifier: spec,
        templatePath,
        fix: 'Provide a valid path (file or dir containing template.json)',
      });
    }
    const template = await loadTemplateFromFile(templatePath);
    return { template, spec, source: 'file', templatePath };
  }

  // ID mode
  const builtin = getBuiltinVideoTemplate(spec);
  if (builtin) {
    return { template: builtin, spec, source: 'builtin' };
  }

  const candidates = [
    join(process.cwd(), '.cm', 'templates', spec, 'template.json'),
    join(homedir(), '.cm', 'templates', spec, 'template.json'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) continue;
    const template = await loadTemplateFromFile(candidate);
    return { template, spec, source: 'file', templatePath: candidate };
  }

  throw new NotFoundError(`Unknown video template: ${spec}`, {
    resource: 'video-template',
    identifier: spec,
    searched: candidates,
    fix: 'Use a built-in template id, or install one to ~/.cm/templates/<id>/template.json, or pass a path via --template',
  });
}

/**
 * Format a resolved template origin for display/logging.
 */
export function formatTemplateSource(resolved: ResolvedVideoTemplate): string {
  if (resolved.source === 'builtin') return `builtin:${resolved.template.id}`;
  return resolved.templatePath ? `file:${resolved.templatePath}` : 'file';
}
