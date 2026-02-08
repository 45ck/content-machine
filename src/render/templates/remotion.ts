/**
 * Remotion code-template helpers.
 *
 * Code templates are optional extensions to data-first templates:
 * a template can ship a Remotion entrypoint + compositions inside the template pack.
 *
 * Security: This is arbitrary code execution during bundling/rendering.
 * Callers must gate usage behind an explicit allow flag.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, join } from 'node:path';
import { CMError, NotFoundError } from '../../core/errors';
import type { TemplateDependencyInstallMode, TemplatePackageManager } from '../../domain/render-templates';
import type { ResolvedVideoTemplate } from './index';

export interface ResolvedRemotionTemplateProject {
  /** Absolute path to the template directory (folder containing template.json). */
  templateDir: string;
  /** Absolute path to the Remotion project root (bundle rootDir). */
  rootDir: string;
  /** Absolute path to the Remotion entrypoint (registerRoot file). */
  entryPoint: string;
  /** Public directory to copy (relative to rootDir). */
  publicDir: string;
  /** Preferred package manager (optional). */
  packageManager?: TemplatePackageManager;
  /** Dependency installation preference (optional). */
  installDeps?: TemplateDependencyInstallMode;
}

function assertPathInside(baseDir: string, candidate: string, label: string): void {
  const rel = relative(baseDir, candidate);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new CMError('INVALID_TEMPLATE', `Template ${label} must be inside the template directory`, {
      baseDir,
      candidate,
      fix: `Update template.remotion.${label} to point to a path inside the template pack`,
    });
  }
}

/**
 * Resolve a Remotion project for a code template, validating paths are within the template directory.
 */
export function resolveRemotionTemplateProject(
  resolved: ResolvedVideoTemplate
): ResolvedRemotionTemplateProject | null {
  const remotion = resolved.template.remotion;
  if (!remotion) return null;

  if (!resolved.templatePath) {
    throw new CMError('INVALID_TEMPLATE', 'Code templates must be loaded from disk (not builtin)', {
      templateId: resolved.template.id,
      fix: 'Install the template pack to ~/.cm/templates/<id> or pass a path to template.json',
    });
  }

  const templateDir = dirname(resolved.templatePath);
  const rootDir = resolve(templateDir, remotion.rootDir ?? '.');
  assertPathInside(templateDir, rootDir, 'rootDir');

  const entryPoint = resolve(rootDir, remotion.entryPoint);
  assertPathInside(templateDir, entryPoint, 'entryPoint');

  const publicDir = remotion.publicDir ?? 'public';
  if (publicDir.includes('..') || publicDir.startsWith('/') || publicDir.startsWith('~')) {
    throw new CMError('INVALID_TEMPLATE', 'template.remotion.publicDir must be a safe relative path', {
      templateId: resolved.template.id,
      publicDir,
      fix: 'Use a relative path like "public" or "assets/public"',
    });
  }

  if (!existsSync(entryPoint)) {
    throw new NotFoundError(`Remotion entrypoint not found: ${entryPoint}`, {
      resource: 'remotion-entrypoint',
      identifier: resolved.template.id,
      entryPoint,
      templateDir,
      fix: `Ensure the template pack contains ${join(remotion.rootDir ?? '.', remotion.entryPoint)}`,
    });
  }

  return {
    templateDir,
    rootDir,
    entryPoint,
    publicDir,
    packageManager: remotion.packageManager,
    installDeps: remotion.installDeps,
  };
}
