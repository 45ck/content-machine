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
import type {
  VisualsOutput,
  VisualAsset,
  VisualAssetInput,
  VisualsOutputInput,
} from '../../visuals/schema';
import type { TimestampsOutput } from '../../audio/schema';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import type { CaptionPresetName } from '../../render/captions/presets';
import type {
  CaptionConfig,
  CaptionConfigInput,
  HighlightMode,
  CaptionPosition,
  PageAnimation,
  StrokeStyleInput,
  PillStyleInput,
  CaptionLayoutInput,
} from '../../render/captions/config';
import {
  validateWordTimings,
  repairWordTimings,
  TimestampValidationError,
  type WordTiming,
} from '../../audio/asr/validator';
import { ensureVisualCoverage, type VisualScene } from '../../visuals/duration';
import { resolveVideoTemplate, formatTemplateSource } from '../../render/templates';

/**
 * Parse caption CLI options into CaptionConfig partial
 *
 * Note: We only set top-level primitive fields here.
 * Nested objects (pillStyle, stroke, layout) are handled as shallow overrides
 * and will be merged with defaults by the preset system.
 */
function parseCaptionOptions(options: Record<string, unknown>): CaptionConfigInput {
  const config: CaptionConfigInput = {};
  let stroke: StrokeStyleInput = {};
  let pillStyle: PillStyleInput = {};
  let layout: CaptionLayoutInput = {};

  const parsers: Array<(value: unknown) => void> = [
    (value) => {
      config.fontSize = Number.parseInt(String(value), 10);
    },
    (value) => {
      stroke = { ...stroke, width: Number.parseInt(String(value), 10) };
    },
    (value) => {
      config.position = String(value) as CaptionPosition;
    },
    (value) => {
      const mode = String(value);
      if (mode !== 'none') config.highlightMode = mode as HighlightMode;
    },
    (value) => {
      config.pageAnimation = String(value) as PageAnimation;
    },
    (value) => {
      config.textColor = String(value);
    },
    (value) => {
      config.highlightColor = String(value);
    },
    (value) => {
      pillStyle = { ...pillStyle, color: String(value) };
    },
    (value) => {
      config.textTransform = String(value) as 'none' | 'uppercase' | 'lowercase' | 'capitalize';
    },
    (value) => {
      layout = { ...layout, maxCharsPerLine: Number.parseInt(String(value), 10) };
    },
    (value) => {
      layout = { ...layout, maxLinesPerPage: Number.parseInt(String(value), 10) };
    },
  ];

  const keys: Array<keyof typeof options> = [
    'captionFontSize',
    'captionStrokeWidth',
    'captionPosition',
    'captionHighlight',
    'captionAnimation',
    'captionColor',
    'captionHighlightColor',
    'captionPillColor',
    'captionTransform',
    'captionMaxChars',
    'captionMaxLines',
  ];

  for (let i = 0; i < keys.length; i++) {
    const value = options[keys[i]];
    if (value === undefined) continue;
    parsers[i](value);
  }

  // Assign nested objects only if they have properties
  if (Object.keys(stroke).length > 0) config.stroke = stroke;
  if (Object.keys(pillStyle).length > 0) config.pillStyle = pillStyle;
  if (Object.keys(layout).length > 0) config.layout = layout;

  // For nested objects, we store raw values and let the service merge them
  // These are passed as separate options to renderVideo which can handle merging
  return config;
}

function mergeCaptionConfigPartials(
  base: CaptionConfigInput | undefined,
  overrides: CaptionConfigInput
): CaptionConfigInput {
  if (!base) return overrides;

  return {
    ...base,
    ...overrides,
    pillStyle: { ...base.pillStyle, ...overrides.pillStyle },
    stroke: { ...base.stroke, ...overrides.stroke },
    shadow: { ...base.shadow, ...overrides.shadow },
    layout: { ...base.layout, ...overrides.layout },
    positionOffset: { ...base.positionOffset, ...overrides.positionOffset },
  };
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
 * Convert VisualScene[] back to VisualAssetInput[] format after processing.
 * Uses VisualAssetInput since these objects will be parsed by Zod (which adds defaults).
 */
function convertToVisualAssets(
  scenes: VisualScene[],
  originalScenes: VisualAsset[]
): VisualAssetInput[] {
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
 * Returns VisualsOutputInput since we're building the object (defaults will be applied during parsing).
 */
function processVisuals(
  visuals: VisualsOutput,
  audioDuration: number,
  options: { extend: boolean; fallbackColor: string },
  commandName: string
): VisualsOutputInput {
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

type RenderRuntime = ReturnType<typeof getCliRuntime>;
type RenderSpinner = ReturnType<typeof createSpinner>;

function applyTemplateDefault(
  options: Record<string, unknown>,
  command: Command,
  optionName: string,
  value: string | undefined
): void {
  if (value === undefined) return;
  if (command.getOptionValueSource(optionName) !== 'default') return;
  options[optionName] = value;
}

async function resolveTemplateAndApplyDefaults(
  options: Record<string, unknown>,
  command: Command
): Promise<{
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
  templateDefaults: Record<string, unknown> | undefined;
}> {
  if (!options.template) {
    return { resolvedTemplate: undefined, templateDefaults: undefined };
  }

  const resolvedTemplate = await resolveVideoTemplate(String(options.template));
  const templateDefaults = (resolvedTemplate.template.defaults ?? {}) as Record<string, unknown>;

  applyTemplateDefault(
    options,
    command,
    'orientation',
    templateDefaults.orientation as string | undefined
  );
  applyTemplateDefault(
    options,
    command,
    'fps',
    templateDefaults.fps !== undefined ? String(templateDefaults.fps) : undefined
  );
  applyTemplateDefault(
    options,
    command,
    'captionPreset',
    templateDefaults.captionPreset as string | undefined
  );

  return { resolvedTemplate, templateDefaults };
}

async function readRenderInputs(options: { input: string; timestamps: string }): Promise<{
  visuals: VisualsOutput;
  timestamps: TimestampsOutput;
}> {
  const [visuals, timestamps] = await Promise.all([
    readInputFile<VisualsOutput>(options.input),
    readInputFile<TimestampsOutput>(options.timestamps),
  ]);
  return { visuals, timestamps };
}

function createOnProgress(runtime: RenderRuntime, spinner: RenderSpinner) {
  let lastBucket = -1;
  let lastPhase: string | undefined;

  return (event: RenderProgressEvent): void => {
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
}

function writeRenderJsonEnvelope(params: {
  options: Record<string, unknown>;
  resolvedTemplateId: string | null;
  result: Awaited<ReturnType<(typeof import('../../render/service'))['renderVideo']>>;
  runtime: RenderRuntime;
}): void {
  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'render',
      args: {
        input: params.options.input,
        audio: params.options.audio,
        timestamps: params.options.timestamps,
        output: params.options.output,
        template: params.options.template ?? null,
        resolvedTemplateId: params.resolvedTemplateId,
        orientation: params.options.orientation,
        fps: params.options.fps,
        mock: Boolean(params.options.mock),
        captionPreset: params.options.captionPreset,
        validateTimestamps: params.options.validateTimestamps,
        extendVisuals: params.options.extendVisuals,
      },
      outputs: {
        videoPath: params.result.outputPath,
        durationSeconds: params.result.duration,
        width: params.result.width,
        height: params.result.height,
        fps: params.result.fps,
        fileSizeBytes: params.result.fileSize,
      },
      timingsMs: Date.now() - params.runtime.startTime,
    })
  );
}

function writeRenderHumanSummary(params: {
  result: Awaited<ReturnType<(typeof import('../../render/service'))['renderVideo']>>;
  mock: boolean;
}): void {
  writeStderrLine(
    `Video: ${params.result.duration.toFixed(1)}s, ${params.result.width}x${params.result.height}, ${(params.result.fileSize / 1024 / 1024).toFixed(1)} MB`
  );
  if (params.mock) writeStderrLine('   Mock mode - video is a placeholder file');

  // Human-mode stdout should be reserved for the primary artifact path.
  process.stdout.write(`${params.result.outputPath}\n`);
}

async function runRenderCommand(
  options: Record<string, unknown>,
  command: Command,
  runtime: RenderRuntime,
  spinner: RenderSpinner
) {
  const { resolvedTemplate, templateDefaults } = await resolveTemplateAndApplyDefaults(
    options,
    command
  );

  const { visuals: loadedVisuals, timestamps: loadedTimestamps } = await readRenderInputs({
    input: String(options.input),
    timestamps: String(options.timestamps),
  });

  logger.info(
    {
      input: options.input,
      audio: options.audio,
      output: options.output,
      captionPreset: options.captionPreset,
      template: resolvedTemplate?.template.id,
      templateSource: resolvedTemplate ? formatTemplateSource(resolvedTemplate) : undefined,
      validateTimestamps: options.validateTimestamps,
      extendVisuals: options.extendVisuals,
    },
    'Starting video render'
  );

  const timestamps = processTimestamps(
    loadedTimestamps,
    {
      validate: options.validateTimestamps !== false,
      repair: options.repairTimestamps !== false,
    },
    'render'
  );

  const visuals = processVisuals(
    loadedVisuals,
    timestamps.totalDuration,
    {
      extend: options.extendVisuals !== false,
      fallbackColor: String(options.fallbackColor),
    },
    'render'
  );

  const captionConfig = mergeCaptionConfigPartials(
    (templateDefaults?.captionConfig as Partial<CaptionConfig> | undefined) ?? undefined,
    parseCaptionOptions(options)
  );

  const archetype = templateDefaults?.archetype as string | undefined;
  const compositionId = resolvedTemplate?.template.compositionId;
  const onProgress = createOnProgress(runtime, spinner);

  const { renderVideo } = await import('../../render/service');
  const result = await renderVideo({
    visuals,
    timestamps,
    audioPath: String(options.audio),
    outputPath: String(options.output),
    orientation: String(options.orientation) as 'portrait' | 'landscape' | 'square',
    fps: Number.parseInt(String(options.fps), 10),
    mock: Boolean(options.mock),
    captionPreset: options.captionPreset as CaptionPresetName,
    captionConfig,
    onProgress,
    archetype,
    compositionId,
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
    writeRenderJsonEnvelope({
      options,
      resolvedTemplateId: resolvedTemplate?.template.id ?? null,
      result,
      runtime,
    });
    return;
  }

  writeRenderHumanSummary({ result, mock: Boolean(options.mock) });
}

export const renderCommand = new Command('render')
  .description('Render final video with Remotion')
  .requiredOption('-i, --input <path>', 'Input visuals JSON file')
  .requiredOption('--audio <path>', 'Audio file path')
  .option('--timestamps <path>', 'Timestamps JSON file', 'timestamps.json')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--template <idOrPath>', 'Video template id or path to template.json')
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
  .action(async (options, command: Command) => {
    const spinner = createSpinner('Rendering video...').start();
    const runtime = getCliRuntime();

    try {
      await runRenderCommand(options as Record<string, unknown>, command, runtime, spinner);
    } catch (error) {
      spinner.fail('Video render failed');
      handleCommandError(error);
    }
  });
