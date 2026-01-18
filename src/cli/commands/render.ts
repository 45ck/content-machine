/**
 * Render command - Render final video with Remotion
 *
 * Usage: cm render --input visuals.json --audio audio.wav --output video.mp4
 *
 * Caption Styling:
 *   --caption-preset <preset>  Use preset style (tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke)
 *   --caption-mode <mode>      Caption display mode (page, single, buildup, chunk)
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
import { existsSync } from 'fs';
import { dirname } from 'path';
import type { RenderProgressEvent } from '../../render/service';
import { logger } from '../../core/logger';
import { CMError, SchemaError } from '../../core/errors';
import { loadConfig, type CaptionFontConfig } from '../../core/config';
import { handleCommandError, readInputFile } from '../utils';
import { getCliErrorInfo } from '../format';
import type {
  VisualsOutput,
  VisualAsset,
  VisualAssetInput,
  VisualsOutputInput,
} from '../../domain';
import type { AudioMixOutput, TimestampsOutput } from '../../domain';
import { AudioMixOutputSchema, TimestampsOutputSchema, VisualsOutputSchema } from '../../domain';
import { createSpinner } from '../progress';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine, writeStdoutLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
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
import {
  resolveVideoTemplate,
  formatTemplateSource,
  getTemplateGameplaySlot,
  getTemplateParams,
} from '../../render/templates';
import { resolveHookFromCli } from '../hooks';

type ChromeMode = 'headless-shell' | 'chrome-for-testing';
type LayoutPosition = 'top' | 'bottom' | 'full';
type SplitLayoutPreset = 'gameplay-top' | 'gameplay-bottom';
type PreflightStatus = 'ok' | 'warn' | 'fail';

interface PreflightCheck {
  label: string;
  status: PreflightStatus;
  detail?: string;
  fix?: string;
  code?: string;
}

const PREFLIGHT_USAGE_CODES = new Set([
  'INVALID_ARGUMENT',
  'SCHEMA_ERROR',
  'FILE_NOT_FOUND',
  'INVALID_JSON',
]);

function addPreflightCheck(checks: PreflightCheck[], entry: PreflightCheck): void {
  checks.push(entry);
}

function formatPreflightLine(check: PreflightCheck): string {
  const detail = check.detail ? ` - ${check.detail}` : '';
  return `- ${check.status.toUpperCase()} ${check.label}${detail}`;
}

function parseChromeMode(value: unknown): ChromeMode | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'headless-shell' || raw === 'chrome-for-testing') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid --chrome-mode value: ${raw}`, {
    fix: 'Use one of: headless-shell, chrome-for-testing',
  });
}

function parseOptionalInt(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseFontWeight(value: unknown): number | 'normal' | 'bold' | 'black' {
  const raw = String(value).trim().toLowerCase();
  if (raw === 'normal' || raw === 'bold' || raw === 'black') {
    return raw as 'normal' | 'bold' | 'black';
  }
  const numeric = Number.parseInt(raw, 10);
  if (Number.isFinite(numeric)) return numeric;
  throw new CMError('INVALID_ARGUMENT', `Invalid --caption-font-weight value: ${raw}`, {
    fix: 'Use normal, bold, black, or a numeric weight (100-900)',
  });
}

function parseWordList(value: unknown): string[] | undefined {
  if (value == null) return undefined;
  const items = String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [];
}

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
      config.fontFamily = String(value);
    },
    (value) => {
      config.fontWeight = parseFontWeight(value);
    },
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
      config.highlightMode = mode as HighlightMode;
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
    (value) => {
      config.wordAnimation = String(value) as CaptionConfigInput['wordAnimation'];
    },
    (value) => {
      config.wordAnimationMs = Number.parseInt(String(value), 10);
    },
    (value) => {
      config.wordAnimationIntensity = Number(String(value));
    },
  ];

  const keys: Array<keyof typeof options> = [
    'captionFontFamily',
    'captionFontWeight',
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
    'captionWordAnimation',
    'captionWordAnimationMs',
    'captionWordAnimationIntensity',
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
    safeZone: { ...base.safeZone, ...overrides.safeZone },
    cleanup: { ...base.cleanup, ...overrides.cleanup },
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

function applyDefault(
  options: Record<string, unknown>,
  command: Command,
  optionName: string,
  value: unknown
): void {
  if (value === undefined) return;
  if (command.getOptionValueSource(optionName) !== 'default') return;
  options[optionName] = value;
}

function applyCaptionDefaultsFromConfig(
  options: Record<string, unknown>,
  command: Command
): { fonts: CaptionFontConfig[] } {
  const config = loadConfig();
  const captions = config.captions;
  const defaultFamily = captions.fonts.length > 0 ? captions.fonts[0].family : captions.fontFamily;
  applyDefault(options, command, 'captionFontFamily', defaultFamily);
  applyDefault(options, command, 'captionFontWeight', captions.fontWeight);
  applyDefault(options, command, 'captionFontFile', captions.fontFile);

  return { fonts: captions.fonts };
}

async function resolveTemplateAndApplyDefaults(
  options: Record<string, unknown>,
  command: Command
): Promise<{
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
}> {
  if (!options.template) {
    return {
      resolvedTemplate: undefined,
      templateDefaults: undefined,
      templateParams: {},
      templateGameplay: null,
    };
  }

  const resolvedTemplate = await resolveVideoTemplate(String(options.template));
  const templateDefaults = (resolvedTemplate.template.defaults ?? {}) as Record<string, unknown>;
  const templateParams = getTemplateParams(resolvedTemplate.template);
  const templateGameplay = getTemplateGameplaySlot(resolvedTemplate.template);

  applyDefault(options, command, 'orientation', templateDefaults.orientation as string | undefined);
  applyDefault(
    options,
    command,
    'fps',
    templateDefaults.fps !== undefined ? String(templateDefaults.fps) : undefined
  );
  applyDefault(
    options,
    command,
    'captionPreset',
    templateDefaults.captionPreset as string | undefined
  );

  return { resolvedTemplate, templateDefaults, templateParams, templateGameplay };
}

function parseLayoutPosition(value: unknown, optionName: string): LayoutPosition | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'top' || raw === 'bottom' || raw === 'full') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid ${optionName} value: ${raw}`, {
    fix: `Use one of: top, bottom, full for ${optionName}`,
  });
}

function parseSplitLayoutPreset(
  value: unknown
): { gameplayPosition: LayoutPosition; contentPosition: LayoutPosition } | undefined {
  if (value == null) return undefined;
  const raw = String(value) as SplitLayoutPreset;
  if (raw === 'gameplay-top') return { gameplayPosition: 'top', contentPosition: 'bottom' };
  if (raw === 'gameplay-bottom') return { gameplayPosition: 'bottom', contentPosition: 'top' };
  throw new CMError('INVALID_ARGUMENT', `Invalid --split-layout value: ${raw}`, {
    fix: 'Use one of: gameplay-top, gameplay-bottom',
  });
}

async function readRenderInputs(options: {
  input: string;
  timestamps: string;
  audioMix?: string;
}): Promise<{
  visuals: VisualsOutput;
  timestamps: TimestampsOutput;
  audioMix?: AudioMixOutput;
}> {
  const inputFiles = [readInputFile(options.input), readInputFile(options.timestamps)];
  if (options.audioMix) {
    inputFiles.push(readInputFile(options.audioMix));
  }

  const [rawVisuals, rawTimestamps, rawAudioMix] = await Promise.all(inputFiles);

  const parsedVisuals = VisualsOutputSchema.safeParse(rawVisuals);
  if (!parsedVisuals.success) {
    throw new SchemaError('Invalid visuals file', {
      path: options.input,
      issues: parsedVisuals.error.issues,
      fix: `Generate visuals via \`cm visuals --input timestamps.json --output ${options.input}\` (or pass the visuals.json produced by cm visuals).`,
    });
  }

  const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
  if (!parsedTimestamps.success) {
    throw new SchemaError('Invalid timestamps file', {
      path: options.timestamps,
      issues: parsedTimestamps.error.issues,
      fix: `Generate timestamps via \`cm audio --input script.json --timestamps ${options.timestamps}\` (or pass the timestamps.json produced by cm audio).`,
    });
  }

  let audioMix: AudioMixOutput | undefined;
  if (options.audioMix) {
    const parsedMix = AudioMixOutputSchema.safeParse(rawAudioMix);
    if (!parsedMix.success) {
      throw new SchemaError('Invalid audio mix file', {
        path: options.audioMix,
        issues: parsedMix.error.issues,
        fix: `Generate a mix plan via \`cm audio --input script.json --audio-mix ${options.audioMix}\` (or pass a valid audio.mix.json).`,
      });
    }
    audioMix = parsedMix.data;
  }

  return { visuals: parsedVisuals.data, timestamps: parsedTimestamps.data, audioMix };
}

async function runRenderPreflight(params: {
  options: Record<string, unknown>;
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
}): Promise<{ passed: boolean; checks: PreflightCheck[]; exitCode: number }> {
  const { options, resolvedTemplate } = params;
  const checks: PreflightCheck[] = [];

  const templateId = resolvedTemplate?.template.id;
  addPreflightCheck(checks, {
    label: 'Template',
    status: 'ok',
    detail: templateId ? `${templateId} (${formatTemplateSource(resolvedTemplate)})` : 'default',
  });

  if (!options.input) {
    addPreflightCheck(checks, {
      label: 'Visuals input',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'Missing --input visuals.json',
      fix: 'Provide --input <path> pointing to visuals.json',
    });
  } else {
    try {
      const rawVisuals = await readInputFile(String(options.input));
      const parsedVisuals = VisualsOutputSchema.safeParse(rawVisuals);
      if (!parsedVisuals.success) {
        addPreflightCheck(checks, {
          label: 'Visuals input',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid visuals JSON',
          fix: 'Generate visuals via `cm visuals --input timestamps.json`',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Visuals input',
          status: 'ok',
          detail: String(options.input),
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Visuals input',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (!options.timestamps) {
    addPreflightCheck(checks, {
      label: 'Timestamps input',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'Missing --timestamps timestamps.json',
      fix: 'Provide --timestamps <path> pointing to timestamps.json',
    });
  } else {
    try {
      const rawTimestamps = await readInputFile(String(options.timestamps));
      const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
      if (!parsedTimestamps.success) {
        addPreflightCheck(checks, {
          label: 'Timestamps input',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid timestamps JSON',
          fix: 'Generate timestamps via `cm audio --input script.json --timestamps timestamps.json`',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Timestamps input',
          status: 'ok',
          detail: String(options.timestamps),
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Timestamps input',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (!options.audio) {
    addPreflightCheck(checks, {
      label: 'Audio input',
      status: 'fail',
      code: 'INVALID_ARGUMENT',
      detail: 'Missing --audio audio.wav',
      fix: 'Provide --audio <path> pointing to audio.wav',
    });
  } else if (existsSync(String(options.audio))) {
    addPreflightCheck(checks, {
      label: 'Audio input',
      status: 'ok',
      detail: String(options.audio),
    });
  } else {
    addPreflightCheck(checks, {
      label: 'Audio input',
      status: 'fail',
      code: 'FILE_NOT_FOUND',
      detail: `Audio file not found: ${options.audio}`,
      fix: 'Provide a valid audio path',
    });
  }

  if (options.audioMix) {
    try {
      const rawMix = await readInputFile(String(options.audioMix));
      const parsedMix = AudioMixOutputSchema.safeParse(rawMix);
      if (!parsedMix.success) {
        addPreflightCheck(checks, {
          label: 'Audio mix input',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid audio mix JSON',
          fix: 'Generate an audio mix plan via `cm audio --audio-mix audio.mix.json`',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Audio mix input',
          status: 'ok',
          detail: String(options.audioMix),
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Audio mix input',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  if (options.hook !== undefined) {
    try {
      const hook = await resolveHookFromCli(options);
      addPreflightCheck(checks, {
        label: 'Hook clip',
        status: 'ok',
        detail: hook ? hook.path : 'disabled',
      });
    } catch (error) {
      const info = getCliErrorInfo(error);
      const code = info.code === 'NOT_FOUND' ? 'FILE_NOT_FOUND' : info.code;
      addPreflightCheck(checks, {
        label: 'Hook clip',
        status: 'fail',
        code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  const failures = checks.filter((check) => check.status === 'fail');
  const passed = failures.length === 0;
  const exitCode = passed
    ? 0
    : failures.some((failure) => failure.code && PREFLIGHT_USAGE_CODES.has(failure.code))
      ? 2
      : 1;

  return { passed, checks, exitCode };
}

function writeRenderPreflightOutput(params: {
  runtime: RenderRuntime;
  options: Record<string, unknown>;
  checks: PreflightCheck[];
  passed: boolean;
  exitCode: number;
}): void {
  const { runtime, options, checks, passed, exitCode } = params;

  if (runtime.json) {
    const errors = passed
      ? []
      : checks
          .filter((check) => check.status === 'fail')
          .map((check) => {
            const context: Record<string, unknown> = { label: check.label };
            if (check.detail) context.detail = check.detail;
            if (check.fix) context.fix = check.fix;
            return {
              code: check.code ?? 'PREFLIGHT_FAILED',
              message: check.detail ? `${check.label}: ${check.detail}` : `${check.label} failed`,
              context,
            };
          });
    writeJsonEnvelope(
      buildJsonEnvelope({
        command: 'render',
        args: {
          input: options.input ?? null,
          audio: options.audio ?? null,
          timestamps: options.timestamps ?? null,
          output: options.output ?? null,
          preflight: true,
        },
        outputs: {
          preflightPassed: passed,
          checks,
        },
        errors,
        timingsMs: Date.now() - runtime.startTime,
      })
    );
    process.exit(exitCode);
  }

  writeStderrLine(passed ? 'Preflight: OK' : 'Preflight: FAILED');
  for (const check of checks) {
    writeStderrLine(formatPreflightLine(check));
    if (check.status === 'fail' && check.fix) {
      writeStderrLine(`  Fix: ${check.fix}`);
    }
  }
  process.exit(exitCode);
}

function createOnProgress(runtime: RenderRuntime, spinner: RenderSpinner) {
  let lastBucket = -1;
  let lastPhase: string | undefined;

  return (event: RenderProgressEvent): void => {
    if (runtime.json) return;

    const phase = event.phase;
    const phaseProgress = Math.min(1, Math.max(0, event.progress ?? 0));
    const overall =
      phase === 'prepare-assets'
        ? phaseProgress * 0.1
        : phase === 'bundle'
          ? 0.1 + phaseProgress * 0.2
          : phase === 'select-composition'
            ? 0.3 + phaseProgress * 0.05
            : phase === 'render-media'
              ? 0.35 + phaseProgress * 0.65
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
        audioMix: params.options.audioMix ?? null,
        output: params.options.output,
        template: params.options.template ?? null,
        resolvedTemplateId: params.resolvedTemplateId,
        orientation: params.options.orientation,
        fps: params.options.fps,
        hook: params.options.hook ?? null,
        hookLibrary: params.options.hookLibrary ?? null,
        hooksDir: params.options.hooksDir ?? null,
        hookDuration: params.options.hookDuration ?? null,
        hookTrim: params.options.hookTrim ?? null,
        hookAudio: params.options.hookAudio ?? null,
        hookFit: params.options.hookFit ?? null,
        mock: Boolean(params.options.mock),
        browserExecutable: params.options.browserExecutable ?? null,
        chromeMode: params.options.chromeMode ?? null,
        captionPreset: params.options.captionPreset,
        captionMode: params.options.captionMode ?? null,
        captionMaxWords: params.options.captionMaxWords ?? null,
        captionMinWords: params.options.captionMinWords ?? null,
        captionTargetWords: params.options.captionTargetWords ?? null,
        captionMaxWpm: params.options.captionMaxWpm ?? null,
        captionMaxCps: params.options.captionMaxCps ?? null,
        captionMinOnScreenMs: params.options.captionMinOnScreenMs ?? null,
        captionMinOnScreenMsShort: params.options.captionMinOnScreenMsShort ?? null,
        captionDropFillers: params.options.captionDropFillers ?? null,
        captionFillerWords: params.options.captionFillerWords ?? null,
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

async function writeRenderHumanSummary(params: {
  result: Awaited<ReturnType<(typeof import('../../render/service'))['renderVideo']>>;
  mock: boolean;
  profile: 'portrait' | 'landscape';
  templateId?: string | null;
  audioMixPath?: string | null;
}): Promise<void> {
  const rows: Array<[string, string]> = [
    ['Duration', `${params.result.duration.toFixed(1)}s`],
    ['Resolution', `${params.result.width}x${params.result.height}`],
    ['Size', `${(params.result.fileSize / 1024 / 1024).toFixed(1)} MB`],
    ['Video', params.result.outputPath],
  ];
  if (params.templateId) {
    rows.push(['Template', params.templateId]);
  }
  if (params.audioMixPath) {
    rows.push(['Audio mix', params.audioMixPath]);
  }
  const lines = formatKeyValueRows(rows);
  const footerLines = [];
  if (params.mock) footerLines.push('Mock mode - video is a placeholder file');
  footerLines.push(`Next: cm validate ${params.result.outputPath} --profile ${params.profile}`);
  await writeSummaryCard({ title: 'Render complete', lines, footerLines });

  // Human-mode stdout should be reserved for the primary artifact path.
  writeStdoutLine(params.result.outputPath);
}

function logRenderStart(
  options: Record<string, unknown>,
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined
): void {
  logger.info(
    {
      input: options.input,
      audio: options.audio,
      audioMix: options.audioMix ?? null,
      output: options.output,
      captionPreset: options.captionPreset,
      captionMode: options.captionMode,
      hook: options.hook ?? null,
      template: resolvedTemplate?.template.id,
      templateSource: resolvedTemplate ? formatTemplateSource(resolvedTemplate) : undefined,
      validateTimestamps: options.validateTimestamps,
      extendVisuals: options.extendVisuals,
    },
    'Starting video render'
  );
}

async function runRenderCommand(
  options: Record<string, unknown>,
  command: Command,
  runtime: RenderRuntime,
  spinner: RenderSpinner
) {
  const configDefaults = applyCaptionDefaultsFromConfig(options, command);
  const { resolvedTemplate, templateDefaults, templateParams, templateGameplay } =
    await resolveTemplateAndApplyDefaults(options, command);

  if (options.preflight) {
    spinner.stop();
    const preflight = await runRenderPreflight({ options, resolvedTemplate });
    writeRenderPreflightOutput({
      runtime,
      options,
      checks: preflight.checks,
      passed: preflight.passed,
      exitCode: preflight.exitCode,
    });
    return;
  }

  const audioMixPath = options.audioMix ? String(options.audioMix) : undefined;
  const {
    visuals: loadedVisuals,
    timestamps: loadedTimestamps,
    audioMix,
  } = await readRenderInputs({
    input: String(options.input),
    timestamps: String(options.timestamps),
    audioMix: audioMixPath,
  });
  const audioMixBaseDir = audioMixPath ? dirname(audioMixPath) : undefined;

  logRenderStart(options, resolvedTemplate);

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
  const captionMaxWords = parseOptionalInt(options.captionMaxWords);
  const captionMinWords = parseOptionalInt(options.captionMinWords);
  const captionTargetWords = parseOptionalInt(options.captionTargetWords);
  const captionMaxWpm = parseOptionalNumber(options.captionMaxWpm);
  const captionMaxCps = parseOptionalNumber(options.captionMaxCps);
  const captionMinOnScreenMs = parseOptionalInt(options.captionMinOnScreenMs);
  const captionMinOnScreenMsShort = parseOptionalInt(options.captionMinOnScreenMsShort);
  const captionFontFamily = options.captionFontFamily
    ? String(options.captionFontFamily)
    : undefined;
  const captionFontWeight =
    options.captionFontWeight !== undefined
      ? parseFontWeight(options.captionFontWeight)
      : undefined;
  const captionFontFile = options.captionFontFile ? String(options.captionFontFile) : undefined;
  const captionFillerWords = parseWordList(options.captionFillerWords);
  const captionDropFillersSource = command.getOptionValueSource('captionDropFillers');
  const captionDropFillers =
    captionDropFillersSource === 'default' ? undefined : Boolean(options.captionDropFillers);
  const hook = await resolveHookFromCli(options);
  if (!options.hook && hook) {
    options.hook = hook.id ?? hook.path;
  }

  const archetype = templateDefaults?.archetype as string | undefined;
  const compositionId = resolvedTemplate?.template.compositionId;
  const gameplayRequired =
    templateGameplay?.required ?? Boolean(templateGameplay?.library || templateGameplay?.clip);
  const splitLayoutPreset = parseSplitLayoutPreset(options.splitLayout);
  if (splitLayoutPreset) {
    if (options.gameplayPosition == null)
      options.gameplayPosition = splitLayoutPreset.gameplayPosition;
    if (options.contentPosition == null)
      options.contentPosition = splitLayoutPreset.contentPosition;
  }
  const gameplayPosition = parseLayoutPosition(options.gameplayPosition, '--gameplay-position');
  const contentPosition = parseLayoutPosition(options.contentPosition, '--content-position');
  const layout = {
    gameplayPosition: gameplayPosition ?? templateParams.gameplayPosition,
    contentPosition: contentPosition ?? templateParams.contentPosition,
  };

  if (
    compositionId === 'SplitScreenGameplay' &&
    gameplayRequired &&
    !visuals.gameplayClip &&
    !options.mock
  ) {
    throw new CMError('MISSING_GAMEPLAY', 'Split-screen templates require gameplay footage', {
      fix: 'Run `cm visuals --gameplay <path>` to populate gameplayClip in visuals.json',
    });
  }
  const onProgress = createOnProgress(runtime, spinner);

  const { renderVideo } = await import('../../render/service');
  const result = await renderVideo({
    visuals,
    timestamps,
    audioPath: String(options.audio),
    audioMix,
    audioMixBaseDir,
    outputPath: String(options.output),
    orientation: String(options.orientation) as 'portrait' | 'landscape' | 'square',
    fps: Number.parseInt(String(options.fps), 10),
    mock: Boolean(options.mock),
    browserExecutable: options.browserExecutable ? String(options.browserExecutable) : null,
    chromeMode: parseChromeMode(options.chromeMode),
    captionPreset: options.captionPreset as CaptionPresetName,
    captionMode: options.captionMode as 'page' | 'single' | 'buildup' | 'chunk' | undefined,
    captionConfig,
    wordsPerPage: captionMaxWords ?? undefined,
    captionMinWords: captionMinWords ?? undefined,
    captionTargetWords: captionTargetWords ?? undefined,
    captionMaxWpm: captionMaxWpm ?? undefined,
    captionMaxCps: captionMaxCps ?? undefined,
    captionMinOnScreenMs: captionMinOnScreenMs ?? undefined,
    captionMinOnScreenMsShort: captionMinOnScreenMsShort ?? undefined,
    captionFontFamily,
    captionFontWeight,
    captionFontFile,
    fonts: configDefaults.fonts.length > 0 ? configDefaults.fonts : undefined,
    captionDropFillers,
    captionFillerWords,
    onProgress,
    archetype,
    compositionId,
    splitScreenRatio: templateParams.splitScreenRatio,
    gameplayPosition: layout.gameplayPosition,
    contentPosition: layout.contentPosition,
    downloadAssets: options.downloadAssets !== false,
    hook: hook ?? undefined,
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

  const profile = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  await writeRenderHumanSummary({
    result,
    mock: Boolean(options.mock),
    profile,
    templateId: resolvedTemplate?.template.id ?? null,
    audioMixPath: options.audioMix ? String(options.audioMix) : null,
  });
}

export const renderCommand = new Command('render')
  .description('Render final video with Remotion')
  .requiredOption('-i, --input <path>', 'Input visuals JSON file')
  .requiredOption('--audio <path>', 'Audio file path')
  .option('--audio-mix <path>', 'Audio mix plan JSON file')
  .option('--timestamps <path>', 'Timestamps JSON file', 'timestamps.json')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--template <idOrPath>', 'Video template id or path to template.json')
  .option('--orientation <type>', 'Video orientation (portrait, landscape, square)', 'portrait')
  .option('--fps <fps>', 'Frames per second', '30')
  .option('--mock', 'Use mock renderer (for testing)', false)
  .option('--preflight', 'Validate dependencies and exit without execution')
  // Caption preset
  .option(
    '--caption-preset <preset>',
    'Caption style preset (tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke)',
    'capcut'
  )
  .option('--caption-mode <mode>', 'Caption display mode (page, single, buildup, chunk)')
  // Caption typography
  .option('--caption-font-family <name>', 'Caption font family (e.g., Inter)')
  .option('--caption-font-weight <weight>', 'Caption font weight (normal, bold, black, 100-900)')
  .option('--caption-font-file <path>', 'Caption font file to bundle (ttf/otf/woff/woff2)')
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
  .option('--caption-max-words <count>', 'Max words per chunk/page')
  .option('--caption-min-words <count>', 'Min words per chunk/page')
  .option('--caption-target-words <count>', 'Target words per chunk (chunk mode)')
  .option('--caption-max-wpm <value>', 'Max words per minute for caption pacing')
  .option('--caption-max-cps <value>', 'Max characters per second for caption pacing')
  .option('--caption-min-on-screen-ms <ms>', 'Minimum on-screen time for captions (ms)')
  .option('--caption-min-on-screen-short-ms <ms>', 'Minimum on-screen time for short captions (ms)')
  .option('--caption-drop-fillers', 'Drop filler words from captions')
  .option('--caption-filler-words <list>', 'Comma-separated filler words/phrases to drop')
  // Caption animation
  .option(
    '--caption-animation <anim>',
    'Page animation (pop, fade, slideUp, slideDown, bounce, none)'
  )
  .option(
    '--caption-word-animation <anim>',
    'Active word animation (none, pop, bounce, rise, shake)'
  )
  .option('--caption-word-animation-ms <ms>', 'Active word animation duration in ms')
  .option('--caption-word-animation-intensity <value>', 'Active word animation intensity (0..1)')
  // Sync validation settings
  .option('--validate-timestamps', 'Validate word timestamps before rendering', true)
  .option('--no-validate-timestamps', 'Skip timestamp validation')
  .option('--repair-timestamps', 'Auto-repair invalid timestamps', true)
  .option('--no-repair-timestamps', 'Fail on invalid timestamps instead of repairing')
  // Visual coverage settings
  .option('--extend-visuals', 'Auto-extend visuals to match audio duration', true)
  .option('--no-extend-visuals', 'Keep visuals as-is (may cause black frames)')
  .option('--fallback-color <hex>', 'Background color for extended scenes', '#1a1a1a')
  .option('--split-layout <layout>', 'Split-screen layout preset (gameplay-top, gameplay-bottom)')
  .option('--gameplay-position <pos>', 'Gameplay position (top, bottom, full)')
  .option('--content-position <pos>', 'Content position (top, bottom, full)')
  .option('--hook <idOrPath>', 'Hook intro clip id, path, or URL')
  .option('--hook-library <name>', 'Hook library id (defaults to config)')
  .option('--hooks-dir <path>', 'Root directory for hook libraries')
  .option('--hook-duration <seconds>', 'Hook duration when ffprobe is unavailable')
  .option('--hook-trim <seconds>', 'Trim hook to N seconds (optional)')
  .option('--hook-audio <mode>', 'Hook audio mode (mute, keep)')
  .option('--hook-fit <mode>', 'Hook fit mode (cover, contain)')
  .option('--download-assets', 'Download remote visual assets into the render bundle', true)
  .option('--no-download-assets', 'Do not download remote assets (stream URLs directly)')
  .option('--browser-executable <path>', 'Chromium/Chrome executable path for rendering')
  .option(
    '--chrome-mode <mode>',
    'Chrome mode (headless-shell, chrome-for-testing)',
    'chrome-for-testing'
  )
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
