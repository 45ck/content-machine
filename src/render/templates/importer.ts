/**
 * Remotion template importer.
 *
 * Imports a Remotion project (local dir, GitHub repo, or zip URL) into a CM
 * template directory and scaffolds a CM-compatible code template wrapper.
 *
 * Security: Importing does not execute code. Rendering a code template still
 * requires explicit `--allow-template-code`.
 */
import { createWriteStream, existsSync } from 'node:fs';
import {
  cp,
  mkdtemp,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import AdmZip from 'adm-zip';
import { CMError, NotFoundError, SchemaError } from '../../core/errors';
import { TemplateIdSchema } from '../../domain/ids';
import {
  VideoTemplateSchema,
  type TemplateDependencyInstallMode,
  type TemplatePackageManager,
} from '../../domain/render-templates';

export type ImportTemplateMode = 'cm';

export interface ImportRemotionTemplateOptions {
  /**
   * Source Remotion project.
   *
   * Supported:
   * - local directory
   * - GitHub repo: owner/repo or https://github.com/owner/repo[/tree/ref/subdir]
   * - Remotion template page: https://www.remotion.dev/templates/<slug>
   * - direct zip URL
   */
  source: string;
  /** Destination templates root dir, e.g. ~/.cm/templates or ./.cm/templates */
  destRootDir: string;
  /** Template id (kebab-case). If omitted, derived from source. */
  id?: string;
  /** Optional display name override. */
  name?: string;
  /** Optional description override. */
  description?: string;
  /** Import mode (currently only CM wrapper). */
  mode?: ImportTemplateMode;
  /** Overwrite existing destination directory. */
  force?: boolean;
  /** Base CM composition for the wrapper. */
  cmComposition?: 'ShortVideo' | 'SplitScreenGameplay';
  /** Template dependency install preference (stored in template.json). */
  installDeps?: TemplateDependencyInstallMode;
  /** Preferred package manager (stored in template.json). */
  packageManager?: TemplatePackageManager;
  /** Git ref when importing from GitHub. Defaults to main/master auto-detect. */
  ref?: string;
  /** Subdirectory inside a downloaded repo to import (relative). */
  subdir?: string;
  /** Disable network usage for remote sources. */
  offline?: boolean;
}

export interface ImportRemotionTemplateResult {
  id: string;
  templateDir: string;
  templatePath: string;
  importedFrom: {
    source: string;
    resolvedSource?: string;
  };
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

function toKebabCase(input: string): string {
  return input
    .trim()
    .replace(/\.git$/i, '')
    .replace(/\?.*$/, '')
    .replace(/#.*$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .toLowerCase();
}

function toTitleCaseFromId(id: string): string {
  return id
    .trim()
    .split(/[-_ ]+/g)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function isHttpUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

function isLikelyZipUrl(input: string): boolean {
  if (!isHttpUrl(input)) return false;
  const clean = input.split('?')[0]?.split('#')[0] ?? input;
  return clean.toLowerCase().endsWith('.zip');
}

function isRemotionTemplatePageUrl(input: string): boolean {
  if (!isHttpUrl(input)) return false;
  try {
    const url = new URL(input);
    return url.hostname === 'www.remotion.dev' && url.pathname.startsWith('/templates/');
  } catch {
    return false;
  }
}

type GithubSource = {
  owner: string;
  repo: string;
  ref?: string;
  subdir?: string;
};

function parseGithubSource(input: string): GithubSource | null {
  const trimmed = input.trim();

  const shorthand = trimmed.startsWith('github:') ? trimmed.slice('github:'.length) : trimmed;
  const shorthandMatch = shorthand.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shorthandMatch) {
    return { owner: shorthandMatch[1]!, repo: shorthandMatch[2]! };
  }

  if (!isHttpUrl(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.hostname !== 'github.com') return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;

    const owner = parts[0]!;
    const repo = parts[1]!.replace(/\.git$/i, '');
    // https://github.com/<owner>/<repo>/tree/<ref>/<subdir>
    if (parts[2] === 'tree' && parts[3]) {
      const ref = parts[3];
      const subdir = parts.slice(4).join('/');
      return {
        owner,
        repo,
        ref,
        subdir: subdir || undefined,
      };
    }

    return { owner, repo };
  } catch {
    return null;
  }
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new CMError('API_ERROR', `Failed to download: HTTP ${response.status} ${response.statusText}`, {
      url,
      status: response.status,
      statusText: response.statusText,
    });
  }
  if (!response.body) {
    throw new CMError('API_ERROR', 'Failed to download: No response body', { url });
  }

  await mkdir(dirname(destPath), { recursive: true });
  const tmpPath = `${destPath}.part`;
  await rm(tmpPath, { force: true }).catch(() => {});
  const fileStream = createWriteStream(tmpPath);
  const readable = Readable.fromWeb(response.body as any);
  await pipeline(readable, fileStream);
  await rename(tmpPath, destPath);
}

async function extractZipToTemp(zipPath: string): Promise<string> {
  const zip = new AdmZip(zipPath);
  const tempDir = await mkdtemp(join(tmpdir(), 'cm-template-import-'));

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const normalized = entry.entryName.replace(/\\/g, '/');
    if (normalized.includes('..') || normalized.startsWith('/')) {
      throw new CMError('INVALID_TEMPLATE', 'Zip contains unsafe paths', {
        entry: entry.entryName,
        fix: 'Remove any absolute paths or .. segments from the zip archive',
      });
    }
    const destPath = resolve(join(tempDir, normalized));
    if (!destPath.startsWith(tempDir)) {
      throw new CMError('INVALID_TEMPLATE', 'Zip extraction escaped temp dir', {
        entry: entry.entryName,
      });
    }
    await mkdir(dirname(destPath), { recursive: true });
    await writeFile(destPath, entry.getData());
  }

  return tempDir;
}

async function unwrapSingleTopLevelDir(root: string): Promise<string> {
  const entries = await readdir(root, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory() && e.name !== '__MACOSX');
  const files = entries.filter((e) => e.isFile());
  if (dirs.length === 1 && files.length === 0) {
    return join(root, dirs[0]!.name);
  }
  return root;
}

function safeRelativePath(input: string, label: string): string {
  const normalized = input.replace(/\\/g, '/').trim();
  if (!normalized) {
    throw new SchemaError(`Invalid ${label}`, {
      [label]: input,
      fix: `Provide a non-empty ${label}`,
    });
  }
  if (normalized.startsWith('/') || normalized.startsWith('~') || normalized.includes('..')) {
    throw new SchemaError(`Invalid ${label}: must be a safe relative path`, {
      [label]: input,
      fix: `Use a relative path without "/", "~" or ".." (example: "templates/my-template")`,
    });
  }
  return normalized;
}

function shouldCopyFile(src: string): boolean {
  const normalized = src.replace(/\\/g, '/');
  if (normalized.includes('/node_modules/')) return false;
  if (normalized.endsWith('/node_modules')) return false;
  if (normalized.includes('/.git/')) return false;
  if (normalized.endsWith('/.git')) return false;
  return true;
}

async function resolveRemotionTemplatePageToGithubUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new CMError('API_ERROR', `Failed to fetch Remotion template page: HTTP ${response.status}`, {
      url,
      status: response.status,
    });
  }
  const html = await response.text();
  const match = html.match(/href=https:\/\/github\.com\/[^\s"'>]+/i);
  if (!match) {
    throw new CMError('NOT_FOUND', 'Could not find a GitHub source link on the Remotion template page', {
      url,
      fix: 'Pass a GitHub repo URL (or owner/repo) directly instead of a template page URL',
    });
  }
  const href = match[0];
  const extracted = href.replace(/^href=/i, '');
  return extracted;
}

async function downloadGithubRepoZip(params: {
  owner: string;
  repo: string;
  ref?: string;
}): Promise<{ zipPath: string; resolvedRef: string; tempDir: string }> {
  const { owner, repo } = params;
  const candidates = params.ref ? [params.ref] : ['main', 'master'];
  const tempDir = await mkdtemp(join(tmpdir(), 'cm-github-zip-'));
  const zipPath = join(tempDir, `${repo}.zip`);

  let lastError: unknown = null;
  for (const ref of candidates) {
    const url = `https://codeload.github.com/${owner}/${repo}/zip/${encodeURIComponent(ref)}`;
    try {
      await downloadToFile(url, zipPath);
      return { zipPath, resolvedRef: ref, tempDir };
    } catch (error) {
      lastError = error;
    }
  }

  await rm(tempDir, { recursive: true, force: true });
  throw new CMError(
    'NOT_FOUND',
    `Failed to download GitHub repo zip for ${owner}/${repo} (${candidates.join(', ')})`,
    {
      owner,
      repo,
      tried: candidates,
      fix: 'Provide --ref <branch|tag> explicitly, or check the repo exists and is public',
    },
    lastError instanceof Error ? lastError : undefined
  );
}

async function acquireSourceDir(options: {
  source: string;
  offline: boolean;
  ref?: string;
  subdir?: string;
}): Promise<{ dir: string; cleanupPaths: string[]; resolvedSource?: string }> {
  const source = options.source.trim();

  // Local directory
  if (!isHttpUrl(source) && !parseGithubSource(source)) {
    const dir = resolve(source);
    if (!existsSync(dir)) {
      throw new NotFoundError(`Source not found: ${dir}`, {
        resource: 'template-source',
        identifier: source,
        fix: 'Provide a valid directory path, GitHub repo, or zip URL',
      });
    }
    const st = await stat(dir);
    if (!st.isDirectory()) {
      throw new CMError('INVALID_ARGUMENT', 'Source must be a directory, GitHub repo, or zip URL', {
        source: dir,
        fix: 'Point the importer at a directory containing a Remotion project',
      });
    }
    return { dir, cleanupPaths: [] };
  }

  if (options.offline) {
    throw new CMError('OFFLINE', 'Cannot import remote template in offline mode', {
      source,
      fix: 'Re-run without --offline (or import from a local directory)',
    });
  }

  // Remotion template page -> GitHub
  let resolvedSource = source;
  if (isRemotionTemplatePageUrl(source)) {
    resolvedSource = await resolveRemotionTemplatePageToGithubUrl(source);
  }

  // GitHub
  const gh = parseGithubSource(resolvedSource);
  if (gh) {
    const zip = await downloadGithubRepoZip({ owner: gh.owner, repo: gh.repo, ref: options.ref ?? gh.ref });
    const extracted = await extractZipToTemp(zip.zipPath);

    const cleanupPaths = [zip.tempDir, extracted];
    const unwrapped = await unwrapSingleTopLevelDir(extracted);
    const subdir = options.subdir ?? gh.subdir;
    const finalDir = subdir ? resolve(unwrapped, safeRelativePath(subdir, 'subdir')) : unwrapped;
    if (!finalDir.startsWith(unwrapped)) {
      throw new SchemaError('Invalid subdir', {
        subdir,
        fix: 'Provide a relative subdir inside the repository',
      });
    }
    if (!existsSync(finalDir)) {
      throw new NotFoundError(`Repo subdir not found: ${subdir}`, {
        resource: 'repo-subdir',
        identifier: subdir,
        fix: 'Check --subdir or the GitHub URL path',
      });
    }

    return {
      dir: finalDir,
      cleanupPaths,
      resolvedSource: `github:${gh.owner}/${gh.repo}#${zip.resolvedRef}${subdir ? `:${subdir}` : ''}`,
    };
  }

  // Direct zip URL
  if (isLikelyZipUrl(resolvedSource)) {
    const tempDir = await mkdtemp(join(tmpdir(), 'cm-template-zip-'));
    const zipPath = join(tempDir, `source${extname(resolvedSource.split('?')[0] ?? '') || '.zip'}`);
    await downloadToFile(resolvedSource, zipPath);
    const extracted = await extractZipToTemp(zipPath);
    const cleanupPaths = [tempDir, extracted];
    const unwrapped = await unwrapSingleTopLevelDir(extracted);
    const finalDir = options.subdir ? resolve(unwrapped, safeRelativePath(options.subdir, 'subdir')) : unwrapped;
    return { dir: finalDir, cleanupPaths, resolvedSource };
  }

  throw new CMError('INVALID_ARGUMENT', 'Unsupported source for template import', {
    source,
    fix: 'Use a local directory, GitHub repo (owner/repo), Remotion template URL, or a .zip URL',
  });
}

async function ensurePackageJson(templateDir: string, templateId: string): Promise<void> {
  const pkgJsonPath = join(templateDir, 'package.json');
  if (existsSync(pkgJsonPath)) return;

  const pkgJson = {
    name: `cm-template-${templateId}`,
    private: true,
    type: 'module',
  };
  await writeFile(pkgJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`, 'utf-8');
}

async function scaffoldCmWrapper(params: {
  templateDir: string;
  compositionId: string;
  baseComponent: 'ShortVideo' | 'SplitScreenGameplay';
}): Promise<{ entryPoint: string }>{
  const { templateDir, compositionId, baseComponent } = params;
  const remotionDir = join(templateDir, 'remotion');
  await mkdir(remotionDir, { recursive: true });
  await mkdir(join(remotionDir, 'public'), { recursive: true });

  await writeFile(
    join(remotionDir, 'index.ts'),
    `import { registerRoot } from 'remotion';\nimport { Root } from './root';\n\nregisterRoot(Root);\n`,
    'utf-8'
  );

  await writeFile(
    join(remotionDir, 'root.tsx'),
    `import React from 'react';\nimport { Composition } from 'remotion';\nimport type { RenderProps } from 'content-machine';\nimport { Main } from './Main';\n\nexport const Root: React.FC = () => {\n  return (\n    <>\n      <Composition\n        id=${JSON.stringify(compositionId)}\n        component={Main as unknown as React.FC}\n        durationInFrames={30 * 60}\n        fps={30}\n        width={1080}\n        height={1920}\n        defaultProps={{\n          clips: [],\n          words: [],\n          audioPath: '',\n          audioMix: undefined,\n          duration: 60,\n          width: 1080,\n          height: 1920,\n          fps: 30,\n        } satisfies Partial<RenderProps>}\n      />\n    </>\n  );\n};\n`,
    'utf-8'
  );

  await writeFile(
    join(remotionDir, 'Main.tsx'),
    `import React from 'react';\nimport type { RenderProps } from 'content-machine';\nimport { TemplateSDK } from 'content-machine';\n\nconst { ${baseComponent} } = TemplateSDK;\n\nexport const Main: React.FC<RenderProps> = (props) => {\n  return <${baseComponent} {...props} />;\n};\n`,
    'utf-8'
  );

  await writeFile(
    join(remotionDir, 'README.txt'),
    `This folder is generated by 'cm templates import'.\n\n- Edit Main.tsx to customize the composition.\n- You can import code from the imported Remotion project and use it here.\n`,
    'utf-8'
  );

  return { entryPoint: 'index.ts' };
}

function deriveIdFromSource(source: string): string {
  const gh = parseGithubSource(source);
  if (gh) return toKebabCase(gh.repo);

  if (isHttpUrl(source)) {
    try {
      const url = new URL(source);
      const last = url.pathname.split('/').filter(Boolean).pop() ?? 'template';
      const cleaned = last.replace(/\.zip$/i, '');
      return toKebabCase(cleaned);
    } catch {
      return toKebabCase(source);
    }
  }

  return toKebabCase(basename(source));
}

/**
 * Import a Remotion project into a CM template directory and scaffold a CM wrapper.
 *
 * Note: importing does not execute the imported code. Rendering a code template
 * still requires explicit opt-in via `--allow-template-code`.
 */
export async function importRemotionTemplate(
  options: ImportRemotionTemplateOptions
): Promise<ImportRemotionTemplateResult> {
  const source = assertNonEmpty(options.source, 'source');
  const destRootDir = resolve(assertNonEmpty(options.destRootDir, 'destRootDir'));

  const idRaw = options.id ? assertNonEmpty(options.id, 'id') : deriveIdFromSource(source);
  const idParsed = TemplateIdSchema.safeParse(idRaw);
  if (!idParsed.success) {
    throw new SchemaError('Invalid template id', {
      id: idRaw,
      issues: idParsed.error.issues,
      fix: 'Use a kebab-case id (letters/digits/hyphens), e.g. "remotion-tiktok"',
    });
  }
  const id = idParsed.data;

  const cleanupPaths: string[] = [];
  try {
    const acquired = await acquireSourceDir({
      source,
      offline: Boolean(options.offline),
      ref: options.ref,
      subdir: options.subdir,
    });
    cleanupPaths.push(...acquired.cleanupPaths);

    const templateDir = join(destRootDir, id);
    const templatePath = join(templateDir, 'template.json');

    if (existsSync(templateDir)) {
      if (!options.force) {
        throw new CMError('ALREADY_EXISTS', `Template already exists: ${id}`, {
          templateDir,
          fix: 'Use --force to overwrite the existing template',
        });
      }
      await rm(templateDir, { recursive: true, force: true });
    }

    await mkdir(destRootDir, { recursive: true });
    await mkdir(templateDir, { recursive: true });

    // Copy source project into template dir, excluding node_modules/.git.
    // Keep it under an `imported/` folder so the CM wrapper stays clean.
    const importedDir = join(templateDir, 'imported');
    await mkdir(importedDir, { recursive: true });
    await cp(acquired.dir, importedDir, {
      recursive: true,
      filter: (src) => shouldCopyFile(src),
    });

    const mode: ImportTemplateMode = options.mode ?? 'cm';
    if (mode !== 'cm') {
      throw new CMError('INVALID_ARGUMENT', `Unsupported import mode: ${mode}`, {
        fix: 'Use --mode cm',
      });
    }

    const baseComponent = options.cmComposition ?? 'ShortVideo';
    const compositionId = baseComponent;
    const { entryPoint } = await scaffoldCmWrapper({
      templateDir,
      compositionId,
      baseComponent,
    });

    await ensurePackageJson(templateDir, id);

    const template = VideoTemplateSchema.parse({
      schemaVersion: '1.0.0',
      id,
      name: options.name?.trim() || toTitleCaseFromId(id) || id,
      description:
        options.description?.trim() ||
        `Imported Remotion project (${acquired.resolvedSource ?? source}) as a CM code template`,
      compositionId,
      defaults: {
        orientation: 'portrait',
        fps: 30,
        captionPreset: 'tiktok',
      },
      remotion: {
        entryPoint,
        rootDir: 'remotion',
        publicDir: 'public',
        ...(options.installDeps ? { installDeps: options.installDeps } : { installDeps: 'prompt' }),
        ...(options.packageManager ? { packageManager: options.packageManager } : {}),
      },
    });

    await writeFile(templatePath, `${JSON.stringify(template, null, 2)}\n`, 'utf-8');

    return {
      id,
      templateDir,
      templatePath,
      importedFrom: { source, resolvedSource: acquired.resolvedSource },
    };
  } finally {
    await Promise.all(cleanupPaths.map((p) => rm(p, { recursive: true, force: true })));
  }
}
