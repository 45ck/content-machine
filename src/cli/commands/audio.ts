/**
 * Audio command - Generate voiceover and timestamps
 *
 * Usage: cm audio --input script.json --output audio.wav
 */
import { Command } from 'commander';
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { logger } from '../../core/logger';
import { loadConfig } from '../../core/config';
import { handleCommandError, readInputFile } from '../utils';
import { ScriptOutputSchema } from '../../domain';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStdoutLine } from '../output';
import { CMError, SchemaError } from '../../core/errors';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { hasAudioMixSources, type AudioMixPlanOptions } from '../../audio/mix/planner';
import type { AudioOutput, ScriptOutput } from '../../domain';
import {
  DEFAULT_ARTIFACT_FILENAMES,
  DEFAULT_AUDIO_COMMAND_SYNC_STRATEGY,
} from '../../domain/repo-facts.generated';

interface AudioMixRequest {
  outputPath: string;
  options: AudioMixPlanOptions;
  emitEmpty?: boolean;
}

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

async function readScriptInput(path: string): Promise<ScriptOutput> {
  const rawScript = await readInputFile(path);
  const parsedScript = ScriptOutputSchema.safeParse(rawScript);
  if (!parsedScript.success) {
    throw new SchemaError('Invalid script file', {
      path,
      issues: parsedScript.error.issues,
      fix: 'Generate a script via `cm script --topic "<topic>" -o script.json` and pass --input script.json',
    });
  }
  return parsedScript.data;
}

function parseTtsSpeed(value: unknown): number {
  const parsed = Number.parseFloat(String(value));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --tts-speed value: ${value}`, {
      fix: 'Use a positive number, e.g. --tts-speed 1.1',
    });
  }
  return parsed;
}

function resolveSyncOptions(
  options: Record<string, unknown>,
  command: Command
): {
  requireWhisper: boolean;
  reconcile: boolean;
} {
  const syncStrategy =
    (options.syncStrategy as string | undefined) ?? DEFAULT_AUDIO_COMMAND_SYNC_STRATEGY;
  const requireWhisper = Boolean(options.requireWhisper) || syncStrategy === 'audio-first';
  const reconcileSource = command.getOptionValueSource('reconcile');
  const reconcile =
    reconcileSource === 'default' ? syncStrategy === 'audio-first' : Boolean(options.reconcile);
  return { requireWhisper, reconcile };
}

function resolveMusicOptions(
  options: Record<string, unknown>,
  config: ReturnType<typeof loadConfig>
) {
  const noMusic = options.music === false;
  return {
    noMusic,
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
  };
}

function resolveSfxOptions(
  options: Record<string, unknown>,
  config: ReturnType<typeof loadConfig>
) {
  const noSfx = options.sfx === false;
  const sfxInputs = Array.isArray(options.sfx) ? options.sfx : [];
  return {
    noSfx,
    sfx: noSfx ? [] : sfxInputs,
    sfxPack: noSfx ? null : ((options.sfxPack as string | undefined) ?? config.sfx.pack ?? null),
    sfxAt: parseSfxPlacement(options.sfxAt) ?? config.sfx.placement,
    sfxVolumeDb: parseOptionalNumber(options.sfxVolume, '--sfx-volume') ?? config.sfx.volumeDb,
    sfxMinGapMs: parseOptionalInt(options.sfxMinGap, '--sfx-min-gap') ?? config.sfx.minGapMs,
    sfxDurationSeconds:
      parseOptionalNumber(options.sfxDuration, '--sfx-duration') ?? config.sfx.durationSeconds,
  };
}

function resolveAmbienceOptions(
  options: Record<string, unknown>,
  config: ReturnType<typeof loadConfig>
) {
  const noAmbience = options.ambience === false;
  return {
    noAmbience,
    ambience: noAmbience
      ? null
      : typeof options.ambience === 'string'
        ? options.ambience
        : (config.ambience.default ?? null),
    ambienceVolumeDb:
      parseOptionalNumber(options.ambienceVolume, '--ambience-volume') ?? config.ambience.volumeDb,
    ambienceLoop:
      options.ambienceLoop !== undefined ? Boolean(options.ambienceLoop) : config.ambience.loop,
    ambienceFadeInMs:
      parseOptionalInt(options.ambienceFadeIn, '--ambience-fade-in') ?? config.ambience.fadeInMs,
    ambienceFadeOutMs:
      parseOptionalInt(options.ambienceFadeOut, '--ambience-fade-out') ?? config.ambience.fadeOutMs,
  };
}

function buildAudioMixRequest(params: {
  options: Record<string, unknown>;
  command: Command;
  config: ReturnType<typeof loadConfig>;
}): {
  mixOptions: AudioMixPlanOptions;
  audioMixPath: string;
  audioMixRequest: AudioMixRequest | undefined;
} {
  const { options, command, config } = params;
  const audioMixPath = options.audioMix
    ? String(options.audioMix)
    : DEFAULT_ARTIFACT_FILENAMES['audio-mix'];
  const audioMixExplicit = command.getOptionValueSource('audioMix') !== 'default';
  const musicOptions = resolveMusicOptions(options, config);
  const sfxOptions = resolveSfxOptions(options, config);
  const ambienceOptions = resolveAmbienceOptions(options, config);

  const mixOptions: AudioMixPlanOptions = {
    mixPreset: (options.mixPreset as string | undefined) ?? config.audioMix.preset,
    lufsTarget:
      parseOptionalNumber(options.lufsTarget, '--lufs-target') ?? config.audioMix.lufsTarget,
    ...musicOptions,
    ...sfxOptions,
    ...ambienceOptions,
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

  return { mixOptions, audioMixPath, audioMixRequest };
}

function buildAudioSummary(params: {
  result: AudioOutput;
  options: Record<string, unknown>;
  ttsSpeed: number;
}): { lines: string[]; footerLines: string[] } {
  const { result, options, ttsSpeed } = params;
  const summaryRows: Array<[string, string]> = [
    ['Duration', `${result.duration.toFixed(1)}s`],
    ['Words', String(result.wordCount)],
    ['Voice', String(options.voice)],
    ['Speed', String(ttsSpeed)],
    ['Audio', result.audioPath],
    ['Timestamps', result.timestampsPath],
  ];
  if (result.timestamps.analysis?.reconciled !== undefined) {
    summaryRows.push(['Reconciled', result.timestamps.analysis.reconciled ? 'yes' : 'no']);
  }
  if (result.timestamps.analysis?.scriptMatch) {
    summaryRows.push([
      'Script match',
      `${Math.round(result.timestamps.analysis.scriptMatch.lcsRatio * 100)}%`,
    ]);
  }
  if (result.audioMixPath) {
    summaryRows.push(['Audio mix', result.audioMixPath]);
  }
  const lines = formatKeyValueRows(summaryRows);
  const footerLines = [];
  if (options.mock) footerLines.push('Mock mode - audio/timestamps are placeholders');
  footerLines.push(
    `Next: cm visuals --input ${result.timestampsPath} --output ${DEFAULT_ARTIFACT_FILENAMES.visuals}${options.mock ? ' --mock' : ''}`
  );
  return { lines, footerLines };
}

function writeAudioJsonResult(params: {
  options: Record<string, unknown>;
  ttsSpeed: number;
  result: AudioOutput;
  mixOptions: AudioMixPlanOptions;
  audioMixPath: string;
  audioMixRequest: AudioMixRequest | undefined;
  runtime: ReturnType<typeof getCliRuntime>;
  reconcile: boolean;
  requireWhisper: boolean;
}): void {
  const { options, ttsSpeed, result, mixOptions, audioMixPath, audioMixRequest, runtime } = params;
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
        reconcile: params.reconcile,
        requireWhisper: params.requireWhisper,
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
}

async function handleAudioSuccess(params: {
  options: Record<string, unknown>;
  result: AudioOutput;
  ttsSpeed: number;
  mixOptions: AudioMixPlanOptions;
  audioMixPath: string;
  audioMixRequest: AudioMixRequest | undefined;
  runtime: ReturnType<typeof getCliRuntime>;
  reconcile: boolean;
  requireWhisper: boolean;
}): Promise<void> {
  const { options, result, ttsSpeed, mixOptions, audioMixPath, audioMixRequest, runtime } = params;
  if (runtime.json) {
    writeAudioJsonResult({
      options,
      ttsSpeed,
      result,
      mixOptions,
      audioMixPath,
      audioMixRequest,
      runtime,
      reconcile: params.reconcile,
      requireWhisper: params.requireWhisper,
    });
    process.exit(0);
  }

  const summary = buildAudioSummary({ result, options, ttsSpeed });
  await writeSummaryCard({
    title: 'Audio ready',
    lines: summary.lines,
    footerLines: summary.footerLines,
  });

  // Human-mode stdout should be reserved for the primary artifact path.
  writeStdoutLine(result.audioPath);
  process.exit(0);
}

export const audioCommand = new Command('audio')
  .description('Generate voiceover audio with word-level timestamps')
  .requiredOption('-i, --input <path>', 'Input script JSON file')
  .option('-o, --output <path>', 'Output audio file path', DEFAULT_ARTIFACT_FILENAMES.audio)
  .option(
    '--timestamps <path>',
    'Output timestamps file path',
    DEFAULT_ARTIFACT_FILENAMES.timestamps
  )
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--tts-speed <n>', 'TTS speaking speed (e.g., 1.0, 1.2)', '1')
  .option('--mock', 'Use mock TTS/ASR (for testing)', false)
  // Sync strategy options
  .option(
    '--sync-strategy <strategy>',
    'Sync strategy: audio-first (whisper required), standard (whisper optional)',
    DEFAULT_AUDIO_COMMAND_SYNC_STRATEGY
  )
  .option('--reconcile', 'Reconcile ASR output to match original script text', false)
  .option('--require-whisper', 'Require whisper ASR (fail if unavailable)', false)
  .option('--whisper-model <model>', 'Whisper model size: tiny, base, small, medium', 'base')
  .option(
    '--audio-mix <path>',
    'Output audio mix plan path',
    DEFAULT_ARTIFACT_FILENAMES['audio-mix']
  )
  .option('--music <pathOrPreset>', 'Background music track or preset')
  .option('--no-music', 'Disable background music')
  .option('--music-volume <db>', 'Music volume in dB')
  .option('--music-duck <db>', 'Music ducking in dB')
  .option('--music-loop', 'Loop music to match voice duration')
  .option('--no-music-loop', 'Disable music looping')
  .option('--music-fade-in <ms>', 'Music fade-in in ms')
  .option('--music-fade-out <ms>', 'Music fade-out in ms')
  .option('--sfx <path>', 'SFX file path (repeatable)', collectList, [])
  .option('--sfx-pack <id>', 'SFX pack id')
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
      const config = loadConfig();
      if (command.getOptionValueSource('voice') === 'default') {
        options.voice = config.defaults.voice;
      }

      const script = await readScriptInput(options.input);

      logger.info({ input: options.input, voice: options.voice }, 'Starting audio generation');

      const { generateAudio } = await import('../../audio/pipeline');

      const { requireWhisper, reconcile } = resolveSyncOptions(options, command);
      const ttsSpeed = parseTtsSpeed(options.ttsSpeed);

      const { mixOptions, audioMixPath, audioMixRequest } = buildAudioMixRequest({
        options,
        command,
        config,
      });

      // Ensure output directories exist (audio, timestamps, and optional audio mix).
      const outputPath = String(options.output);
      const timestampsPath = String(options.timestamps);
      await mkdir(dirname(outputPath), { recursive: true });
      await mkdir(dirname(timestampsPath), { recursive: true });
      if (audioMixRequest) {
        await mkdir(dirname(audioMixRequest.outputPath), { recursive: true });
      }

      const result = await generateAudio({
        script,
        voice: options.voice,
        speed: ttsSpeed,
        outputPath,
        timestampsPath,
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

      await handleAudioSuccess({
        options,
        result,
        ttsSpeed,
        mixOptions,
        audioMixPath,
        audioMixRequest,
        runtime,
        reconcile,
        requireWhisper,
      });
    } catch (error) {
      spinner.fail('Audio generation failed');
      handleCommandError(error);
    }
  });
