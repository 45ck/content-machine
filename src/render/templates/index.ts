/**
 * Video Templates
 *
 * Resolve video templates by id or file path.
 * Templates are data-only presets for render defaults + composition selection.
 */
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { stat } from 'fs/promises';
import { join, resolve } from 'path';
import { homedir } from 'os';
import { NotFoundError, SchemaError } from '../../core/errors';
import { VideoTemplateSchema, type VideoTemplate } from '../../domain/render-templates';
export { getTemplateGameplaySlot, getTemplateParams } from './slots';

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

const BUILTIN_TEMPLATES: Record<string, VideoTemplate> = {
  'tiktok-captions': VideoTemplateSchema.parse({
    id: 'tiktok-captions',
    name: 'TikTok Captions',
    description: 'Full-screen video + TikTok-style word-highlight captions',
    compositionId: 'ShortVideo',
    defaults: {
      orientation: 'portrait',
      fps: 30,
      captionPreset: 'tiktok',
    },
  }),
  'brainrot-split-gameplay': VideoTemplateSchema.parse({
    id: 'brainrot-split-gameplay',
    name: 'Brainrot Split Screen (Gameplay)',
    description: 'Split-screen gameplay background (top content, bottom gameplay)',
    compositionId: 'SplitScreenGameplay',
    assets: {
      gameplay: {
        required: true,
      },
    },
    defaults: {
      orientation: 'portrait',
      fps: 30,
      captionPreset: 'tiktok',
    },
    params: { splitScreenRatio: 0.55 },
  }),
  'brainrot-split-gameplay-top': VideoTemplateSchema.parse({
    id: 'brainrot-split-gameplay-top',
    name: 'Brainrot Split Screen (Gameplay Top)',
    description: 'Split-screen gameplay background (top gameplay, bottom content)',
    compositionId: 'SplitScreenGameplay',
    assets: {
      gameplay: {
        required: true,
      },
    },
    defaults: {
      orientation: 'portrait',
      fps: 30,
      captionPreset: 'capcut',
    },
    params: { splitScreenRatio: 0.55, gameplayPosition: 'top', contentPosition: 'bottom' },
  }),
};

export function listBuiltinVideoTemplates(): VideoTemplate[] {
  return Object.values(BUILTIN_TEMPLATES);
}

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

export function formatTemplateSource(resolved: ResolvedVideoTemplate): string {
  if (resolved.source === 'builtin') return `builtin:${resolved.template.id}`;
  return resolved.templatePath ? `file:${resolved.templatePath}` : 'file';
}
