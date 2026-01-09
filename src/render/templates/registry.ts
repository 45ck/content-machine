/**
 * Template registry helpers (list, resolve).
 */
import { readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { readFile } from 'fs/promises';
import { VideoTemplateSchema, type VideoTemplate } from './schema';
import { createLogger } from '../../core/logger';
import { listBuiltinVideoTemplates } from './index';

export type TemplateSource = 'builtin' | 'user' | 'project';

export interface ListedTemplate {
  id: string;
  name: string;
  description?: string;
  source: TemplateSource;
  templatePath?: string;
}

export interface ListTemplatesOptions {
  includeBuiltin?: boolean;
  userDir?: string;
  projectDir?: string;
}

const DEFAULT_USER_DIR = join(homedir(), '.cm', 'templates');
const DEFAULT_PROJECT_DIR = join(process.cwd(), '.cm', 'templates');

async function readTemplateFile(path: string): Promise<VideoTemplate | null> {
  const log = createLogger({ module: 'templates:registry' });
  try {
    const raw = await readFile(path, 'utf-8');
    const parsedJson = JSON.parse(raw);
    const parsed = VideoTemplateSchema.safeParse(parsedJson);
    if (!parsed.success) {
      log.warn({ path, issues: parsed.error.issues }, 'Invalid template.json');
      return null;
    }
    return parsed.data;
  } catch (error) {
    log.warn({ path, error }, 'Failed to read template.json');
    return null;
  }
}

async function listTemplatesFromDir(root: string, source: TemplateSource): Promise<ListedTemplate[]> {
  if (!existsSync(root)) return [];

  const entries = await readdir(root, { withFileTypes: true });
  const templates: ListedTemplate[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const templatePath = join(root, entry.name, 'template.json');
    if (!existsSync(templatePath)) continue;

    const template = await readTemplateFile(templatePath);
    if (!template) continue;

    templates.push({
      id: template.id,
      name: template.name,
      description: template.description,
      source,
      templatePath,
    });
  }

  return templates;
}

export async function listVideoTemplates(
  options: ListTemplatesOptions = {}
): Promise<ListedTemplate[]> {
  const includeBuiltin = options.includeBuiltin !== false;
  const userDir = options.userDir ?? DEFAULT_USER_DIR;
  const projectDir = options.projectDir ?? DEFAULT_PROJECT_DIR;

  const results: ListedTemplate[] = [];
  if (includeBuiltin) {
    const builtins = listBuiltinVideoTemplates().map((template) => ({
      id: template.id,
      name: template.name,
      description: template.description,
      source: 'builtin' as const,
    }));
    results.push(...builtins);
  }

  const [userTemplates, projectTemplates] = await Promise.all([
    listTemplatesFromDir(userDir, 'user'),
    listTemplatesFromDir(projectDir, 'project'),
  ]);

  results.push(...projectTemplates, ...userTemplates);
  return results;
}
