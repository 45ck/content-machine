/**
 * Audio command - Generate voiceover and timestamps
 *
 * Usage: cm audio --input script.json --output audio.wav
 */
import { Command } from 'commander';
import { logger } from '../../core/logger';
import { loadConfig } from '../../core/config';
import { handleCommandError, readInputFile } from '../utils';
import { ScriptOutputSchema } from '../../script/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStdoutLine } from '../output';
import { CMError, SchemaError } from '../../core/errors';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { hasAudioMixSources, type AudioMixPlanOptions } from '../../audio/mix/planner';

function collectList(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

function parseOptionalNumber(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed)) {
    throw new CMError('INVALID_ARGUMENT', `Invalid ${label} value: ${value}`, {
      fix: `Provide a numeric value for ${label}`,
    });
  }
  return parsed;
}

function parseOptionalInt(value: unknown, label: string): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) {
    throw new CMError('INVALID_ARGUMENT', `Invalid ${label} value: ${value}`, {
      fix: `Provide an integer value for ${label}`,
    });
  }
  return parsed;
}

function parseSfxPlacement(value: unknown): 'hook' | 'scene' | 'list-item' | 'cta' | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = String(value);
  if (raw === 'hook' || raw === 'scene' || raw === 'list-item' || raw === 'cta') {
    return raw;
  }
  throw new CMError('INVALID_ARGUMENT', `Invalid --sfx-at value: ${raw}`, {
    fix: 'Use one of: hook, scene, list-item, cta',
  });
}

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
  .option('--audio-mix <path>', 'Output audio mix plan path', 'audio.mix.json')
  .option('--music <pathOrPreset>', 'Background music track or preset')
  .option('--no-music', 'Disable background music')
  .option('--music-volume <db>', 'Music volume in dB')
  .option('--music-duck <db>', 'Music ducking in dB')
  .option('--music-loop', 'Loop music to match voice duration')
  .option('--no-music-loop', 'Disable music looping')
  .option('--music-fade-in <ms>', 'Music fade-in in ms')
  .option('--music-fade-out <ms>', 'Music fade-out in ms')
  .option('--sfx <path>', 'SFX file path (repeatable)', collectList, [])
  .option('--sfx-pack <name>', 'SFX pack name')
  .option('--sfx-at <placement>', 'Auto placement for SFX (hook, scene, list-item, cta)')
  .option('--sfx-volume <db>', 'SFX volume in dB')
  .option('--sfx-min-gap <ms>', 'Minimum gap between SFX in ms')
  .option('--sfx-duration <seconds>', 'Default SFX duration in seconds')
  .option('--no-sfx', 'Disable SFX')
  .option('--ambience <pathOrPreset>', 'Ambience bed track or preset')
  .option('--ambience-volume <db>', 'Ambience volume in dB')
  .option('--ambience-loop', 'Loop ambience to match voice duration')
  .option('--no-ambience-loop', 'Disable ambience looping')
  .option('--ambience-fade-in <ms>', 'Ambience fade-in in ms')
  .option('--ambience-fade-out <ms>', 'Ambience fade-out in ms')
  .option('--no-ambience', 'Disable ambience')
  .option('--mix-preset <preset>', 'Mix preset (clean, punchy, cinematic, viral)')
  .option('--lufs-target <db>', 'Target loudness for final mix (LUFS)')
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

      const config = loadConfig();
      const audioMixPath = options.audioMix ? String(options.audioMix) : 'audio.mix.json';
      const audioMixExplicit = command.getOptionValueSource('audioMix') !== 'default';
      const noMusic = options.music === false;
      const noSfx = options.sfx === false;
      const noAmbience = options.ambience === false;
      const sfxInputs = Array.isArray(options.sfx) ? options.sfx : [];
      const mixOptions: AudioMixPlanOptions = {
        mixPreset: options.mixPreset ?? config.audioMix.preset,
        lufsTarget:
          parseOptionalNumber(options.lufsTarget, '--lufs-target') ?? config.audioMix.lufsTarget,
        music: noMusic
          ? null
          : typeof options.music === 'string'
            ? options.music
            : (config.music.default ?? null),
        musicVolumeDb:
          parseOptionalNumber(options.musicVolume, '--music-volume') ?? config.music.volumeDb,
        musicDuckDb: parseOptionalNumber(options.musicDuck, '--music-duck') ?? config.music.duckDb,
        musicLoop: options.musicLoop !== undefined ? Boolean(options.musicLoop) : config.music.loop,
        musicFadeInMs:
          parseOptionalInt(options.musicFadeIn, '--music-fade-in') ?? config.music.fadeInMs,
        musicFadeOutMs:
          parseOptionalInt(options.musicFadeOut, '--music-fade-out') ?? config.music.fadeOutMs,
        sfx: noSfx ? [] : sfxInputs,
        sfxPack: noSfx ? null : (options.sfxPack ?? config.sfx.pack ?? null),
        sfxAt: parseSfxPlacement(options.sfxAt) ?? config.sfx.placement,
        sfxVolumeDb: parseOptionalNumber(options.sfxVolume, '--sfx-volume') ?? config.sfx.volumeDb,
        sfxMinGapMs: parseOptionalInt(options.sfxMinGap, '--sfx-min-gap') ?? config.sfx.minGapMs,
        sfxDurationSeconds:
          parseOptionalNumber(options.sfxDuration, '--sfx-duration') ?? config.sfx.durationSeconds,
        ambience: noAmbience
          ? null
          : typeof options.ambience === 'string'
            ? options.ambience
            : (config.ambience.default ?? null),
        ambienceVolumeDb:
          parseOptionalNumber(options.ambienceVolume, '--ambience-volume') ??
          config.ambience.volumeDb,
        ambienceLoop:
          options.ambienceLoop !== undefined ? Boolean(options.ambienceLoop) : config.ambience.loop,
        ambienceFadeInMs:
          parseOptionalInt(options.ambienceFadeIn, '--ambience-fade-in') ??
          config.ambience.fadeInMs,
        ambienceFadeOutMs:
          parseOptionalInt(options.ambienceFadeOut, '--ambience-fade-out') ??
          config.ambience.fadeOutMs,
        noMusic,
        noSfx,
        noAmbience,
      };
      const hasMixSources = hasAudioMixSources(mixOptions);
      const audioMixRequest =
        hasMixSources || audioMixExplicit
          ? {
              outputPath: audioMixPath,
              options: mixOptions,
              emitEmpty: audioMixExplicit && !hasMixSources,
            }
          : undefined;

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
        audioMix: audioMixRequest,
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
              audioMix: audioMixRequest ? audioMixPath : null,
              mixPreset: mixOptions.mixPreset ?? null,
              music: typeof options.music === 'string' ? options.music : null,
              sfxPack: options.sfxPack ?? null,
              ambience: typeof options.ambience === 'string' ? options.ambience : null,
            },
            outputs: {
              audioPath: result.audioPath,
              timestampsPath: result.timestampsPath,
              durationSeconds: result.duration,
              wordCount: result.wordCount,
              audioMixPath: result.audioMixPath ?? null,
              audioMixLayers: result.audioMix?.layers.length ?? 0,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        process.exit(0);
      }

      const rows: Array<[string, string]> = [
        ['Duration', `${result.duration.toFixed(1)}s`],
        ['Words', String(result.wordCount)],
        ['Voice', String(options.voice)],
        ['Speed', String(ttsSpeed)],
        ['Audio', result.audioPath],
        ['Timestamps', result.timestampsPath],
      ];
      if (result.audioMixPath) {
        rows.push(['Audio mix', result.audioMixPath]);
      }
      const lines = formatKeyValueRows(rows);
      const footerLines = [];
      if (options.mock) footerLines.push('Mock mode - audio/timestamps are placeholders');
      footerLines.push(
        `Next: cm visuals --input ${result.timestampsPath} --output visuals.json${options.mock ? ' --mock' : ''}`
      );
      await writeSummaryCard({ title: 'Audio ready', lines, footerLines });

      // Human-mode stdout should be reserved for the primary artifact path.
      writeStdoutLine(result.audioPath);
      process.exit(0);
    } catch (error) {
      spinner.fail('Audio generation failed');
      handleCommandError(error);
    }
  });
