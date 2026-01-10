/**
 * Audio command - Generate voiceover and timestamps
 *
 * Usage: cm audio --input script.json --output audio.wav
 */
import { Command } from 'commander';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile } from '../utils';
import type { ScriptOutput } from '../../script/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';

export const audioCommand = new Command('audio')
  .description('Generate voiceover audio with word-level timestamps')
  .requiredOption('-i, --input <path>', 'Input script JSON file')
  .option('-o, --output <path>', 'Output audio file path', 'audio.wav')
  .option('--timestamps <path>', 'Output timestamps file path', 'timestamps.json')
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
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
      // Read input script
      const script = await readInputFile<ScriptOutput>(options.input);

      logger.info({ input: options.input, voice: options.voice }, 'Starting audio generation');

      const { generateAudio } = await import('../../audio/pipeline');

      // Determine require-whisper from strategy or explicit flag
      const syncStrategy = options.syncStrategy ?? 'standard';
      const requireWhisper = options.requireWhisper || syncStrategy === 'audio-first';
      const reconcileSource = command.getOptionValueSource('reconcile');
      const reconcile =
        reconcileSource === 'default' ? syncStrategy === 'audio-first' : Boolean(options.reconcile);

      const result = await generateAudio({
        script,
        voice: options.voice,
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

      writeStderrLine(`Audio: ${result.duration.toFixed(1)}s, ${result.wordCount} words`);
      writeStderrLine(`   Audio: ${result.audioPath}`);
      writeStderrLine(`   Timestamps: ${result.timestampsPath}`);
      if (options.mock) writeStderrLine('   Mock mode - audio/timestamps are placeholders');

      // Human-mode stdout should be reserved for the primary artifact path.
      process.stdout.write(`${result.audioPath}\n`);
      process.exit(0);
    } catch (error) {
      spinner.fail('Audio generation failed');
      handleCommandError(error);
    }
  });
