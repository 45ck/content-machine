/**
 * Setup command - download optional runtime dependencies
 */
import { Command } from 'commander';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { getCliRuntime } from '../runtime';
import { handleCommandError } from '../utils';
import { CMError } from '../../core/errors';

type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

function parseWhisperModel(value: unknown): WhisperModel {
  const model = String(value ?? 'base').toLowerCase();
  if (
    model === 'tiny' ||
    model === 'base' ||
    model === 'small' ||
    model === 'medium' ||
    model === 'large'
  ) {
    return model;
  }
  throw new CMError('INVALID_ARGUMENT', `Invalid Whisper model: ${value}`, {
    fix: 'Use one of: tiny, base, small, medium, large',
  });
}

export const setupCommand = new Command('setup')
  .description('Download optional runtime dependencies')
  .addCommand(
    new Command('whisper')
      .description('Install whisper.cpp and download a Whisper model')
      .option('--model <model>', 'Whisper model: tiny, base, small, medium, large', 'base')
      .option('--dir <path>', 'Install directory for whisper assets', './.cache/whisper')
      .option('--version <version>', 'whisper.cpp version to install', '1.5.5')
      .action(async (options) => {
        try {
          const runtime = getCliRuntime();
          const model = parseWhisperModel(options.model);
          const folder = String(options.dir);
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
