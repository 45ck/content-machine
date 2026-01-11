/**
 * Hooks command - manage hook libraries
 */
import { Command } from 'commander';
import { join, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { expandTilde } from '../paths';
import { loadConfig } from '../../core/config';
import { NotFoundError } from '../../core/errors';
import { TRANSITIONAL_HOOKS } from '../../hooks/libraries/transitionalhooks';
import { DEFAULT_HOOKS_DIR } from '../../hooks/constants';
import { downloadHookClip } from '../../hooks/download';
import type { HookDefinition } from '../../hooks/schema';

function resolveHookLibrary(library: string): HookDefinition[] {
  if (library === 'transitionalhooks') return TRANSITIONAL_HOOKS;
  throw new NotFoundError(`Unknown hook library: ${library}`, {
    resource: 'hook-library',
    identifier: library,
    fix: 'Use --library transitionalhooks',
  });
}

function resolveHookDefinition(library: string, hookId: string): HookDefinition {
  const entries = resolveHookLibrary(library);
  const definition = entries.find((entry) => entry.id === hookId);
  if (!definition) {
    throw new NotFoundError(`Hook not found: ${hookId}`, {
      resource: 'hook',
      identifier: hookId,
      fix: `Run: cm hooks list --library ${library}`,
    });
  }
  return definition;
}

export const hooksCommand = new Command('hooks')
  .description('Manage hook libraries')
  .addCommand(
    new Command('list')
      .description('List hooks in a library')
      .option('--library <id>', 'Hook library id (defaults to config)')
      .action(async (options) => {
        try {
          const runtime = getCliRuntime();
          const config = loadConfig();
          const library = options.library ? String(options.library) : config.hooks.library;
          const entries = resolveHookLibrary(library);

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'hooks:list',
                args: { library },
                outputs: { hooks: entries },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          if (entries.length === 0) {
            writeStderrLine(`No hooks found for library: ${library}`);
            return;
          }

          entries.forEach((entry) => {
            writeStderrLine(`${entry.id} - ${entry.title}`);
          });
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .addCommand(
    new Command('download')
      .description('Download a hook clip by id')
      .argument('<hookId>', 'Hook id (e.g. no-crunch)')
      .option('--library <id>', 'Hook library id (defaults to config)')
      .option('--hooks-dir <path>', 'Root directory for hook libraries (defaults to config)')
      .option('--force', 'Re-download even if cached', false)
      .option('--offline', 'Disable network access for downloads', false)
      .action(async (hookId, options) => {
        try {
          const runtime = getCliRuntime();
          const config = loadConfig();
          const library = options.library ? String(options.library) : config.hooks.library;
          const hooksDir = options.hooksDir ? String(options.hooksDir) : config.hooks.dir;
          const force = Boolean(options.force);
          const offline = Boolean(options.offline) || runtime.offline;

          const definition = resolveHookDefinition(library, String(hookId).toLowerCase());
          const root = resolve(expandTilde(hooksDir || DEFAULT_HOOKS_DIR));
          const destPath = resolve(join(root, library, definition.filename));

          await mkdir(join(root, library), { recursive: true });

          const result = await downloadHookClip(definition, {
            destinationPath: destPath,
            force,
            offline,
          });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'hooks:download',
                args: { hookId, library, hooksDir, force },
                outputs: { downloaded: result.downloaded, path: result.path },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          const status = result.downloaded ? 'Downloaded' : 'Cached';
          writeStderrLine(`${status} hook: ${definition.id} (${library})`);
          writeStderrLine(`Path: ${result.path}`);
          if (!existsSync(result.path)) {
            writeStderrLine('Warning: download completed but file not found on disk');
          }

          writeStdoutLine(result.path);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .configureHelp({
    sortSubcommands: true,
  })
  .showHelpAfterError();
