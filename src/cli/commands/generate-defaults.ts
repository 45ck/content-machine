/**
 * Generate command - option resolution, defaults, and parsing helpers.
 *
 * Extracted from generate.ts as part of ARCH-D4 decomposition.
 */
import type { Command } from 'commander';
import { join, resolve } from 'path';
import { loadConfig } from '../../core/config';
import { CMError, SchemaError } from '../../core/errors';
import {
  DEFAULT_ARTIFACT_FILENAMES,
  DEFAULT_SYNC_PRESET_ID,
  PREFERRED_QUALITY_SYNC_PRESET_ID,
  SUPPORTED_VISUALS_PROVIDER_IDS,
  SYNC_PRESET_CONFIGS,
  type SyncPresetId,
} from '../../domain/repo-facts.generated';
import type { AssetProviderName } from '../../visuals/providers';
import { isProviderRoutingPolicy, type ProviderRoutingPolicy } from '../../visuals/provider-router';
import {
  resolveRenderTemplate,
  getTemplateFontSources,
  getTemplateGameplaySlot,
  getTemplateOverlays,
  getTemplateParams,
  mergeFontSources,
} from '../../render/templates';
import {
  OverlayAsset,
  safeParseGenerationPolicy,
  type FontSource,
  type GenerationPolicy,
  type WorkflowDefinition,
  type WorkflowStageMode,
} from '../../domain';
import { resolveWorkflowStageMode } from '../../workflows/runner';
import { readInputFile } from '../utils';
import type { CaptionConfigInput } from '../../render/captions/config';
import type { AudioMixPlanOptions } from '../../audio/mix/planner';

/* ------------------------------------------------------------------ */
/*  Shared types & constants                                          */
/* ------------------------------------------------------------------ */

/**
 * Sync quality presets for different quality/speed tradeoffs
 *
 * @cmTerm sync-preset
 */
export interface SyncPresetConfig {
  pipeline: 'standard' | 'audio-first';
  reconcile: boolean;
  syncQualityCheck: boolean;
  minSyncRating: number;
  autoRetrySync: boolean;
}

export const SYNC_PRESETS = SYNC_PRESET_CONFIGS as Record<SyncPresetId, SyncPresetConfig>;

export interface GenerateOptions {
  archetype: string;
  output: string;
  orientation: string;
  template?: string;
  policy?: string;
  workflow?: string;
  workflowAllowExec?: boolean;
  script?: string;
  audio?: string;
  audioMix?: string;
  timestamps?: string;
  visuals?: string;
  visualsProvider?: string;
  visualsFallbackProviders?: string;
  visualsRoutingPolicy?: string;
  visualsMaxGenerationCostUsd?: string;
  visualsGateEnforce?: boolean;
  visualsGateMaxFallbackRate?: string;
  visualsGateMinProviderSuccessRate?: string;
  visualsRoutingAdaptiveWindow?: string;
  visualsRoutingAdaptiveMinRecords?: string;
  media?: boolean;
  mediaKeyframes?: boolean;
  mediaSynthesizeMotion?: boolean;
  mediaDir?: string;
  mediaFfmpeg?: string;
  mediaDepthflowAdapter?: string;
  mediaVeoAdapter?: string;
  fps?: string;
  captionPreset?: string;
  voice: string;
  duration: string;
  keepArtifacts: boolean;
  mock: boolean;
  dryRun: boolean;
  research?: string | boolean;
  pipeline?: 'standard' | 'audio-first';
  /** Split-screen layout preset (gameplay-top, gameplay-bottom) */
  splitLayout?: string;
  /** Whisper model size: tiny, base, small, medium, large */
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  /** Caption grouping window in milliseconds */
  captionGroupMs?: string;
  /** Reconcile ASR output to original script text */
  reconcile?: boolean;
  /** Sync quality preset: fast, standard, quality, maximum */
  syncPreset?: string;
  /** Enable sync quality check after render */
  syncQualityCheck?: boolean;
  /** Minimum acceptable sync rating (0-100) */
  minSyncRating?: string;
  /** Auto-retry with better sync strategy if rating fails */
  autoRetrySync?: boolean;
  /** Enable burned-in caption quality check (OCR-only) after render */
  captionQualityCheck?: boolean;
  /** Enable higher-quality defaults (slower) */
  quality?: boolean;
  /** Minimum acceptable caption overall score (0..1, or 0..100) */
  minCaptionOverall?: string;
  /** Auto-retry with caption tuning if caption quality fails */
  autoRetryCaptions?: boolean;
  /** Maximum number of caption tuning retries after the initial attempt */
  maxCaptionRetries?: string;
  /** Force a "perfect captions" optimization loop (enables caption quality gate + retries) */
  captionPerfect?: boolean;
  /** Use mock caption quality scoring (no OCR) */
  captionQualityMock?: boolean;
  /** Caption display mode: page (default), single (one word at a time), buildup (accumulate per sentence) */
  captionMode?: 'page' | 'single' | 'buildup' | 'chunk';
  /** Caption notation rendering mode */
  captionNotation?: 'none' | 'unicode';
  /** Words per caption page/group (default: 8) */
  wordsPerPage?: string;
  /** Max words per caption page/group (alias of wordsPerPage) */
  captionMaxWords?: string;
  /** Minimum words per caption page/group */
  captionMinWords?: string;
  /** Target words per chunk (chunk mode) */
  captionTargetWords?: string;
  /** Max words per minute for caption pacing */
  captionMaxWpm?: string;
  /** Max characters per second for caption pacing */
  captionMaxCps?: string;
  /** Minimum on-screen time for captions (ms) */
  captionMinOnScreenMs?: string;
  /** Minimum on-screen time for short captions (ms) */
  captionMinOnScreenMsShort?: string;
  /** Drop filler words from captions */
  captionDropFillers?: boolean;
  /** Drop list markers like "1:" from captions */
  captionDropListMarkers?: boolean;
  /** Comma-separated filler words/phrases to drop */
  captionFillerWords?: string;
  /** Maximum lines per caption page (default: 2) */
  maxLines?: string;
  /** Maximum characters per line (default: 25) */
  charsPerLine?: string;
  /** Caption animation: none (default), fade, slideUp, slideDown, pop, bounce */
  captionAnimation?: 'none' | 'fade' | 'slideUp' | 'slideDown' | 'pop' | 'bounce';
  /** Active word animation: none (default), pop, bounce, rise, shake */
  captionWordAnimation?: 'none' | 'pop' | 'bounce' | 'rise' | 'shake';
  /** Active word animation duration in ms */
  captionWordAnimationMs?: string;
  /** Active word animation intensity (0..1) */
  captionWordAnimationIntensity?: string;
  /** Global caption timing offset in ms (negative = earlier captions) */
  captionOffsetMs?: string;
  /** Caption font family override */
  captionFontFamily?: string;
  /** Caption font weight override */
  captionFontWeight?: string;
  /** Caption font file path to bundle */
  captionFontFile?: string;
  /** Caption font sources (from config) */
  captionFonts?: FontSource[];
  /** Gameplay library directory or clip file path */
  gameplay?: string;
  /** Gameplay subfolder name */
  gameplayStyle?: string;
  /** Fail if gameplay clip is missing */
  gameplayStrict?: boolean;
  /** Gameplay placement for split-screen templates */
  gameplayPosition?: 'top' | 'bottom' | 'full';
  /** Content placement for split-screen templates */
  contentPosition?: 'top' | 'bottom' | 'full';
  /** Hook intro clip id, path, or URL */
  hook?: string;
  /** Hook library id (defaults to config) */
  hookLibrary?: string;
  /** Root directory for hook libraries */
  hooksDir?: string;
  /** Hook duration when ffprobe is unavailable */
  hookDuration?: string;
  /** Trim hook to N seconds (optional) */
  hookTrim?: string;
  /** Hook audio mode (mute, keep) */
  hookAudio?: string;
  /** Hook fit mode (cover, contain) */
  hookFit?: string;
  /** Download missing hook clips */
  downloadHook?: boolean;
  /** Download remote stock assets into the render bundle (recommended) */
  downloadAssets?: boolean;
  /** Background music track or preset */
  music?: string | boolean;
  /** Music volume (db) */
  musicVolume?: string;
  /** Music ducking under voice (db) */
  musicDuck?: string;
  /** Loop music to voice duration */
  musicLoop?: boolean;
  /** Music fade-in (ms) */
  musicFadeIn?: string;
  /** Music fade-out (ms) */
  musicFadeOut?: string;
  /** Explicit SFX files (repeatable) */
  sfx?: string[] | boolean;
  /** SFX pack id */
  sfxPack?: string;
  /** SFX placement strategy */
  sfxAt?: string;
  /** SFX volume (db) */
  sfxVolume?: string;
  /** Minimum gap between SFX (ms) */
  sfxMinGap?: string;
  /** Default SFX duration (seconds) */
  sfxDuration?: string;
  /** Ambience bed track or preset */
  ambience?: string | boolean;
  /** Ambience volume (db) */
  ambienceVolume?: string;
  /** Loop ambience to voice duration */
  ambienceLoop?: boolean;
  /** Ambience fade-in (ms) */
  ambienceFadeIn?: string;
  /** Ambience fade-out (ms) */
  ambienceFadeOut?: string;
  /** Mix preset */
  mixPreset?: string;
  /** Loudness target */
  lufsTarget?: string;
  /** Run automatic frame analysis after render */
  frameAnalysis?: boolean;
  /** Frame analysis mode */
  frameAnalysisMode?: 'fps' | 'shots' | 'both';
  /** Frame analysis FPS sampling rate (>0 and <=1) */
  frameAnalysisFps?: string;
  /** Frame analysis shot count */
  frameAnalysisShots?: string;
  /** Frame analysis segment count */
  frameAnalysisSegments?: string;
  /** Frame analysis output root directory */
  frameAnalysisOutput?: string;
  /** Validate dependencies without running the pipeline */
  preflight?: boolean;

  /** Allow executing Remotion code shipped inside template packs (code templates). */
  allowTemplateCode?: boolean;
  /** Template dependency install mode for code templates (auto, prompt, never). */
  templateDeps?: string;
  /** Template package manager (npm, pnpm, yarn). */
  templatePm?: string;
}

/* ------------------------------------------------------------------ */
/*  Tiny parsing utilities                                            */
/* ------------------------------------------------------------------ */

/** @internal */
export function parseOptionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** @internal */
export function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** @internal */
export function parseWordList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [];
}

/** @internal */
export function parseFontWeight(
  value: string | undefined
): number | 'normal' | 'bold' | 'black' | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (raw === 'normal' || raw === 'bold' || raw === 'black') {
    return raw as 'normal' | 'bold' | 'black';
  }
  const numeric = Number.parseInt(raw, 10);
  if (Number.isFinite(numeric)) return numeric;
  throw new CMError('INVALID_ARGUMENT', `Invalid --caption-font-weight value: ${raw}`, {
    fix: 'Use normal, bold, black, or a numeric weight (100-900)',
  });
}

/** @internal */
export function parseSfxPlacement(
  value: string | undefined
): 'hook' | 'scene' | 'list-item' | 'cta' | null {
  if (!value) return null;
  const raw = value.trim();
  if (raw === 'hook' || raw === 'scene' || raw === 'list-item' || raw === 'cta') {
    return raw;
  }
  throw new CMError('INVALID_ARGUMENT', `Invalid --sfx-at value: ${raw}`, {
    fix: 'Use one of: hook, scene, list-item, cta',
  });
}

/** @internal */
export function parseCaptionNotation(value: unknown): 'none' | 'unicode' | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = String(value).trim().toLowerCase();
  if (raw === 'none' || raw === 'unicode') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid --caption-notation value: ${raw}`, {
    fix: 'Use --caption-notation none or --caption-notation unicode',
  });
}

/** @internal */
export function parseMinSyncRating(options: GenerateOptions): number {
  const raw = options.minSyncRating ?? '75';
  const minRating = Number.parseInt(raw, 10);
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 100) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-sync-rating value: ${raw}`, {
      fix: 'Use a number between 0 and 100 for --min-sync-rating',
    });
  }
  return minRating;
}

/** @internal */
export function parseMinCaptionOverall(options: GenerateOptions): number {
  const raw = options.minCaptionOverall ?? '0.75';
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-caption-overall value: ${raw}`, {
      fix: 'Use a number between 0 and 1 (or 0 and 100) for --min-caption-overall',
    });
  }
  const normalized = parsed > 1 ? parsed / 100 : parsed;
  if (!Number.isFinite(normalized) || normalized < 0 || normalized > 1) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-caption-overall value: ${raw}`, {
      fix: 'Use a number between 0 and 1 (or 0 and 100) for --min-caption-overall',
    });
  }
  return normalized;
}

/** @internal */
export function parseMaxCaptionRetries(options: GenerateOptions): number {
  const raw = options.maxCaptionRetries ?? '2';
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --max-caption-retries value: ${raw}`, {
      fix: 'Use a number between 0 and 100 for --max-caption-retries',
    });
  }
  return value;
}

/** @internal */
export function parseFrameAnalysisMode(value: unknown): 'fps' | 'shots' | 'both' {
  const raw = String(value ?? 'both')
    .trim()
    .toLowerCase();
  if (raw === 'fps' || raw === 'shots' || raw === 'both') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid --frame-analysis-mode value: ${raw}`, {
    fix: 'Use one of: fps, shots, both',
  });
}

/** @internal */
export function parseLayoutPosition(
  value: unknown,
  optionName: string
): 'top' | 'bottom' | 'full' | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'top' || raw === 'bottom' || raw === 'full') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid ${optionName} value: ${raw}`, {
    fix: `Use one of: top, bottom, full for ${optionName}`,
  });
}

/** @internal */
export function parseSplitLayoutPreset(
  value: unknown
):
  | { gameplayPosition: 'top' | 'bottom' | 'full'; contentPosition: 'top' | 'bottom' | 'full' }
  | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'gameplay-top') return { gameplayPosition: 'top', contentPosition: 'bottom' };
  if (raw === 'gameplay-bottom') return { gameplayPosition: 'bottom', contentPosition: 'top' };
  throw new CMError('INVALID_ARGUMENT', `Invalid --split-layout value: ${raw}`, {
    fix: 'Use one of: gameplay-top, gameplay-bottom',
  });
}

/** @internal */
export function collectList(value: string, previous: string[] = []): string[] {
  return [...previous, value];
}

/* ------------------------------------------------------------------ */
/*  Provider / routing parsing                                        */
/* ------------------------------------------------------------------ */

const GENERATE_VISUAL_PROVIDER_NAMES: ReadonlySet<AssetProviderName> = new Set([
  ...SUPPORTED_VISUALS_PROVIDER_IDS,
  'dalle',
  'unsplash',
  'mock',
]);

/** @internal */
export function parseVisualsProviderChain(params: {
  providerRaw: string | undefined;
  fallbackRaw: string | undefined;
  configFallbacks: string[];
}): AssetProviderName[] {
  const providerList = String(params.providerRaw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const fallbackList = String(params.fallbackRaw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const rawChain =
    providerList.length > 1
      ? providerList
      : [
          providerList[0] ?? SUPPORTED_VISUALS_PROVIDER_IDS[0],
          ...fallbackList,
          ...params.configFallbacks,
        ];
  const unique = Array.from(new Set(rawChain));
  const parsed: AssetProviderName[] = [];

  for (const provider of unique) {
    if (!GENERATE_VISUAL_PROVIDER_NAMES.has(provider as AssetProviderName)) {
      throw new CMError('INVALID_ARGUMENT', `Unknown visuals provider: ${provider}`, {
        fix: `Use one of: ${Array.from(GENERATE_VISUAL_PROVIDER_NAMES).join(', ')}`,
      });
    }
    parsed.push(provider as AssetProviderName);
  }

  return parsed;
}

/** @internal */
export function parseProviderRoutingPolicy(
  value: string | undefined
): ProviderRoutingPolicy | 'adaptive' | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed === 'adaptive') return 'adaptive';
  if (isProviderRoutingPolicy(trimmed)) return trimmed;
  throw new CMError('INVALID_ARGUMENT', `Invalid visuals routing policy: ${trimmed}`, {
    fix: 'Use one of: configured, balanced, cost-first, quality-first, adaptive',
  });
}

/* ------------------------------------------------------------------ */
/*  Generation policy                                                 */
/* ------------------------------------------------------------------ */

/** @internal */
export async function loadGenerationPolicy(path: string): Promise<GenerationPolicy> {
  const raw = await readInputFile(path);
  const parsed = safeParseGenerationPolicy(raw);
  if (!parsed.success) {
    throw new SchemaError('Invalid policy file', {
      path,
      issues: parsed.error.issues,
      fix: 'Provide a valid generation policy JSON with schemaVersion: 1 (or legacy 1.0.0)',
    });
  }
  return parsed.data;
}

/* ------------------------------------------------------------------ */
/*  Option defaulting                                                 */
/* ------------------------------------------------------------------ */

/** @internal */
export function applyDefaultOption(
  options: Record<string, unknown>,
  command: Command,
  optionName: string,
  value: unknown
): void {
  if (value === undefined) return;
  const source = command.getOptionValueSource(optionName);
  if (source !== 'default' && source !== undefined) return;
  options[optionName] = value;
}

/** @internal */
export function applyQualityDefaults(options: GenerateOptions, command: Command): void {
  if (!options.quality) return;

  const record = options as unknown as Record<string, unknown>;

  // Prefer better sync defaults, but do not override explicit flags.
  applyDefaultOption(record, command, 'syncPreset', PREFERRED_QUALITY_SYNC_PRESET_ID);
  applyDefaultOption(record, command, 'syncQualityCheck', true);
  applyDefaultOption(record, command, 'autoRetrySync', true);
  applyDefaultOption(record, command, 'minSyncRating', '80');

  // Prefer readable burned-in captions; keep retries bounded.
  applyDefaultOption(record, command, 'captionQualityCheck', true);
  applyDefaultOption(record, command, 'autoRetryCaptions', true);
  applyDefaultOption(record, command, 'maxCaptionRetries', '3');
  applyDefaultOption(record, command, 'minCaptionOverall', '0.80');
  applyDefaultOption(record, command, 'captionQualityMock', false);
}

/** @internal */
export function applySyncPresetDefaults(options: GenerateOptions, command: Command): void {
  const presetName = (options.syncPreset ?? DEFAULT_SYNC_PRESET_ID) as string;
  if (!(presetName in SYNC_PRESETS)) return;
  const preset = SYNC_PRESETS[presetName as SyncPresetId];
  if (!preset) return;

  const record = options as unknown as Record<string, unknown>;
  applyDefaultOption(record, command, 'pipeline', preset.pipeline);
  applyDefaultOption(record, command, 'reconcile', preset.reconcile);
  applyDefaultOption(record, command, 'syncQualityCheck', preset.syncQualityCheck);
  applyDefaultOption(record, command, 'minSyncRating', String(preset.minSyncRating));
  applyDefaultOption(record, command, 'autoRetrySync', preset.autoRetrySync);
}

/** @internal */
export function applyDefaultsFromConfig(options: GenerateOptions, command: Command): void {
  const config = loadConfig();
  const record = options as unknown as Record<string, unknown>;

  // Pipeline defaults
  applyDefaultOption(record, command, 'archetype', config.defaults.archetype);
  applyDefaultOption(record, command, 'orientation', config.defaults.orientation);
  applyDefaultOption(record, command, 'voice', config.defaults.voice);
  applyDefaultOption(record, command, 'fps', String(config.render.fps));
  applyDefaultOption(record, command, 'template', config.render.template);
  applyDefaultOption(record, command, 'workflow', config.generate.workflow);
  applyDefaultOption(
    record,
    command,
    'visualsProvider',
    config.visuals?.provider ?? SUPPORTED_VISUALS_PROVIDER_IDS[0]
  );
  applyDefaultOption(record, command, 'visualsRoutingPolicy', config.visuals?.routingPolicy);
  applyDefaultOption(
    record,
    command,
    'visualsMaxGenerationCostUsd',
    config.visuals?.maxGenerationCostUsd !== undefined
      ? String(config.visuals.maxGenerationCostUsd)
      : undefined
  );

  // Caption defaults
  const captions = config.captions;
  const defaultFamily =
    captions.fonts && captions.fonts.length > 0 ? captions.fonts[0].family : captions.fontFamily;
  applyDefaultOption(record, command, 'captionFontFamily', defaultFamily);
  applyDefaultOption(record, command, 'captionFontWeight', String(captions.fontWeight));
  applyDefaultOption(record, command, 'captionFontFile', captions.fontFile);
  applyDefaultOption(record, command, 'captionPreset', captions.preset);
  if (!options.captionFonts && captions.fonts.length > 0) {
    options.captionFonts = captions.fonts;
  }
}

/** @internal */
export function applyCaptionQualityPerfectDefaults(
  options: GenerateOptions,
  command: Command
): void {
  if (!options.captionPerfect) return;
  options.captionQualityCheck = true;
  options.autoRetryCaptions = true;
  const record = options as unknown as Record<string, unknown>;
  applyDefaultOption(record, command, 'minCaptionOverall', '0.95');
  applyDefaultOption(record, command, 'maxCaptionRetries', '50');
  applyDefaultOption(record, command, 'captionQualityMock', false);
  applyDefaultOption(record, command, 'captionMode', 'chunk');
  applyDefaultOption(record, command, 'wordsPerPage', '8');
  applyDefaultOption(record, command, 'captionGroupMs', '1200');
  applyDefaultOption(record, command, 'captionMaxWpm', '220');
  applyDefaultOption(record, command, 'captionMaxCps', '18');
  applyDefaultOption(record, command, 'captionMinOnScreenMs', '1400');
  applyDefaultOption(record, command, 'captionMinOnScreenMsShort', '1100');
}

/** @internal */
export function applyPolicyDefaults(
  options: GenerateOptions,
  command: Command,
  policy: GenerationPolicy | undefined
): void {
  if (!policy?.visuals) return;
  const visuals = policy.visuals;
  const record = options as unknown as Record<string, unknown>;

  if (visuals.providerChain && visuals.providerChain.length > 0) {
    applyDefaultOption(record, command, 'visualsProvider', visuals.providerChain.join(','));
    if (visuals.providerChain.length > 1) {
      applyDefaultOption(
        record,
        command,
        'visualsFallbackProviders',
        visuals.providerChain.slice(1).join(',')
      );
    }
  }

  applyDefaultOption(record, command, 'visualsRoutingPolicy', visuals.routingPolicy);
  applyDefaultOption(
    record,
    command,
    'visualsMaxGenerationCostUsd',
    visuals.maxGenerationCostUsd !== undefined ? String(visuals.maxGenerationCostUsd) : undefined
  );
  applyDefaultOption(record, command, 'visualsGateEnforce', visuals.gates?.enforce);
  applyDefaultOption(
    record,
    command,
    'visualsGateMaxFallbackRate',
    visuals.gates?.maxFallbackRate !== undefined ? String(visuals.gates.maxFallbackRate) : undefined
  );
  applyDefaultOption(
    record,
    command,
    'visualsGateMinProviderSuccessRate',
    visuals.gates?.minProviderSuccessRate !== undefined
      ? String(visuals.gates.minProviderSuccessRate)
      : undefined
  );
  applyDefaultOption(
    record,
    command,
    'visualsRoutingAdaptiveWindow',
    visuals.evaluation?.adaptiveWindow !== undefined
      ? String(visuals.evaluation.adaptiveWindow)
      : undefined
  );
  applyDefaultOption(
    record,
    command,
    'visualsRoutingAdaptiveMinRecords',
    visuals.evaluation?.minRecords !== undefined ? String(visuals.evaluation.minRecords) : undefined
  );
}

/* ------------------------------------------------------------------ */
/*  Workflow helpers                                                   */
/* ------------------------------------------------------------------ */

type WorkflowStageId = 'script' | 'audio' | 'visuals' | 'render';
export type WorkflowStageModes = Record<WorkflowStageId, WorkflowStageMode>;

/** @internal */
export function resolveWorkflowStageModes(
  workflow: WorkflowDefinition | undefined
): WorkflowStageModes {
  const stages = workflow?.stages;
  return {
    script: resolveWorkflowStageMode(stages?.script),
    audio: resolveWorkflowStageMode(stages?.audio),
    visuals: resolveWorkflowStageMode(stages?.visuals),
    render: resolveWorkflowStageMode(stages?.render),
  };
}

/** @internal */
export function isExternalStageMode(mode: WorkflowStageMode): boolean {
  return mode !== 'builtin';
}

function getOptionNameMap(command: Command): Map<string, string> {
  const map = new Map<string, string>();
  for (const option of command.options) {
    const attribute = option.attributeName();
    map.set(attribute, attribute);
    if (option.long) {
      map.set(option.long.replace(/^--/, ''), attribute);
    }
  }
  return map;
}

/** @internal */
export function resolveWorkflowPath(
  baseDir: string | undefined,
  value: string | undefined
): string | undefined {
  if (!value) return undefined;
  return resolve(baseDir ?? process.cwd(), value);
}

/** @internal */
export function applyWorkflowDefaults(
  options: GenerateOptions,
  command: Command,
  workflow: WorkflowDefinition | undefined,
  skipKeys: Set<string> = new Set()
): void {
  if (!workflow?.defaults) return;
  const record = options as unknown as Record<string, unknown>;
  const optionMap = getOptionNameMap(command);

  for (const [key, value] of Object.entries(workflow.defaults)) {
    const normalizedKey = optionMap.get(key) ?? optionMap.get(key.replace(/^--/, ''));
    if (!normalizedKey) continue;
    if (skipKeys.has(normalizedKey)) continue;
    applyDefaultOption(record, command, normalizedKey, value);
  }
}

/** @internal */
export function applyWorkflowInputs(
  options: GenerateOptions,
  command: Command,
  workflow: WorkflowDefinition | undefined,
  baseDir: string | undefined
): void {
  if (!workflow?.inputs) return;
  const record = options as unknown as Record<string, unknown>;
  const inputs = workflow.inputs;

  applyDefaultOption(record, command, 'script', resolveWorkflowPath(baseDir, inputs.script));
  applyDefaultOption(record, command, 'audio', resolveWorkflowPath(baseDir, inputs.audio));
  applyDefaultOption(
    record,
    command,
    'timestamps',
    resolveWorkflowPath(baseDir, inputs.timestamps)
  );
  applyDefaultOption(record, command, 'visuals', resolveWorkflowPath(baseDir, inputs.visuals));
}

/** @internal */
export function applyWorkflowStageDefaults(
  options: GenerateOptions,
  stageModes: WorkflowStageModes,
  artifactsDir: string
): void {
  if (isExternalStageMode(stageModes.script)) {
    if (!options.script) {
      options.script = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.script);
    }
  }
  if (isExternalStageMode(stageModes.audio)) {
    if (!options.audio) {
      options.audio = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.audio);
    }
    if (!options.timestamps) {
      options.timestamps = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.timestamps);
    }
  }
  if (isExternalStageMode(stageModes.visuals)) {
    if (!options.visuals) {
      options.visuals = join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES.visuals);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Template resolution                                               */
/* ------------------------------------------------------------------ */

/** @internal */
export async function resolveTemplateAndApplyDefaults(
  options: GenerateOptions,
  command: Command
): Promise<{
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
  templateOverlays: OverlayAsset[];
}> {
  if (!options.template) {
    return {
      resolvedTemplate: undefined,
      templateDefaults: undefined,
      templateParams: {},
      templateGameplay: null,
      templateOverlays: [],
    };
  }

  const resolvedTemplate = await resolveRenderTemplate(options.template);
  const templateDefaults = (resolvedTemplate.template.defaults ?? {}) as Record<string, unknown>;
  const templateParams = getTemplateParams(resolvedTemplate.template);
  const templateGameplay = getTemplateGameplaySlot(resolvedTemplate.template);
  const templateFonts = getTemplateFontSources(
    resolvedTemplate.template,
    resolvedTemplate.templateDir
  );
  const templateOverlays = getTemplateOverlays(
    resolvedTemplate.template,
    resolvedTemplate.templateDir
  );

  const record = options as unknown as Record<string, unknown>;
  applyDefaultOption(record, command, 'archetype', templateDefaults.archetype);
  applyDefaultOption(record, command, 'orientation', templateDefaults.orientation);
  applyDefaultOption(
    record,
    command,
    'fps',
    templateDefaults.fps !== undefined ? String(templateDefaults.fps) : undefined
  );
  applyDefaultOption(record, command, 'captionPreset', templateDefaults.captionPreset);
  if (templateFonts.length > 0) {
    // Prefer template-provided fonts over config defaults unless the user explicitly overrides.
    applyDefaultOption(record, command, 'captionFontFamily', templateFonts[0]?.family);
    options.captionFonts = mergeFontSources(templateFonts, options.captionFonts ?? []);
  }

  return { resolvedTemplate, templateDefaults, templateParams, templateGameplay, templateOverlays };
}

/* ------------------------------------------------------------------ */
/*  Audio mix options                                                  */
/* ------------------------------------------------------------------ */

/** @internal */
export function buildAudioMixOptions(options: GenerateOptions): AudioMixPlanOptions {
  const config = loadConfig();
  const noMusic = options.music === false;
  const noSfx = options.sfx === false;
  const noAmbience = options.ambience === false;
  const sfxInputs = Array.isArray(options.sfx) ? options.sfx : [];
  const musicInput = typeof options.music === 'string' ? options.music : undefined;
  const ambienceInput = typeof options.ambience === 'string' ? options.ambience : undefined;

  return {
    mixPreset: (options.mixPreset as string | undefined) ?? config.audioMix.preset,
    lufsTarget: parseOptionalNumber(options.lufsTarget) ?? config.audioMix.lufsTarget,
    music: noMusic ? null : (musicInput ?? config.music.default ?? null),
    musicVolumeDb: parseOptionalNumber(options.musicVolume) ?? config.music.volumeDb,
    musicDuckDb: parseOptionalNumber(options.musicDuck) ?? config.music.duckDb,
    musicLoop: options.musicLoop !== undefined ? Boolean(options.musicLoop) : config.music.loop,
    musicFadeInMs: parseOptionalInt(options.musicFadeIn) ?? config.music.fadeInMs,
    musicFadeOutMs: parseOptionalInt(options.musicFadeOut) ?? config.music.fadeOutMs,
    sfx: noSfx ? [] : sfxInputs,
    sfxPack: noSfx ? null : (options.sfxPack ?? config.sfx.pack ?? null),
    sfxAt: parseSfxPlacement(options.sfxAt) ?? config.sfx.placement,
    sfxVolumeDb: parseOptionalNumber(options.sfxVolume) ?? config.sfx.volumeDb,
    sfxMinGapMs: parseOptionalInt(options.sfxMinGap) ?? config.sfx.minGapMs,
    sfxDurationSeconds: parseOptionalNumber(options.sfxDuration) ?? config.sfx.durationSeconds,
    ambience: noAmbience ? null : (ambienceInput ?? config.ambience.default ?? null),
    ambienceVolumeDb: parseOptionalNumber(options.ambienceVolume) ?? config.ambience.volumeDb,
    ambienceLoop:
      options.ambienceLoop !== undefined ? Boolean(options.ambienceLoop) : config.ambience.loop,
    ambienceFadeInMs: parseOptionalInt(options.ambienceFadeIn) ?? config.ambience.fadeInMs,
    ambienceFadeOutMs: parseOptionalInt(options.ambienceFadeOut) ?? config.ambience.fadeOutMs,
    noMusic,
    noSfx,
    noAmbience,
  };
}

/* ------------------------------------------------------------------ */
/*  Caption config merging                                             */
/* ------------------------------------------------------------------ */

/** @internal */
export function mergeCaptionConfigPartials(
  base: CaptionConfigInput | undefined,
  overrides: CaptionConfigInput | undefined
): CaptionConfigInput | undefined {
  if (!base) return overrides;
  if (!overrides) return base;

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
    listBadges: { ...(base.listBadges ?? {}), ...(overrides.listBadges ?? {}) },
    emphasis: { ...base.emphasis, ...overrides.emphasis },
  };
}

/** @internal */
export function mergeTemplateDefaultsCaptionConfig(
  templateDefaults: Record<string, unknown> | undefined,
  overrides: CaptionConfigInput
): Record<string, unknown> | undefined {
  if (!overrides || Object.keys(overrides).length === 0) return templateDefaults;
  const base = (templateDefaults?.captionConfig ?? {}) as CaptionConfigInput;
  const merged: CaptionConfigInput = {
    ...base,
    ...overrides,
    pillStyle: { ...(base.pillStyle ?? {}), ...(overrides.pillStyle ?? {}) },
    stroke: { ...(base.stroke ?? {}), ...(overrides.stroke ?? {}) },
    shadow: { ...(base.shadow ?? {}), ...(overrides.shadow ?? {}) },
    layout: { ...(base.layout ?? {}), ...(overrides.layout ?? {}) },
    positionOffset: { ...(base.positionOffset ?? {}), ...(overrides.positionOffset ?? {}) },
    safeZone: { ...(base.safeZone ?? {}), ...(overrides.safeZone ?? {}) },
    emphasis: { ...(base.emphasis ?? {}), ...(overrides.emphasis ?? {}) },
    cleanup: { ...(base.cleanup ?? {}), ...(overrides.cleanup ?? {}) },
  };

  return { ...(templateDefaults ?? {}), captionConfig: merged };
}
