/**
 * Audio command - Generate voiceover and timestamps
 *
 * Usage: cm audio --input script.json --output audio.wav
 */
import { Command } from 'commander';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile } from '../utils';
import { ScriptOutputSchema } from '../../script/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope } from '../output';
import { CMError, SchemaError } from '../../core/errors';
import { formatKeyValueRows, writeSummaryCard } from '../ui';

export const audioCommand = new Command('audio')
  .description('Generate voiceover audio with word-level timestamps')
  .requiredOption('-i, --input <path>', 'Input script JSON file')
  .option('-o, --output <path>', 'Output audio file path', 'audio.wav')
  .option('--timestamps <path>', 'Output timestamps file path', 'timestamps.json')
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--tts-speed <n>', 'TTS speaking speed (e.g., 1.0, 1.2)', '1')
  .option('--mock', 'Use mock TTS/ASR (for testing)', false)
  // Sync strategy options
  .option(
    '--sync-strategy <strategy>',
    'Sync strategy: audio-first (whisper required), standard (whisper optional)',
    'audio-first'
  )
  .option('--reconcile', 'Reconcile ASR output to match original script text', false)
  .option('--require-whisper', 'Require whisper ASR (fail if unavailable)', false)
  .option('--whisper-model <model>', 'Whisper model size: tiny, base, small, medium', 'base')
  .action(async (options, command: Command) => {
    const spinner = createSpinner('Generating audio...').start();
    const runtime = getCliRuntime();

    try {
      // Read + validate input script
      const rawScript = await readInputFile(options.input);
      const parsedScript = ScriptOutputSchema.safeParse(rawScript);
      if (!parsedScript.success) {
        throw new SchemaError('Invalid script file', {
          path: options.input,
          issues: parsedScript.error.issues,
          fix: 'Generate a script via `cm script --topic "<topic>" -o script.json` and pass --input script.json',
        });
      }
      const script = parsedScript.data;

      logger.info({ input: options.input, voice: options.voice }, 'Starting audio generation');

      const { generateAudio } = await import('../../audio/pipeline');

      // Determine require-whisper from strategy or explicit flag
      const syncStrategy = options.syncStrategy ?? 'standard';
      const requireWhisper = options.requireWhisper || syncStrategy === 'audio-first';
      const ttsSpeed = Number.parseFloat(String(options.ttsSpeed));
      if (!Number.isFinite(ttsSpeed) || ttsSpeed <= 0) {
        throw new CMError('INVALID_ARGUMENT', `Invalid --tts-speed value: ${options.ttsSpeed}`, {
          fix: 'Use a positive number, e.g. --tts-speed 1.1',
        });
      }
      const reconcileSource = command.getOptionValueSource('reconcile');
      const reconcile =
        reconcileSource === 'default' ? syncStrategy === 'audio-first' : Boolean(options.reconcile);

      const result = await generateAudio({
        script,
        voice: options.voice,
        speed: ttsSpeed,
        outputPath: options.output,
        timestampsPath: options.timestamps,
        mock: Boolean(options.mock),
        requireWhisper,
        whisperModel: options.whisperModel as 'tiny' | 'base' | 'small' | 'medium',
        reconcile,
      });

      spinner.succeed('Audio generated successfully');

      logger.info(
        {
          audioPath: result.audioPath,
          timestampsPath: result.timestampsPath,
          duration: result.duration,
        },
        'Audio saved'
      );

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'audio',
            args: {
              input: options.input,
              output: options.output,
              timestamps: options.timestamps,
              voice: options.voice,
              ttsSpeed,
              mock: Boolean(options.mock),
              syncStrategy: options.syncStrategy,
              reconcile,
              requireWhisper,
              whisperModel: options.whisperModel,
            },
            outputs: {
              audioPath: result.audioPath,
              timestampsPath: result.timestampsPath,
              durationSeconds: result.duration,
              wordCount: result.wordCount,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(0);
      }

      const lines = formatKeyValueRows([
        ['Duration', `${result.duration.toFixed(1)}s`],
        ['Words', String(result.wordCount)],
        ['Voice', options.voice],
        ['Speed', String(ttsSpeed)],
        ['Audio', result.audioPath],
        ['Timestamps', result.timestampsPath],
      ]);
      const footerLines = [];
      if (options.mock) footerLines.push('Mock mode - audio/timestamps are placeholders');
      footerLines.push(
        `Next: cm visuals --input ${result.timestampsPath} --output visuals.json${options.mock ? ' --mock' : ''}`
      );
      await writeSummaryCard({ title: 'Audio ready', lines, footerLines });

      // Human-mode stdout should be reserved for the primary artifact path.
      process.stdout.write(`${result.audioPath}\n`);
      process.exit(0);
    } catch (error) {
      spinner.fail('Audio generation failed');
      handleCommandError(error);
    }
  });
