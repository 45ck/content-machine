/**
 * Render template developer tooling.
 *
 * - scaffoldVideoTemplate(): create a new template directory + template.json
 * - packVideoTemplate(): bundle a template directory into a .zip pack for install
 */
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, resolve } from 'path';
import AdmZip from 'adm-zip';
import { RenderTemplateSchema, type RenderTemplate } from '../../domain/render-templates';
import { TemplateIdSchema } from '../../domain/ids';
import { CMError, NotFoundError, SchemaError } from '../../core/errors';
import { resolveRenderTemplate } from './index';

export interface ScaffoldVideoTemplateOptions {
  id: string;
  rootDir: string;
  /** Base template id or path. Defaults to `tiktok-captions`. */
  from?: string;
  /** Template mode: data-only (safe) or code (trusted Remotion project). */
  mode?: 'data' | 'code';
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

/**
 * Scaffold a new render template directory under `rootDir`, optionally based on an existing template id.
 */
export async function scaffoldVideoTemplate(
  options: ScaffoldVideoTemplateOptions
): Promise<ScaffoldVideoTemplateResult> {
  const idRaw = assertNonEmpty(options.id, 'id');
  const parsedId = TemplateIdSchema.safeParse(idRaw);
  if (!parsedId.success) {
    throw new SchemaError('Invalid template id', {
      id: idRaw,
      issues: parsedId.error.issues,
      fix: 'Use a kebab-case template id (letters/digits/hyphens), e.g. "acme-demo"',
    });
  }
  const id = parsedId.data;
  const rootDir = resolve(assertNonEmpty(options.rootDir, 'rootDir'));
  const from = options.from ? assertNonEmpty(options.from, 'from') : 'tiktok-captions';
  const mode = options.mode ?? 'data';

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

  const resolvedBase = await resolveRenderTemplate(from);
  const base: RenderTemplate = resolvedBase.template;

  const template = {
    ...base,
    id,
    name: toTitleCaseFromId(id) || base.name || id,
    description: base.description,
  };

  if (mode === 'code') {
    // Turn into a code template: we keep defaults, but point rendering at template-local Remotion code.
    template.remotion = {
      entryPoint: 'remotion/index.ts',
      rootDir: '.',
      publicDir: 'public',
      installDeps: 'prompt',
    };
  }

  // Ensure the scaffold is valid and normalized (fills defaults like schemaVersion).
  const validated = RenderTemplateSchema.parse(template);

  await writeFile(templatePath, `${JSON.stringify(validated, null, 2)}\n`, 'utf-8');

  if (mode === 'code') {
    // Scaffold a minimal Remotion project wired to CM RenderProps.
    const remotionDir = join(templateDir, 'remotion');
    await mkdir(remotionDir, { recursive: true });

    const compositionId = validated.compositionId;
    const componentName = compositionId === 'SplitScreenGameplay' ? 'SplitScreenGameplay' : 'ShortVideo';

    // Minimal package.json so users can add dependencies (transitions, animations, etc).
    const pkgJsonPath = join(templateDir, 'package.json');
    const pkgJson = {
      name: `cm-template-${id}`,
      private: true,
      type: 'module',
    };
    await writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`, 'utf-8');

    // Public folder (optional assets).
    const publicDir = join(templateDir, 'public');
    await mkdir(publicDir, { recursive: true });
    await writeFile(join(publicDir, 'README.txt'), 'Template public assets go here.\n', 'utf-8');

    // Remotion entrypoint (must include "registerRoot" for bundler validation).
    await writeFile(
      join(remotionDir, 'index.ts'),
      `import { registerRoot } from 'remotion';\nimport { Root } from './root';\n\nregisterRoot(Root);\n`,
      'utf-8'
    );

    // Root: registers a single composition with the template's compositionId.
    await writeFile(
      join(remotionDir, 'root.tsx'),
      `import React from 'react';\nimport { Composition } from 'remotion';\nimport type { RenderProps } from 'content-machine';\nimport { Main } from './Main';\n\nexport const Root: React.FC = () => {\n  return (\n    <>\n      <Composition\n        id=${JSON.stringify(compositionId)}\n        component={Main as unknown as React.FC}\n        durationInFrames={30 * 60}\n        fps={30}\n        width={1080}\n        height={1920}\n        defaultProps={{\n          clips: [],\n          words: [],\n          audioPath: '',\n          audioMix: undefined,\n          duration: 60,\n          width: 1080,\n          height: 1920,\n          fps: 30,\n        } satisfies Partial<RenderProps>}\n      />\n    </>\n  );\n};\n`,
      'utf-8'
    );

    // Main composition component: start by reusing CM's built-in component, then customize.
    // Template authors can import any Remotion animation libs and wrap/replace this component.
    await writeFile(
      join(remotionDir, 'Main.tsx'),
      `import React from 'react';\nimport type { RenderProps } from 'content-machine';\nimport { TemplateSDK } from 'content-machine';\n\nconst { ${componentName} } = TemplateSDK;\n\nexport const Main: React.FC<RenderProps> = (props) => {\n  return <${componentName} {...props} />;\n};\n`,
      'utf-8'
    );
  }

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

async function loadTemplateFromDir(
  templateDir: string
): Promise<{ template: RenderTemplate; templatePath: string }> {
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

  const parsed = RenderTemplateSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new SchemaError('Invalid render template schema', {
      path: templatePath,
      issues: parsed.error.issues,
      fix: 'Update template.json to match the required schema',
    });
  }

  return { template: parsed.data, templatePath };
}

/**
 * Pack a render template directory into a `.cmtemplate.zip` bundle.
 */
export async function packVideoTemplate(options: PackVideoTemplateOptions): Promise<PackVideoTemplateResult> {
  const templateDir = resolve(assertNonEmpty(options.templateDir, 'templateDir'));
  if (!existsSync(templateDir)) {
    throw new NotFoundError(`Template directory not found: ${templateDir}`, {
      resource: 'render-template',
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
  // Never pack node_modules: it makes packs huge and non-portable across platforms.
  zip.addLocalFolder(templateDir, template.id, (filename) => {
    const normalized = filename.replace(/\\/g, '/');
    if (normalized.includes('/node_modules/')) return false;
    if (normalized.endsWith('/node_modules')) return false;
    if (normalized.includes('/.git/')) return false;
    if (normalized.endsWith('/.git')) return false;
    return true;
  });
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
