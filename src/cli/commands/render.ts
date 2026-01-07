/**
 * Render command - Render final video with Remotion
 *
 * Usage: cm render --input visuals.json --audio audio.wav --output video.mp4
 *
 * Caption Styling:
 *   --caption-preset <preset>  Use preset style (tiktok, youtube, reels, bold, minimal, neon)
 *   --caption-font-size <px>   Override font size
 *   --caption-position <pos>   Caption position (top, center, bottom)
 *   --caption-highlight <mode> Highlight mode (background, color, glow, underline, scale)
 *   --caption-animation <anim> Page animation (pop, fade, slideUp, slideDown, bounce, none)
 *
 * Sync Settings:
 *   --validate-timestamps      Validate word timestamps before rendering
 *   --extend-visuals           Auto-extend visuals to match audio duration
 *   --fallback-color <hex>     Background color for extended scenes
 */
import { Command } from 'commander';
import type { RenderProgressEvent } from '../../render/service';
import { logger } from '../../core/logger';
import { handleCommandError, readInputFile } from '../utils';
import type { VisualsOutput, VisualAsset } from '../../visuals/schema';
import type { TimestampsOutput } from '../../audio/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import type { CaptionPresetName } from '../../render/captions/presets';
import type {
  CaptionConfig,
  HighlightMode,
  CaptionPosition,
  PageAnimation,
} from '../../render/captions/config';
import {
  validateWordTimings,
  repairWordTimings,
  TimestampValidationError,
  type WordTiming,
} from '../../audio/asr/validator';
import { ensureVisualCoverage, type VisualScene } from '../../visuals/duration';

/**
 * Parse caption CLI options into CaptionConfig partial
 *
 * Note: We only set top-level primitive fields here.
 * Nested objects (pillStyle, stroke, layout) are handled as shallow overrides
 * and will be merged with defaults by the preset system.
 */
function parseCaptionOptions(options: Record<string, unknown>): Partial<CaptionConfig> {
  const config: Partial<CaptionConfig> = {};

  if (options.captionFontSize) {
    config.fontSize = parseInt(options.captionFontSize as string, 10);
  }
  if (options.captionPosition) {
    config.position = options.captionPosition as CaptionPosition;
  }
  if (options.captionHighlight) {
    config.highlightMode = options.captionHighlight as HighlightMode;
  }
  if (options.captionAnimation) {
    config.pageAnimation = options.captionAnimation as PageAnimation;
  }
  if (options.captionColor) {
    config.textColor = options.captionColor as string;
  }
  if (options.captionHighlightColor) {
    config.highlightColor = options.captionHighlightColor as string;
  }
  if (options.captionTransform) {
    config.textTransform = options.captionTransform as
      | 'none'
      | 'uppercase'
      | 'lowercase'
      | 'capitalize';
  }

  // For nested objects, we store raw values and let the service merge them
  // These are passed as separate options to renderVideo which can handle merging
  return config;
}

/**
 * Validate and optionally repair timestamps
 */
function processTimestamps(
  timestamps: TimestampsOutput,
  options: { validate: boolean; repair: boolean },
  commandName: string
): TimestampsOutput {
  const log = logger.child({ command: commandName });

  if (!options.validate) {
    return timestamps;
  }

  // Convert WordTimestamp[] to WordTiming[] (same shape, explicit cast)
  const words: WordTiming[] = timestamps.allWords.map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
  }));

  try {
    validateWordTimings(words, timestamps.totalDuration, {
      minCoverageRatio: 0.85,
      maxGapSeconds: 0.5,
    });
    log.debug('Timestamp validation passed');
    return timestamps;
  } catch (error) {
    if (error instanceof TimestampValidationError) {
      log.warn(
        { wordIndex: error.wordIndex, word: error.word, issue: error.issue },
        'Timestamp validation failed'
      );

      if (options.repair) {
        log.info('Attempting timestamp repair');
        const repairedWords = repairWordTimings(words, timestamps.totalDuration);
        return {
          ...timestamps,
          allWords: repairedWords.map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            ...(w.confidence !== undefined && { confidence: w.confidence }),
          })),
        };
      }
    }
    throw error;
  }
}

/**
 * Convert VisualAsset[] to VisualScene[] format for duration processing.
 * VisualAsset uses duration-based format; VisualScene uses startMs/endMs.
 */
function convertToVisualScenes(scenes: VisualAsset[]): VisualScene[] {
  let currentMs = 0;
  return scenes.map((scene) => {
    const durationMs = scene.duration * 1000; // duration is in seconds
    const startMs = currentMs;
    const endMs = currentMs + durationMs;
    currentMs = endMs;

    return {
      startMs,
      endMs,
      url: scene.assetPath,
      durationMs,
      ...(scene.source === 'fallback-color' && { backgroundColor: '#1a1a1a' }),
    };
  });
}

/**
 * Convert VisualScene[] back to VisualAsset[] format after processing.
 */
function convertToVisualAssets(
  scenes: VisualScene[],
  originalScenes: VisualAsset[]
): VisualAsset[] {
  return scenes.map((scene, index) => {
    const original = originalScenes[Math.min(index, originalScenes.length - 1)];
    const durationSeconds = (scene.endMs - scene.startMs) / 1000;

    // Determine if this is an extended/fallback scene
    const isExtended = index >= originalScenes.length;
    const isFallback = scene.backgroundColor !== undefined || scene.url === null;

    return {
      sceneId: isExtended ? `extended-${index}` : original.sceneId,
      source: isFallback ? 'fallback-color' : original.source,
      assetPath: scene.url ?? '',
      duration: durationSeconds,
      ...(original.embeddingSimilarity !== undefined && {
        embeddingSimilarity: original.embeddingSimilarity,
      }),
      ...(original.llmConfidence !== undefined && { llmConfidence: original.llmConfidence }),
      ...(original.visualCue && { visualCue: original.visualCue }),
    };
  });
}

/**
 * Process visuals to ensure full audio coverage.
 * Converts between VisualsOutput (duration-based) and VisualScene (ms-based) formats.
 */
function processVisuals(
  visuals: VisualsOutput,
  audioDuration: number,
  options: { extend: boolean; fallbackColor: string },
  commandName: string
): VisualsOutput {
  const log = logger.child({ command: commandName });

  if (!options.extend) {
    return visuals;
  }

  // Convert to VisualScene format for processing
  const scenes = convertToVisualScenes(visuals.scenes);
  const audioDurationMs = audioDuration * 1000;

  // Ensure coverage
  const extendedScenes = ensureVisualCoverage(scenes, audioDurationMs, {
    fallbackColor: options.fallbackColor,
  });

  // Check if we actually extended
  if (extendedScenes.length !== scenes.length) {
    log.info(
      { originalScenes: scenes.length, extendedScenes: extendedScenes.length },
      'Extended visuals to match audio duration'
    );
  }

  // Convert back to VisualAsset format
  const extendedAssets = convertToVisualAssets(extendedScenes, visuals.scenes);

  return {
    ...visuals,
    scenes: extendedAssets,
    totalAssets: extendedAssets.length,
    fallbacks: extendedAssets.filter((s) => s.source === 'fallback-color').length,
  };
}

export const renderCommand = new Command('render')
  .description('Render final video with Remotion')
  .requiredOption('-i, --input <path>', 'Input visuals JSON file')
  .requiredOption('--audio <path>', 'Audio file path')
  .option('--timestamps <path>', 'Timestamps JSON file', 'timestamps.json')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--orientation <type>', 'Video orientation (portrait, landscape, square)', 'portrait')
  .option('--fps <fps>', 'Frames per second', '30')
  .option('--mock', 'Use mock renderer (for testing)', false)
  // Caption preset
  .option(
    '--caption-preset <preset>',
    'Caption style preset (tiktok, youtube, reels, bold, minimal, neon)',
    'tiktok'
  )
  // Caption typography
  .option('--caption-font-size <px>', 'Font size in pixels')
  .option('--caption-color <hex>', 'Text color (hex)')
  .option('--caption-transform <mode>', 'Text transform (none, uppercase, lowercase, capitalize)')
  .option('--caption-stroke-width <px>', 'Text stroke width in pixels')
  // Caption highlighting
  .option(
    '--caption-highlight <mode>',
    'Highlight mode (background, color, glow, underline, scale, none)'
  )
  .option('--caption-highlight-color <hex>', 'Active word color (hex)')
  .option('--caption-pill-color <hex>', 'Background pill color (for background mode)')
  // Caption position & layout
  .option('--caption-position <pos>', 'Vertical position (top, center, bottom)')
  .option('--caption-max-chars <n>', 'Max characters per line')
  .option('--caption-max-lines <n>', 'Max lines per page (1-3)')
  // Caption animation
  .option(
    '--caption-animation <anim>',
    'Page animation (pop, fade, slideUp, slideDown, bounce, none)'
  )
  // Sync validation settings
  .option('--validate-timestamps', 'Validate word timestamps before rendering', true)
  .option('--no-validate-timestamps', 'Skip timestamp validation')
  .option('--repair-timestamps', 'Auto-repair invalid timestamps', true)
  .option('--no-repair-timestamps', 'Fail on invalid timestamps instead of repairing')
  // Visual coverage settings
  .option('--extend-visuals', 'Auto-extend visuals to match audio duration', true)
  .option('--no-extend-visuals', 'Keep visuals as-is (may cause black frames)')
  .option('--fallback-color <hex>', 'Background color for extended scenes', '#1a1a1a')
  // eslint-disable-next-line max-lines-per-function -- render logic is cohesive, refactor pending
  .action(async (options) => {
    const spinner = createSpinner('Rendering video...').start();
    const runtime = getCliRuntime();

    try {
      // Read input files
      let visuals = await readInputFile<VisualsOutput>(options.input);
      let timestamps = await readInputFile<TimestampsOutput>(options.timestamps);

      logger.info(
        {
          input: options.input,
          audio: options.audio,
          output: options.output,
          captionPreset: options.captionPreset,
          validateTimestamps: options.validateTimestamps,
          extendVisuals: options.extendVisuals,
        },
        'Starting video render'
      );

      // Process timestamps (validate & repair)
      timestamps = processTimestamps(
        timestamps,
        {
          validate: options.validateTimestamps !== false,
          repair: options.repairTimestamps !== false,
        },
        'render'
      );

      // Process visuals (extend to match audio)
      visuals = processVisuals(
        visuals,
        timestamps.totalDuration,
        {
          extend: options.extendVisuals !== false,
          fallbackColor: options.fallbackColor,
        },
        'render'
      );

      let lastBucket = -1;
      let lastPhase: string | undefined;
      const onProgress = (event: RenderProgressEvent): void => {
        if (runtime.json) return;

        const phase = event.phase;
        const phaseProgress = Math.min(1, Math.max(0, event.progress ?? 0));
        const overall =
          phase === 'bundle'
            ? phaseProgress * 0.2
            : phase === 'select-composition'
              ? 0.2 + phaseProgress * 0.05
              : phase === 'render-media'
                ? 0.25 + phaseProgress * 0.75
                : phaseProgress;
        const percent = Math.round(overall * 100);

        if (runtime.isTty) {
          const parts = ['Rendering video...', `${percent}%`, phase];
          if (event.message) parts.push(event.message);
          spinner.text = parts.filter(Boolean).join(' - ');
          return;
        }

        const bucket = Math.floor(percent / 10) * 10;
        if (bucket === lastBucket && phase === lastPhase) return;
        lastBucket = bucket;
        lastPhase = phase;

        const parts = [`Render progress: ${percent}%`, phase];
        if (event.message) parts.push(event.message);
        writeStderrLine(parts.filter(Boolean).join(' - '));
      };

      // Build caption config from CLI options
      const captionConfig = parseCaptionOptions(options);

      const { renderVideo } = await import('../../render/service');
      const result = await renderVideo({
        visuals,
        timestamps,
        audioPath: options.audio,
        outputPath: options.output,
        orientation: options.orientation,
        fps: parseInt(options.fps, 10),
        mock: Boolean(options.mock),
        captionPreset: options.captionPreset as CaptionPresetName,
        captionConfig,
        onProgress,
      });

      spinner.succeed('Video rendered successfully');

      logger.info(
        {
          output: result.outputPath,
          duration: result.duration,
          size: result.fileSize,
        },
        'Video saved'
      );

      if (runtime.json) {
        writeJsonEnvelope(
          buildJsonEnvelope({
            command: 'render',
            args: {
              input: options.input,
              audio: options.audio,
              timestamps: options.timestamps,
              output: options.output,
              orientation: options.orientation,
              fps: options.fps,
              mock: Boolean(options.mock),
              captionPreset: options.captionPreset,
              validateTimestamps: options.validateTimestamps,
              extendVisuals: options.extendVisuals,
            },
            outputs: {
              videoPath: result.outputPath,
              durationSeconds: result.duration,
              width: result.width,
              height: result.height,
              fps: result.fps,
              fileSizeBytes: result.fileSize,
            },
            timingsMs: Date.now() - runtime.startTime,
          })
        );
        return;
      }

      writeStderrLine(
        `Video: ${result.duration.toFixed(1)}s, ${result.width}x${result.height}, ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`
      );
      if (options.mock) writeStderrLine('   Mock mode - video is a placeholder file');

      // Human-mode stdout should be reserved for the primary artifact path.
      process.stdout.write(`${result.outputPath}\n`);
    } catch (error) {
      spinner.fail('Video render failed');
      handleCommandError(error);
    }
  });
