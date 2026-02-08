/**
 * Template dependency installer (for Remotion code templates).
 *
 * Runs the template's package manager in its project root if node_modules is missing.
 *
 * Security: installing dependencies can execute install scripts. This should only
 * be used after the user has explicitly opted into running template code.
 */
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, resolve } from 'node:path';
import { createLogger } from '../../core/logger';
import { CMError } from '../../core/errors';
import type { TemplatePackageManager } from '../../domain/render-templates';

export type TemplateDepsInstallCommand = {
  command: string;
  args: string[];
};

function detectPackageManager(rootDir: string): TemplatePackageManager {
  const pnpmLock = join(rootDir, 'pnpm-lock.yaml');
  const yarnLock = join(rootDir, 'yarn.lock');
  if (existsSync(pnpmLock)) return 'pnpm';
  if (existsSync(yarnLock)) return 'yarn';
  return 'npm';
}

function buildInstallCommand(rootDir: string, packageManager: TemplatePackageManager): TemplateDepsInstallCommand {
  const hasPackageLock = existsSync(join(rootDir, 'package-lock.json'));

  if (packageManager === 'pnpm') {
    const hasLock = existsSync(join(rootDir, 'pnpm-lock.yaml'));
    const args = ['install'];
    if (hasLock) args.push('--frozen-lockfile');
    return { command: 'pnpm', args };
  }

  if (packageManager === 'yarn') {
    const hasLock = existsSync(join(rootDir, 'yarn.lock'));
    const args = ['install'];
    if (hasLock) args.push('--frozen-lockfile');
    return { command: 'yarn', args };
  }

  // npm
  if (hasPackageLock) {
    return { command: 'npm', args: ['ci', '--no-audit', '--no-fund'] };
  }
  return { command: 'npm', args: ['install', '--no-audit', '--no-fund'] };
}

async function runInstallCommand(params: {
  cwd: string;
  cmd: TemplateDepsInstallCommand;
  allowOutput: boolean;
}): Promise<void> {
  const child = spawn(params.cmd.command, params.cmd.args, {
    cwd: params.cwd,
    stdio: params.allowOutput ? 'inherit' : 'pipe',
    shell: true,
    env: process.env,
  });

  // Avoid deadlocks when stdio is piped by draining stdout/stderr.
  let stderrTail = '';
  if (!params.allowOutput && child.stderr) {
    child.stderr.on('data', (chunk) => {
      const text = Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : String(chunk);
      stderrTail = (stderrTail + text).slice(-4000);
    });
  }
  if (!params.allowOutput && child.stdout) {
    child.stdout.on('data', () => {
      // Drain only; we don't need stdout unless debugging.
    });
  }

  const exitCode = await new Promise<number | null>((resolveExit, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => resolveExit(code));
  });

  if (exitCode !== 0) {
    throw new CMError('TEMPLATE_DEPS_INSTALL_FAILED', 'Template dependency install failed', {
      cwd: params.cwd,
      command: params.cmd.command,
      args: params.cmd.args,
      exitCode,
      stderr: stderrTail || undefined,
      fix: `Run \`${params.cmd.command} ${params.cmd.args.join(' ')}\` in ${params.cwd}`,
    });
  }
}

/**
 * Returns true if `package.json` exists under a template directory.
 */
export function templateHasPackageJson(rootDir: string): boolean {
  return existsSync(join(rootDir, 'package.json'));
}

/**
 * Returns true if `node_modules` exists under a template directory.
 */
export function templateHasNodeModules(rootDir: string): boolean {
  return existsSync(join(rootDir, 'node_modules'));
}

/**
 * Install a code-template's dependencies using the detected (or chosen) package manager.
 */
export async function installTemplateDependencies(params: {
  rootDir: string;
  packageManager?: TemplatePackageManager;
  allowOutput?: boolean;
}): Promise<{ rootDir: string; packageManager: TemplatePackageManager }> {
  const rootDir = resolve(params.rootDir);
  const log = createLogger({ module: 'templates:deps', rootDir });

  if (!templateHasPackageJson(rootDir)) {
    throw new CMError(
      'INVALID_TEMPLATE',
      'Cannot install template dependencies: package.json not found',
      {
        rootDir,
        fix: 'Add a package.json to the template rootDir (or remove remotion.installDeps)',
      }
    );
  }

  const pm = params.packageManager ?? detectPackageManager(rootDir);
  const cmd = buildInstallCommand(rootDir, pm);

  log.info({ packageManager: pm, command: cmd.command, args: cmd.args }, 'Installing template dependencies');
  await runInstallCommand({ cwd: rootDir, cmd, allowOutput: Boolean(params.allowOutput) });
  log.info('Template dependencies installed');

  return { rootDir, packageManager: pm };
}
