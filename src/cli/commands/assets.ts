/**
 * Assets command - manage on-demand dependencies and cache locations
 */
import { Command } from 'commander';
import { join, resolve } from 'node:path';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError, parseWhisperModel } from '../utils';
import { loadConfig } from '../../core/config';
import { CMError } from '../../core/errors';
import { resolveWhisperDir } from '../../core/assets/whisper';
import { evaluateRequirements, planWhisperRequirements } from '../../core/assets/requirements';
import { expandTilde } from '../paths';

function resolveAssetCacheDir(): string {
  const env = process.env.CM_ASSET_CACHE_DIR;
  return env
    ? resolve(expandTilde(env))
    : join(process.cwd(), '.cache', 'content-machine', 'assets');
}

export const assetsCommand = new Command('assets')
  .description('Manage on-demand assets and dependency cache locations')
  .addCommand(
    new Command('paths').description('Print resolved asset/cache directories').action(async () => {
      try {
        const runtime = getCliRuntime();
        const config = loadConfig();

        const whisperDir = resolveWhisperDir();
        const hooksDir = resolve(expandTilde(config.hooks.dir));
        const assetCacheDir = resolveAssetCacheDir();

        if (runtime.json) {
          writeJsonEnvelope(
            buildJsonEnvelope({
              command: 'assets:paths',
              outputs: { whisperDir, hooksDir, assetCacheDir },
              timingsMs: Date.now() - runtime.startTime,
            })
          );
          return;
        }

        writeStderrLine('Asset paths:');
        writeStderrLine(`- Whisper: ${whisperDir}`);
        writeStderrLine(`- Hooks:   ${hooksDir}`);
        writeStderrLine(`- Cache:   ${assetCacheDir}`);
      } catch (error) {
        handleCommandError(error);
      }
    })
  )
  .addCommand(
    new Command('whisper')
      .description('Manage Whisper dependencies')
      .addCommand(
        new Command('status')
          .description('Check whether Whisper binary + model are installed')
          .option('--model <model>', 'Whisper model: tiny, base, small, medium, large', 'base')
          .option('--dir <path>', 'Whisper directory (defaults to resolved CM_WHISPER_DIR)')
          .option('--version <version>', 'whisper.cpp version', '1.5.5')
          .action(async (options) => {
            try {
              const runtime = getCliRuntime();
              const model = parseWhisperModel(options.model);
              const dir = options.dir
                ? resolve(expandTilde(String(options.dir)))
                : resolveWhisperDir();
              const version = String(options.version);

              const requirements = planWhisperRequirements({
                required: true,
                model,
                dir,
                version,
              });
              const results = await evaluateRequirements(requirements);
              const passed = results.every((r) => r.ok);

              if (runtime.json) {
                const errors = passed
                  ? []
                  : results
                      .filter((r) => !r.ok)
                      .map((r) => ({
                        code: 'DEPENDENCY_MISSING',
                        message: `${r.label} missing`,
                        context: {
                          id: r.id,
                          detail: r.detail,
                          fix: r.fix,
                        },
                      }));

                writeJsonEnvelope(
                  buildJsonEnvelope({
                    command: 'assets:whisper:status',
                    args: { model, dir, version },
                    outputs: { ok: passed, requirements: results },
                    errors,
                    timingsMs: Date.now() - runtime.startTime,
                  })
                );
                process.exit(passed ? 0 : 1);
              }

              writeStderrLine(passed ? 'Whisper: OK' : 'Whisper: MISSING');
              for (const result of results) {
                writeStderrLine(
                  `- ${result.ok ? 'OK ' : 'FAIL'} ${result.label}${result.detail ? ` - ${result.detail}` : ''}`
                );
              }
              if (!passed) {
                writeStderrLine(
                  `Fix: ${results.find((r) => !r.ok)?.fix ?? 'Run: cm setup whisper'}`
                );
              }
              process.exit(passed ? 0 : 1);
            } catch (error) {
              handleCommandError(error);
            }
          })
      )
      .addCommand(
        new Command('install')
          .description('Install whisper.cpp binaries and download a Whisper model')
          .option('--model <model>', 'Whisper model: tiny, base, small, medium, large', 'base')
          .option('--dir <path>', 'Whisper directory (defaults to resolved CM_WHISPER_DIR)')
          .option('--version <version>', 'whisper.cpp version', '1.5.5')
          .action(async (options) => {
            try {
              const runtime = getCliRuntime();
              if (runtime.offline || process.env.CM_OFFLINE === '1') {
                throw new CMError('OFFLINE', 'Offline mode enabled; cannot install Whisper', {
                  fix: 'Run without --offline to allow downloads',
                });
              }

              const model = parseWhisperModel(options.model);
              const dir = options.dir
                ? resolve(expandTilde(String(options.dir)))
                : resolveWhisperDir();
              const version = String(options.version);

              const whisper = await import('@remotion/install-whisper-cpp');

              if (!runtime.json) {
                writeStderrLine(`Downloading Whisper model: ${model}`);
              }
              await whisper.downloadWhisperModel({
                model: model === 'large' ? 'large-v3' : model,
                folder: dir,
              });

              if (!runtime.json) {
                writeStderrLine(`Installing whisper.cpp binaries (version: ${version})`);
              }
              await whisper.installWhisperCpp({ to: dir, version });

              if (runtime.json) {
                writeJsonEnvelope(
                  buildJsonEnvelope({
                    command: 'assets:whisper:install',
                    args: { model, dir, version },
                    outputs: { ok: true, dir, model, version },
                    timingsMs: Date.now() - runtime.startTime,
                  })
                );
                return;
              }

              writeStderrLine('Whisper install complete.');
              writeStdoutLine(dir);
            } catch (error) {
              handleCommandError(error);
            }
          })
      )
      .configureHelp({ sortSubcommands: true })
  )
  .configureHelp({
    sortSubcommands: true,
  })
  .showHelpAfterError();
