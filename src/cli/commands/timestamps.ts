/**
 * Timestamps command - Generate timestamps from existing audio
 *
 * Usage: cm timestamps --audio audio.wav --output timestamps.json
 */
import { Command } from 'commander';
import { existsSync } from 'fs';
import { logger } from '../../core/logger';
import { CMError, SchemaError } from '../../core/errors';
import { ScriptOutputSchema } from '../../script/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope } from '../output';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { formatKeyValueRows, writeSummaryCard } from '../ui';

export const timestampsCommand = new Command('timestamps')
  .description('Generate word-level timestamps from an audio file')
  .requiredOption('--audio <path>', 'Input audio file')
  .option('--script <path>', 'Optional script.json for reconciliation')
  .option('-o, --output <path>', 'Output timestamps file path', 'timestamps.json')
  .option('--reconcile', 'Reconcile ASR output to match script text', false)
  .option('--require-whisper', 'Require whisper ASR (fail if unavailable)', false)
  .option(
    '--whisper-model <model>',
    'Whisper model size: tiny, base, small, medium, large',
    'base'
  )
  .action(async (options) => {
    const spinner = createSpinner('Generating timestamps...').start();
    const runtime = getCliRuntime();

    try {
      if (!existsSync(options.audio)) {
        throw new CMError('FILE_NOT_FOUND', `Audio file not found: ${options.audio}`, {
          path: options.audio,
          fix: 'Provide a valid path to an existing audio file',
        });
      }

      let script;
      if (options.script) {
        const rawScript = await readInputFile(options.script);
        const parsedScript = ScriptOutputSchema.safeParse(rawScript);
        if (!parsedScript.success) {
          throw new SchemaError('Invalid script file', {
            path: options.script,
            issues: parsedScript.error.issues,
            fix: 'Provide a valid script.json or omit --script',
          });
        }
        script = parsedScript.data;
      }

      logger.info(
        { audio: options.audio, script: options.script ?? null },
        'Starting timestamp generation'
      );

      const { generateTimestamps } = await import('../../importers/timestamps');
      const result = await generateTimestamps({
        audioPath: options.audio,
        script,
        whisperModel: options.whisperModel,
        reconcile: Boolean(options.reconcile),
        requireWhisper: Boolean(options.requireWhisper),
      });

      await writeOutputFile(options.output, result);

      spinner.succeed('Timestamps generated successfully');

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'timestamps',
            args: {
              audio: options.audio,
              script: options.script ?? null,
              output: options.output,
              whisperModel: options.whisperModel,
              reconcile: Boolean(options.reconcile),
              requireWhisper: Boolean(options.requireWhisper),
            },
            outputs: {
              timestampsPath: options.output,
              durationSeconds: result.totalDuration,
              wordCount: result.allWords.length,
              sceneCount: result.scenes?.length ?? 0,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(0);
      }

      const lines = formatKeyValueRows([
        ['Duration', `${result.totalDuration.toFixed(1)}s`],
        ['Words', String(result.allWords.length)],
        ['Scenes', String(result.scenes?.length ?? 0)],
        ['Timestamps', options.output],
      ]);
      await writeSummaryCard({
        title: 'Timestamps ready',
        lines,
        footerLines: [
          `Next: cm import visuals --timestamps ${options.output} --clips <dir>`,
        ],
      });

      process.stdout.write(`${options.output}\n`);
      process.exit(0);
    } catch (error) {
      spinner.fail('Timestamp generation failed');
      handleCommandError(error);
    }
  });
