/**
 * Template installer helpers.
 */
import { cp, mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve, extname } from 'path';
import { tmpdir } from 'os';
import AdmZip from 'adm-zip';
import { RenderTemplateSchema } from '../../domain/render-templates';
import { CMError, NotFoundError, SchemaError } from '../../core/errors';

interface InstallTemplateOptions {
  sourcePath: string;
  destDir: string;
  force?: boolean;
}

interface InstallTemplateResult {
  id: string;
  installPath: string;
}

function isZip(path: string): boolean {
  return extname(path).toLowerCase() === '.zip';
}

async function extractZipToTemp(zipPath: string): Promise<string> {
  const zip = new AdmZip(zipPath);
  const tempDir = await mkdtemp(join(tmpdir(), 'cm-template-'));

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const normalized = entry.entryName.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new CMError('INVALID_TEMPLATE', 'Template zip contains unsafe paths', {
        entry: entry.entryName,
        fix: 'Remove any absolute paths or .. segments from the template zip',
      });
    }

    const destPath = resolve(join(tempDir, normalized));
    if (!destPath.startsWith(tempDir)) {
      throw new CMError('INVALID_TEMPLATE', 'Template zip extraction escaped temp dir', {
        entry: entry.entryName,
      });
    }

    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, entry.getData());
  }

  return tempDir;
}

async function findTemplateRoot(root: string): Promise<string> {
  const templateJson = join(root, 'template.json');
  if (existsSync(templateJson)) {
    return root;
  }

  const entries = await readdir(root, { withFileTypes: true });
  const candidates: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidate = join(root, entry.name, 'template.json');
    if (existsSync(candidate)) {
      candidates.push(join(root, entry.name));
    }
  }

  if (candidates.length === 1) return candidates[0];
  if (candidates.length === 0) {
    throw new NotFoundError('template.json not found in template pack', {
      resource: 'video-template',
      identifier: root,
      fix: 'Ensure template.json exists at the root of the template directory',
    });
  }

  throw new CMError('INVALID_TEMPLATE', 'Multiple template.json files found', {
    root,
    candidates,
    fix: 'Template packs must contain exactly one template.json',
  });
}

async function loadTemplateFromDir(templateDir: string) {
  const templatePath = join(templateDir, 'template.json');
  const raw = await readFile(templatePath, 'utf-8');
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch (error) {
    throw new SchemaError('Invalid template.json', {
      path: templatePath,
      error: error instanceof Error ? error.message : String(error),
      fix: 'Fix JSON syntax errors in template.json',
    });
  }

  const parsed = RenderTemplateSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new SchemaError('Invalid video template schema', {
      path: templatePath,
      issues: parsed.error.issues,
      fix: 'Update template.json to match the required schema',
    });
  }
  return { template: parsed.data, templatePath };
}

/**
 * Install a template pack (directory or .zip) into a destination templates directory.
 *
 * This copies the template directory as `destDir/<templateId>/...` after schema validation.
 */
export async function installTemplatePack(
  options: InstallTemplateOptions
): Promise<InstallTemplateResult> {
  const source = resolve(options.sourcePath);
  if (!existsSync(source)) {
    throw new NotFoundError(`Template source not found: ${source}`, {
      resource: 'video-template',
      identifier: source,
      fix: 'Provide a valid template directory or .zip pack',
    });
  }

  const stats = await stat(source);
  const destDir = resolve(options.destDir);
  const cleanupPaths: string[] = [];

  let templateRoot = source;

  if (stats.isFile()) {
    if (!isZip(source)) {
      throw new CMError('INVALID_TEMPLATE', 'Template source must be a directory or .zip pack', {
        source,
      });
    }
    const tempDir = await extractZipToTemp(source);
    cleanupPaths.push(tempDir);
    templateRoot = await findTemplateRoot(tempDir);
  } else if (stats.isDirectory()) {
    templateRoot = await findTemplateRoot(source);
  } else {
    throw new CMError('INVALID_TEMPLATE', 'Template source must be a directory or .zip pack', {
      source,
    });
  }

  try {
    const { template } = await loadTemplateFromDir(templateRoot);
    const installPath = join(destDir, template.id);
    await mkdir(destDir, { recursive: true });

    if (existsSync(installPath)) {
      if (!options.force) {
        throw new CMError('ALREADY_EXISTS', `Template already installed: ${template.id}`, {
          installPath,
          fix: 'Use --force to overwrite the existing template',
        });
      }
      await rm(installPath, { recursive: true, force: true });
    }

    await cp(templateRoot, installPath, { recursive: true });
    return { id: template.id, installPath };
  } finally {
    await Promise.all(cleanupPaths.map((path) => rm(path, { recursive: true, force: true })));
  }
}
