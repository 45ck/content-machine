/**
 * Video template developer tooling.
 *
 * - scaffoldVideoTemplate(): create a new template directory + template.json
 * - packVideoTemplate(): bundle a template directory into a .zip pack for install
 */
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import AdmZip from 'adm-zip';
import { VideoTemplateSchema, type VideoTemplate } from '../../domain/render-templates';
import { CMError, NotFoundError, SchemaError } from '../../core/errors';
import { resolveVideoTemplate } from './index';

export interface ScaffoldVideoTemplateOptions {
  id: string;
  rootDir: string;
  /** Base template id or path. Defaults to `tiktok-captions`. */
  from?: string;
  /** Overwrite if the destination directory already exists. */
  force?: boolean;
}

export interface ScaffoldVideoTemplateResult {
  id: string;
  templateDir: string;
  templatePath: string;
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

export async function scaffoldVideoTemplate(
  options: ScaffoldVideoTemplateOptions
): Promise<ScaffoldVideoTemplateResult> {
  const id = assertNonEmpty(options.id, 'id');
  const rootDir = resolve(assertNonEmpty(options.rootDir, 'rootDir'));
  const from = options.from ? assertNonEmpty(options.from, 'from') : 'tiktok-captions';

  const templateDir = join(rootDir, id);
  const templatePath = join(templateDir, 'template.json');

  if (existsSync(templateDir)) {
    if (!options.force) {
      throw new CMError('ALREADY_EXISTS', `Template directory already exists: ${templateDir}`, {
        templateDir,
        fix: 'Use --force to overwrite the existing template directory',
      });
    }
    await rm(templateDir, { recursive: true, force: true });
  }

  await mkdir(templateDir, { recursive: true });

  const resolvedBase = await resolveVideoTemplate(from);
  const base: VideoTemplate = resolvedBase.template;

  const template: VideoTemplate = {
    ...base,
    id,
    name: toTitleCaseFromId(id) || base.name || id,
    description: base.description,
  };

  // Ensure the scaffold is valid and normalized (fills defaults like schemaVersion).
  const validated = VideoTemplateSchema.parse(template);

  await writeFile(templatePath, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');

  return { id, templateDir, templatePath };
}

export interface PackVideoTemplateOptions {
  templateDir: string;
  /** Output path for the template pack zip. Defaults to `<parent>/<id>.cmtemplate.zip`. */
  outputPath?: string;
}

export interface PackVideoTemplateResult {
  id: string;
  outputPath: string;
}

async function loadTemplateFromDir(templateDir: string): Promise<{ template: VideoTemplate; templatePath: string }> {
  const templatePath = join(templateDir, 'template.json');
  if (!existsSync(templatePath)) {
    throw new NotFoundError(`template.json not found: ${templatePath}`, {
      resource: 'video-template',
      identifier: templateDir,
      templatePath,
      fix: 'Ensure the directory contains a template.json file',
    });
  }

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

  const parsed = VideoTemplateSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new SchemaError('Invalid video template schema', {
      path: templatePath,
      issues: parsed.error.issues,
      fix: 'Update template.json to match the required schema',
    });
  }

  return { template: parsed.data, templatePath };
}

export async function packVideoTemplate(options: PackVideoTemplateOptions): Promise<PackVideoTemplateResult> {
  const templateDir = resolve(assertNonEmpty(options.templateDir, 'templateDir'));
  if (!existsSync(templateDir)) {
    throw new NotFoundError(`Template directory not found: ${templateDir}`, {
      resource: 'video-template',
      identifier: templateDir,
      fix: 'Provide a valid template directory path',
    });
  }

  const stats = await stat(templateDir);
  if (!stats.isDirectory()) {
    throw new CMError('INVALID_TEMPLATE', 'Template path must be a directory', {
      templateDir,
      fix: 'Provide a directory containing template.json',
    });
  }

  const { template } = await loadTemplateFromDir(templateDir);

  const outputPath = resolve(
    options.outputPath
      ? assertNonEmpty(options.outputPath, 'outputPath')
      : join(dirname(templateDir), `${template.id}.cmtemplate.zip`)
  );

  // If the output path already exists, remove it so it does not get included during packing.
  if (existsSync(outputPath)) {
    await rm(outputPath, { force: true });
  }

  await mkdir(dirname(outputPath), { recursive: true });

  const zip = new AdmZip();
  zip.addLocalFolder(templateDir, template.id);
  zip.writeZip(outputPath);

  return { id: template.id, outputPath };
}

export interface PreviewVideoTemplateOptions {
  templateDir: string;
}

export interface PreviewVideoTemplateResult {
  id: string;
}

/**
 * Placeholder for future "template preview" UX.
 * Today, we keep this lightweight and deterministic for CI while still providing an API surface.
 */
export async function previewVideoTemplate(
  options: PreviewVideoTemplateOptions
): Promise<PreviewVideoTemplateResult> {
  const templateDir = resolve(assertNonEmpty(options.templateDir, 'templateDir'));
  const { template } = await loadTemplateFromDir(templateDir);
  return { id: template.id };
}

