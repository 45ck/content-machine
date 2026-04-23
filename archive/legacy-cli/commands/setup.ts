/**
 * Setup command - download optional runtime dependencies
 */
import { Command } from 'commander';
import { resolve } from 'node:path';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError, parseWhisperModel } from '../utils';
import { CMError } from '../../core/errors';
import { resolveWhisperDir } from '../../core/assets/whisper';
import { expandTilde } from '../paths';

export const setupCommand = new Command('setup')
  .description('Download optional runtime dependencies')
  .addCommand(
    new Command('whisper')
      .description('Install whisper.cpp and download a Whisper model')
      .option('--model <model>', 'Whisper model: tiny, base, small, medium, large', 'base')
      .option('--dir <path>', 'Install directory for whisper assets', resolveWhisperDir())
      .option('--version <version>', 'whisper.cpp version to install', '1.5.5')
      .action(async (options) => {
        try {
          const runtime = getCliRuntime();
          if (runtime.offline || process.env.CM_OFFLINE === '1') {
            throw new CMError('OFFLINE', 'Offline mode enabled; cannot download Whisper', {
              fix: 'Run without --offline to allow downloads',
            });
          }
          const model = parseWhisperModel(options.model);
          const folder = resolve(expandTilde(String(options.dir)));
          const version = String(options.version);

          const whisper = await import('@remotion/install-whisper-cpp');

          if (!runtime.json) {
            writeStderrLine(`Downloading Whisper model: ${model}`);
          }
          await whisper.downloadWhisperModel({
            model: model === 'large' ? 'large-v3' : model,
            folder,
          });

          if (!runtime.json) {
            writeStderrLine(`Installing whisper.cpp binaries (version: ${version})`);
          }
          await whisper.installWhisperCpp({ to: folder, version });

          if (runtime.json) {
            writeJsonEnvelope(
              buildJsonEnvelope({
                command: 'setup:whisper',
                args: { model, dir: folder, version },
                outputs: { ok: true, dir: folder, model, version },
                timingsMs: Date.now() - runtime.startTime,
              })
            );
            return;
          }

          writeStderrLine('Whisper setup complete.');
          writeStdoutLine(folder);
        } catch (error) {
          handleCommandError(error);
        }
      })
  )
  .configureHelp({
    sortSubcommands: true,
  })
  .showHelpAfterError();
