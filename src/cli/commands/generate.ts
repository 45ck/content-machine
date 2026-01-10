/**
 * Generate command - Full pipeline: topic -> video
 *
 * Usage: cm generate "Redis vs PostgreSQL" --archetype versus --output video.mp4
 */
import { Command } from 'commander';
import type { PipelineResult } from '../../core/pipeline';
import { logger } from '../../core/logger';
import {
  ArchetypeEnum,
  OrientationEnum,
  type Archetype,
  type Orientation,
} from '../../core/config';
import { loadConfig } from '../../core/config';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { createMockScriptResponse } from '../../test/fixtures/mock-scenes.js';
import { createSpinner } from '../progress';
import chalk from 'chalk';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { formatKeyValueRows, writeSummaryCard } from '../ui';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { ResearchOutputSchema } from '../../research/schema';
import type { ResearchOutput } from '../../research/schema';
import { createResearchOrchestrator } from '../../research/orchestrator';
import { OpenAIProvider } from '../../core/llm/openai';
import { CMError, SchemaError } from '../../core/errors';
import { CliProgressObserver, PipelineEventEmitter, type PipelineEvent } from '../../core/events';
import { getCliErrorInfo } from '../format';
import {
  formatTemplateSource,
  resolveVideoTemplate,
  getTemplateGameplaySlot,
  getTemplateParams,
} from '../../render/templates';
import type { CaptionConfig } from '../../render/schema';
import type { CaptionPresetName } from '../../render/captions/presets';
import type { SyncRatingOutput } from '../../score/sync-schema';
import {
  runGenerateWithSyncQualityGate,
  type SyncAttemptSettings,
  type SyncQualitySummary,
} from './generate-quality';

/**
 * Sync quality presets for different quality/speed tradeoffs
 */
export interface SyncPresetConfig {
  pipeline: 'standard' | 'audio-first';
  reconcile: boolean;
  syncQualityCheck: boolean;
  minSyncRating: number;
  autoRetrySync: boolean;
}

export const SYNC_PRESETS: Record<string, SyncPresetConfig> = {
  /** Fast: standard pipeline, no quality check, fastest rendering */
  fast: {
    pipeline: 'standard',
    reconcile: false,
    syncQualityCheck: false,
    minSyncRating: 0,
    autoRetrySync: false,
  },
  /** Standard: audio-first pipeline (whisper required), no quality check */
  standard: {
    pipeline: 'audio-first',
    reconcile: true,
    syncQualityCheck: false,
    minSyncRating: 60,
    autoRetrySync: false,
  },
  /** Quality: audio-first with quality check enabled */
  quality: {
    pipeline: 'audio-first',
    reconcile: true,
    syncQualityCheck: true,
    minSyncRating: 75,
    autoRetrySync: false,
  },
  /** Maximum: audio-first with reconcile, quality check, and auto-retry */
  maximum: {
    pipeline: 'audio-first',
    reconcile: true,
    syncQualityCheck: true,
    minSyncRating: 85,
    autoRetrySync: true,
  },
};

interface GenerateOptions {
  archetype: string;
  output: string;
  orientation: string;
  template?: string;
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
  /** Whisper model size: tiny, base, small, medium */
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium';
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
  /** Caption display mode: page (default), single (one word at a time), buildup (accumulate per sentence) */
  captionMode?: 'page' | 'single' | 'buildup' | 'chunk';
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
  /** Comma-separated filler words/phrases to drop */
  captionFillerWords?: string;
  /** Maximum lines per caption page (default: 2) */
  maxLines?: string;
  /** Maximum characters per line (default: 25) */
  charsPerLine?: string;
  /** Caption animation: none (default), fade, slideUp, slideDown, pop, bounce */
  captionAnimation?: 'none' | 'fade' | 'slideUp' | 'slideDown' | 'pop' | 'bounce';
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
  /** Download remote stock assets into the render bundle (recommended) */
  downloadAssets?: boolean;
  /** Validate dependencies without running the pipeline */
  preflight?: boolean;
}

function printHeader(
  topic: string,
  options: GenerateOptions,
  runtime: ReturnType<typeof getCliRuntime>
): void {
  if (runtime.json) return;

  writeStderrLine(chalk.bold('content-machine'));
  writeStderrLine(chalk.gray(`Topic: ${topic}`));
  writeStderrLine(chalk.gray(`Archetype: ${options.archetype}`));
  if (options.template) {
    writeStderrLine(chalk.gray(`Template: ${options.template}`));
  }
  if (options.gameplay) {
    writeStderrLine(chalk.gray(`Gameplay: ${options.gameplay}`));
  }
  writeStderrLine(chalk.gray(`Output: ${options.output}`));
  writeStderrLine(chalk.gray(`Artifacts: ${dirname(options.output)}`));
}

function writeDryRunJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
}): void {
  const {
    topic,
    archetype,
    orientation,
    options,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
  } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: {
        topic,
        archetype,
        orientation,
        template: templateSpec,
        resolvedTemplateId,
        fps: options.fps ?? '30',
        captionPreset: options.captionPreset ?? 'tiktok',
        captionMode: options.captionMode ?? null,
        wordsPerPage: parseOptionalInt(options.wordsPerPage ?? options.captionMaxWords),
        captionMaxWords: parseOptionalInt(options.captionMaxWords),
        captionMinWords: parseOptionalInt(options.captionMinWords),
        captionTargetWords: parseOptionalInt(options.captionTargetWords),
        captionMaxWpm: parseOptionalNumber(options.captionMaxWpm),
        captionMaxCps: parseOptionalNumber(options.captionMaxCps),
        captionMinOnScreenMs: parseOptionalInt(options.captionMinOnScreenMs),
        captionMinOnScreenMsShort: parseOptionalInt(options.captionMinOnScreenMsShort),
        captionDropFillers: options.captionDropFillers ?? null,
        captionFillerWords: parseWordList(options.captionFillerWords) ?? null,
        voice: options.voice,
        durationSeconds: options.duration,
        output: options.output,
        keepArtifacts: options.keepArtifacts,
        gameplay: options.gameplay ?? null,
        gameplayStyle: options.gameplayStyle ?? null,
        gameplayStrict: Boolean(options.gameplayStrict),
        splitLayout: options.splitLayout ?? null,
        gameplayPosition: options.gameplayPosition ?? null,
        contentPosition: options.contentPosition ?? null,
        downloadAssets: options.downloadAssets !== false,
        dryRun: true,
      },
      outputs: { dryRun: true, artifactsDir },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
}

type PreflightStatus = 'ok' | 'warn' | 'fail';

interface PreflightCheck {
  label: string;
  status: PreflightStatus;
  detail?: string;
  fix?: string;
  code?: string;
}

const PREFLIGHT_USAGE_CODES = new Set(['INVALID_ARGUMENT', 'SCHEMA_ERROR', 'FILE_NOT_FOUND', 'INVALID_JSON']);

function addPreflightCheck(
  checks: PreflightCheck[],
  entry: PreflightCheck
): void {
  checks.push(entry);
}

function formatPreflightLine(check: PreflightCheck): string {
  const status =
    check.status === 'ok' ? chalk.green('OK ') : check.status === 'warn' ? chalk.yellow('WARN') : chalk.red('FAIL');
  const detail = check.detail ? ` - ${check.detail}` : '';
  return `- ${status} ${check.label}${detail}`;
}

async function runGeneratePreflight(params: {
  topic: string;
  options: GenerateOptions;
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
  runtime: ReturnType<typeof getCliRuntime>;
}): Promise<{ passed: boolean; checks: PreflightCheck[]; exitCode: number }> {
  const { options, resolvedTemplate, templateGameplay } = params;
  const checks: PreflightCheck[] = [];

  const templateId = resolvedTemplate?.template.id;
  addPreflightCheck(checks, {
    label: 'Template',
    status: 'ok',
    detail: templateId ? `${templateId} (${formatTemplateSource(resolvedTemplate)})` : 'default',
  });

  if (typeof options.research === 'string') {
    try {
      const raw = await readInputFile(options.research);
      const parsed = ResearchOutputSchema.safeParse(raw);
      if (!parsed.success) {
        addPreflightCheck(checks, {
          label: 'Research file',
          status: 'fail',
          code: 'SCHEMA_ERROR',
          detail: 'Invalid research JSON',
          fix: 'Generate via `cm research -q "<topic>" -o research.json` and pass --research research.json',
        });
      } else {
        addPreflightCheck(checks, {
          label: 'Research file',
          status: 'ok',
          detail: options.research,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Research file',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }
  }

  const gameplayRequired = Boolean(options.gameplayStrict) || Boolean(templateGameplay?.required);
  if (gameplayRequired && !options.gameplay) {
    addPreflightCheck(checks, {
      label: 'Gameplay asset',
      status: 'fail',
      code: 'FILE_NOT_FOUND',
      detail: 'Gameplay is required but no path provided',
      fix: 'Provide --gameplay <path> or choose a template without required gameplay',
    });
  } else if (options.gameplay) {
    addPreflightCheck(checks, {
      label: 'Gameplay asset',
      status: existsSync(options.gameplay) ? 'ok' : 'fail',
      code: existsSync(options.gameplay) ? undefined : 'FILE_NOT_FOUND',
      detail: options.gameplay,
      fix: existsSync(options.gameplay) ? undefined : 'Provide a valid gameplay directory or clip path',
    });
  }

  if (!options.mock) {
    try {
      const config = await loadConfig();
      const provider = config.llm.provider;
      const llmKey =
        provider === 'openai'
          ? 'OPENAI_API_KEY'
          : provider === 'anthropic'
            ? 'ANTHROPIC_API_KEY'
            : 'GOOGLE_API_KEY';

      if (!process.env[llmKey]) {
        addPreflightCheck(checks, {
          label: 'LLM provider',
          status: 'fail',
          code: 'CONFIG_ERROR',
          detail: `${provider} (${llmKey} missing)`,
          fix: `Set ${llmKey} in your environment or .env file`,
        });
      } else {
        addPreflightCheck(checks, {
          label: 'LLM provider',
          status: 'ok',
          detail: `${provider} (${llmKey} set)`,
        });
      }
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'LLM provider',
        status: 'fail',
        code: info.code,
        detail: info.message,
        fix: info.fix,
      });
    }

    if (!process.env.PEXELS_API_KEY) {
      addPreflightCheck(checks, {
        label: 'Visuals provider',
        status: 'fail',
        code: 'CONFIG_ERROR',
        detail: 'pexels (PEXELS_API_KEY missing)',
        fix: 'Set PEXELS_API_KEY in your environment or .env file',
      });
    } else {
      addPreflightCheck(checks, {
        label: 'Visuals provider',
        status: 'ok',
        detail: 'pexels (PEXELS_API_KEY set)',
      });
    }
  } else {
    addPreflightCheck(checks, {
      label: 'Mock mode',
      status: 'ok',
      detail: 'Mock providers enabled (skipping API key checks)',
    });
  }

  if (options.syncQualityCheck) {
    try {
      parseMinSyncRating(options);
      addPreflightCheck(checks, {
        label: 'Sync quality',
        status: 'ok',
        detail: `min rating ${options.minSyncRating ?? '75'}`,
      });
    } catch (error) {
      const info = getCliErrorInfo(error);
      addPreflightCheck(checks, {
        label: 'Sync quality',
        status: 'fail',
        code: info.code,
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

function writePreflightOutput(params: {
  topic: string;
  options: GenerateOptions;
  runtime: ReturnType<typeof getCliRuntime>;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  checks: PreflightCheck[];
  passed: boolean;
  exitCode: number;
}): void {
  const { topic, options, runtime, templateSpec, resolvedTemplateId, checks, passed, exitCode } = params;

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
        command: 'generate',
        args: {
          ...buildGenerateSuccessJsonArgs({
            topic,
            archetype: options.archetype,
            orientation: options.orientation,
            options,
            templateSpec,
            resolvedTemplateId,
          }),
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
  if (passed) {
    writeStderrLine(`Next: cm generate "${topic}" -o ${options.output}`);
  }
  process.exit(exitCode);
}

function parseOptionalInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWordList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return items.length > 0 ? items : [];
}

function buildGenerateSuccessJsonArgs(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
}): Record<string, unknown> {
  const { topic, archetype, orientation, options, templateSpec, resolvedTemplateId } = params;

  return {
    topic,
    archetype,
    orientation,
    template: templateSpec,
    resolvedTemplateId,
    gameplay: options.gameplay ?? null,
    gameplayStyle: options.gameplayStyle ?? null,
    gameplayStrict: Boolean(options.gameplayStrict),
    fps: options.fps,
    captionPreset: options.captionPreset,
    captionMode: options.captionMode ?? null,
    wordsPerPage: parseOptionalInt(options.wordsPerPage ?? options.captionMaxWords),
    captionMaxWords: parseOptionalInt(options.captionMaxWords),
    captionMinWords: parseOptionalInt(options.captionMinWords),
    captionTargetWords: parseOptionalInt(options.captionTargetWords),
    captionMaxWpm: parseOptionalNumber(options.captionMaxWpm),
    captionMaxCps: parseOptionalNumber(options.captionMaxCps),
    captionMinOnScreenMs: parseOptionalInt(options.captionMinOnScreenMs),
    captionMinOnScreenMsShort: parseOptionalInt(options.captionMinOnScreenMsShort),
    captionDropFillers: options.captionDropFillers ?? null,
    captionFillerWords: parseWordList(options.captionFillerWords) ?? null,
    voice: options.voice,
    durationSeconds: options.duration,
    output: options.output,
    keepArtifacts: options.keepArtifacts,
    mock: options.mock,
    pipeline: options.pipeline,
    whisperModel: options.whisperModel ?? null,
    reconcile: Boolean(options.reconcile),
    syncPreset: options.syncPreset,
    syncQualityCheck: Boolean(options.syncQualityCheck),
    minSyncRating: parseOptionalInt(options.minSyncRating),
    autoRetrySync: Boolean(options.autoRetrySync),
    gameplayPosition: options.gameplayPosition ?? null,
    contentPosition: options.contentPosition ?? null,
    splitLayout: options.splitLayout ?? null,
    downloadAssets: options.downloadAssets !== false,
  };
}

function buildGenerateSuccessJsonSyncOutputs(
  sync: SyncQualitySummary | null | undefined
): Record<string, unknown> {
  if (!sync) {
    return {
      syncReportPath: null,
      syncRating: null,
      syncRatingLabel: null,
      syncPassed: null,
      syncMeanDriftMs: null,
      syncMaxDriftMs: null,
      syncMatchRatio: null,
      syncErrorCount: null,
      syncAttempts: null,
    };
  }

  return {
    syncReportPath: sync.reportPath,
    syncRating: sync.rating,
    syncRatingLabel: sync.ratingLabel,
    syncPassed: sync.passed,
    syncMeanDriftMs: sync.meanDriftMs,
    syncMaxDriftMs: sync.maxDriftMs,
    syncMatchRatio: sync.matchRatio,
    syncErrorCount: sync.errorCount,
    syncAttempts: sync.attempts,
  };
}

function buildGenerateSuccessJsonOutputs(params: {
  result: PipelineResult;
  artifactsDir: string;
  sync: SyncQualitySummary | null | undefined;
}): Record<string, unknown> {
  const { result, artifactsDir, sync } = params;

  return {
    videoPath: result.outputPath,
    durationSeconds: result.duration,
    width: result.width,
    height: result.height,
    fps: result.render.fps,
    fileSizeBytes: result.fileSize,
    artifactsDir,
    costs: result.costs ?? null,
    gameplayClip: result.visuals.gameplayClip?.path ?? null,
    ...buildGenerateSuccessJsonSyncOutputs(sync),
  };
}

function writeSuccessJson(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  result: PipelineResult;
  sync?: SyncQualitySummary | null;
  exitCode?: number;
}): void {
  const {
    topic,
    archetype,
    orientation,
    options,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
    result,
    sync,
    exitCode = 0,
  } = params;

  writeJsonEnvelope(
    buildJsonEnvelope({
      command: 'generate',
      args: buildGenerateSuccessJsonArgs({
        topic,
        archetype,
        orientation,
        options,
        templateSpec,
        resolvedTemplateId,
      }),
      outputs: buildGenerateSuccessJsonOutputs({ result, artifactsDir, sync }),
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(exitCode);
}

function applyDefaultOption(
  options: Record<string, unknown>,
  command: Command,
  optionName: string,
  value: unknown
): void {
  if (value === undefined) return;
  if (command.getOptionValueSource(optionName) !== 'default') return;
  options[optionName] = value;
}

function applySyncPresetDefaults(options: GenerateOptions, command: Command): void {
  const presetName = options.syncPreset ?? 'standard';
  const preset = SYNC_PRESETS[presetName];
  if (!preset) return;

  const record = options as unknown as Record<string, unknown>;
  applyDefaultOption(record, command, 'pipeline', preset.pipeline);
  applyDefaultOption(record, command, 'reconcile', preset.reconcile);
  applyDefaultOption(record, command, 'syncQualityCheck', preset.syncQualityCheck);
  applyDefaultOption(record, command, 'minSyncRating', String(preset.minSyncRating));
  applyDefaultOption(record, command, 'autoRetrySync', preset.autoRetrySync);
}

async function resolveTemplateAndApplyDefaults(
  options: GenerateOptions,
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

  const resolvedTemplate = await resolveVideoTemplate(options.template);
  const templateDefaults = (resolvedTemplate.template.defaults ?? {}) as Record<string, unknown>;
  const templateParams = getTemplateParams(resolvedTemplate.template);
  const templateGameplay = getTemplateGameplaySlot(resolvedTemplate.template);

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

  return { resolvedTemplate, templateDefaults, templateParams, templateGameplay };
}

function handleDryRun(params: {
  topic: string;
  options: GenerateOptions;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  archetype: Archetype;
  orientation: Orientation;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
}): boolean {
  if (!params.options.dryRun) return false;

  if (params.runtime.json) {
    writeDryRunJson({
      topic: params.topic,
      archetype: params.archetype,
      orientation: params.orientation,
      options: params.options,
      templateSpec: params.templateSpec,
      resolvedTemplateId: params.resolvedTemplateId,
      runtime: params.runtime,
      artifactsDir: params.artifactsDir,
    });
    return true;
  }

  showDryRunSummary(params.topic, params.options, params.archetype, params.orientation);
  return true;
}

function createPipelineObservation(runtime: ReturnType<typeof getCliRuntime>): {
  eventEmitter: PipelineEventEmitter | undefined;
  dispose: () => void;
} {
  if (runtime.json) {
    return { eventEmitter: undefined, dispose: () => {} };
  }

  const eventEmitter = new PipelineEventEmitter();
  const stageObserver = new CliProgressObserver(process.stderr);
  eventEmitter.subscribe({
    onEvent: (event: PipelineEvent) => {
      if (event.type.startsWith('stage:')) stageObserver.onEvent(event);
    },
  });

  return { eventEmitter, dispose: () => stageObserver.dispose() };
}

async function runGeneratePipeline(params: {
  topic: string;
  archetype: Archetype;
  orientation: Orientation;
  options: GenerateOptions;
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof getTemplateParams>;
  gameplay?: { library?: string; style?: string; required?: boolean };
  research: ResearchOutput | undefined;
  llmProvider: FakeLLMProvider | undefined;
  runtime: ReturnType<typeof getCliRuntime>;
}): Promise<PipelineResult> {
  const { eventEmitter, dispose } = createPipelineObservation(params.runtime);

  try {
    const { runPipeline } = await import('../../core/pipeline');
    const wordsPerPage =
      params.options.wordsPerPage ?? params.options.captionMaxWords ?? undefined;
    const captionFillerWords = parseWordList(params.options.captionFillerWords);
    const captionDropFillers =
      params.options.captionDropFillers || (captionFillerWords && captionFillerWords.length > 0)
        ? true
        : undefined;

    return await runPipeline({
      topic: params.topic,
      archetype: params.archetype as
        | 'listicle'
        | 'versus'
        | 'howto'
        | 'myth'
        | 'story'
        | 'hot-take',
      orientation: params.orientation as 'portrait' | 'landscape' | 'square',
      voice: params.options.voice,
      targetDuration: parseInt(params.options.duration, 10),
      outputPath: params.options.output,
      fps: params.options.fps ? parseInt(params.options.fps, 10) : undefined,
      compositionId: params.resolvedTemplate?.template.compositionId,
      captionPreset: params.options.captionPreset as CaptionPresetName | undefined,
      captionConfig: params.templateDefaults?.captionConfig as Partial<CaptionConfig> | undefined,
      keepArtifacts: params.options.keepArtifacts,
      llmProvider: params.llmProvider,
      mock: params.options.mock,
      research: params.research,
      eventEmitter,
      pipelineMode: params.options.pipeline ?? 'standard',
      whisperModel: params.options.whisperModel,
      captionGroupMs: params.options.captionGroupMs
        ? parseInt(params.options.captionGroupMs, 10)
        : undefined,
      reconcile: params.options.reconcile,
      captionMode: params.options.captionMode,
      wordsPerPage: wordsPerPage ? parseInt(wordsPerPage, 10) : undefined,
      captionMinWords: parseOptionalInt(params.options.captionMinWords) ?? undefined,
      captionTargetWords: parseOptionalInt(params.options.captionTargetWords) ?? undefined,
      captionMaxWpm: parseOptionalNumber(params.options.captionMaxWpm) ?? undefined,
      captionMaxCps: parseOptionalNumber(params.options.captionMaxCps) ?? undefined,
      captionMinOnScreenMs: parseOptionalInt(params.options.captionMinOnScreenMs) ?? undefined,
      captionMinOnScreenMsShort:
        parseOptionalInt(params.options.captionMinOnScreenMsShort) ?? undefined,
      captionDropFillers,
      captionFillerWords,
      maxLinesPerPage: params.options.maxLines ? parseInt(params.options.maxLines, 10) : undefined,
      maxCharsPerLine: params.options.charsPerLine
        ? parseInt(params.options.charsPerLine, 10)
        : undefined,
      captionAnimation: params.options.captionAnimation,
      gameplay: params.gameplay,
      splitScreenRatio: params.templateParams.splitScreenRatio,
      gameplayPosition: params.options.gameplayPosition ?? params.templateParams.gameplayPosition,
      contentPosition: params.options.contentPosition ?? params.templateParams.contentPosition,
      downloadAssets: params.options.downloadAssets !== false,
    });
  } finally {
    dispose();
  }
}

function toNullableString(value: string | undefined): string | null {
  return value ?? null;
}

function resolveTemplateId(
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined
): string | null {
  return resolvedTemplate?.template.id ?? null;
}

function getTemplateSourceForLog(
  resolvedTemplate: Awaited<ReturnType<typeof resolveVideoTemplate>> | undefined
): string | undefined {
  return resolvedTemplate ? formatTemplateSource(resolvedTemplate) : undefined;
}

function getLogFps(options: GenerateOptions): number {
  return options.fps ? parseInt(options.fps, 10) : 30;
}

function getCaptionPreset(options: GenerateOptions): string {
  return options.captionPreset ?? 'capcut';
}

function parseLayoutPosition(value: unknown, optionName: string): 'top' | 'bottom' | 'full' | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'top' || raw === 'bottom' || raw === 'full') return raw;
  throw new CMError('INVALID_ARGUMENT', `Invalid ${optionName} value: ${raw}`, {
    fix: `Use one of: top, bottom, full for ${optionName}`,
  });
}

function parseSplitLayoutPreset(
  value: unknown
): { gameplayPosition: 'top' | 'bottom' | 'full'; contentPosition: 'top' | 'bottom' | 'full' } | undefined {
  if (value == null) return undefined;
  const raw = String(value);
  if (raw === 'gameplay-top') return { gameplayPosition: 'top', contentPosition: 'bottom' };
  if (raw === 'gameplay-bottom') return { gameplayPosition: 'bottom', contentPosition: 'top' };
  throw new CMError('INVALID_ARGUMENT', `Invalid --split-layout value: ${raw}`, {
    fix: 'Use one of: gameplay-top, gameplay-bottom',
  });
}

function reportResearchSummary(
  research: ResearchOutput | undefined,
  runtime: ReturnType<typeof getCliRuntime>
): void {
  if (!research || runtime.json) return;

  writeStderrLine(
    chalk.gray(
      `Research: ${research.totalResults} evidence items from ${research.sources.join(', ')}`
    )
  );
}

function createGenerateLlmProvider(
  topic: string,
  options: GenerateOptions,
  runtime: ReturnType<typeof getCliRuntime>
): FakeLLMProvider | undefined {
  if (!options.mock) return undefined;
  if (!runtime.json) writeStderrLine(chalk.yellow('Mock mode - using fake providers'));
  return createMockLLMProvider(topic);
}

function parseMinSyncRating(options: GenerateOptions): number {
  const raw = options.minSyncRating ?? '75';
  const minRating = Number.parseInt(raw, 10);
  if (!Number.isFinite(minRating) || minRating < 0 || minRating > 100) {
    throw new CMError('INVALID_ARGUMENT', `Invalid --min-sync-rating value: ${raw}`, {
      fix: 'Use a number between 0 and 100 for --min-sync-rating',
    });
  }
  return minRating;
}

function buildSyncQualitySummary(
  reportPath: string,
  rating: SyncRatingOutput,
  attempts: number
): SyncQualitySummary {
  return {
    reportPath,
    rating: rating.rating,
    ratingLabel: rating.ratingLabel,
    passed: rating.passed,
    meanDriftMs: rating.metrics.meanDriftMs,
    maxDriftMs: rating.metrics.maxDriftMs,
    matchRatio: rating.metrics.matchRatio,
    errorCount: rating.errors.length,
    attempts,
  };
}

type GeneratePipelineWithQualityGateParams = Parameters<typeof runGeneratePipeline>[0] & {
  artifactsDir: string;
};

interface GeneratePipelineWithQualityGateResult {
  result: PipelineResult;
  finalOptions: GenerateOptions;
  sync: SyncQualitySummary | null;
  exitCode: number;
}

async function runPipelineWithOptionalSyncQualityGate(
  params: GeneratePipelineWithQualityGateParams
): Promise<GeneratePipelineWithQualityGateResult> {
  if (!params.options.syncQualityCheck) {
    const result = await runGeneratePipeline(params);
    return { result, finalOptions: params.options, sync: null, exitCode: 0 };
  }

  const minRating = parseMinSyncRating(params.options);
  const initialSettings: SyncAttemptSettings = {
    pipelineMode: params.options.pipeline ?? 'standard',
    reconcile: Boolean(params.options.reconcile),
    whisperModel: params.options.whisperModel ?? 'base',
  };

  const autoRetry = Boolean(params.options.autoRetrySync);
  const config = {
    enabled: true,
    autoRetry,
    maxRetries: autoRetry ? 1 : 0,
  };

  const { rateSyncQuality } = await import('../../score/sync-rater');

  const runAttempt = async (settings: SyncAttemptSettings): Promise<PipelineResult> => {
    const attemptOptions: GenerateOptions = {
      ...params.options,
      pipeline: settings.pipelineMode,
      reconcile: settings.reconcile,
      whisperModel: settings.whisperModel,
    };

    const llmProvider = params.options.mock
      ? createMockLLMProvider(params.topic)
      : params.llmProvider;
    return runGeneratePipeline({ ...params, options: attemptOptions, llmProvider });
  };

  const rate = (videoPath: string): Promise<SyncRatingOutput> => {
    return rateSyncQuality(videoPath, {
      fps: 2,
      thresholds: {
        minRating,
        maxMeanDriftMs: 180,
        maxMaxDriftMs: 500,
        minMatchRatio: 0.7,
      },
      asrModel: params.options.whisperModel ?? 'base',
      mock: params.options.mock,
    });
  };

  const outcome = await runGenerateWithSyncQualityGate({
    initialSettings,
    config,
    runAttempt,
    rate,
  });

  const rating = outcome.rating;
  if (!rating) {
    return {
      result: outcome.pipelineResult,
      finalOptions: params.options,
      sync: null,
      exitCode: 0,
    };
  }

  const reportPath = await writeSyncQualityReportFiles(
    params.artifactsDir,
    rating,
    outcome.attemptHistory
  );

  const sync = buildSyncQualitySummary(reportPath, rating, outcome.attempts);
  const exitCode = sync.passed ? 0 : 1;

  const finalOptions: GenerateOptions = {
    ...params.options,
    pipeline: outcome.finalSettings.pipelineMode,
    reconcile: outcome.finalSettings.reconcile,
    whisperModel: outcome.finalSettings.whisperModel,
  };

  return { result: outcome.pipelineResult, finalOptions, sync, exitCode };
}

async function writeSyncQualityReportFiles(
  artifactsDir: string,
  rating: SyncRatingOutput,
  attemptHistory: Array<{ rating?: SyncRatingOutput }>
): Promise<string> {
  const reportPath = join(artifactsDir, 'sync-report.json');
  await writeOutputFile(reportPath, rating);

  for (let i = 0; i < attemptHistory.length; i++) {
    const attempt = attemptHistory[i];
    if (!attempt.rating) continue;
    await writeOutputFile(join(artifactsDir, `sync-report-attempt${i + 1}.json`), attempt.rating);
  }

  return reportPath;
}

async function finalizeGenerateOutput(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  result: PipelineResult;
  sync: SyncQualitySummary | null;
  exitCode: number;
}): Promise<void> {
  if (params.runtime.json) {
    writeSuccessJson({
      topic: params.topic,
      archetype: params.archetype,
      orientation: params.orientation,
      options: params.options,
      templateSpec: params.templateSpec,
      resolvedTemplateId: params.resolvedTemplateId,
      runtime: params.runtime,
      artifactsDir: params.artifactsDir,
      result: params.result,
      sync: params.sync,
      exitCode: params.exitCode,
    });
    return;
  }

  await showSuccessSummary(params.result, params.options, params.artifactsDir, params.sync);
  if (params.exitCode !== 0) process.exit(params.exitCode);
}

async function runGenerate(
  topic: string,
  options: GenerateOptions,
  command: Command
): Promise<void> {
  const runtime = getCliRuntime();
  const artifactsDir = dirname(options.output);

  applySyncPresetDefaults(options, command);
  const { resolvedTemplate, templateDefaults, templateParams, templateGameplay } =
    await resolveTemplateAndApplyDefaults(options, command);
  const templateSpec = toNullableString(options.template);
  const resolvedTemplateId = resolveTemplateId(resolvedTemplate);

  const templateGameplayPath = templateGameplay?.clip ?? templateGameplay?.library;
  if (!options.gameplay && templateGameplayPath) {
    options.gameplay = templateGameplayPath;
  }
  if (!options.gameplayStyle && templateGameplay?.style) {
    options.gameplayStyle = templateGameplay.style;
  }

  printHeader(topic, options, runtime);

  const archetype = ArchetypeEnum.parse(options.archetype);
  const orientation = OrientationEnum.parse(options.orientation);

  if (options.preflight) {
    const preflight = await runGeneratePreflight({
      topic,
      options,
      resolvedTemplate,
      templateGameplay,
      runtime,
    });
    writePreflightOutput({
      topic,
      options,
      runtime,
      templateSpec,
      resolvedTemplateId,
      checks: preflight.checks,
      passed: preflight.passed,
      exitCode: preflight.exitCode,
    });
    return;
  }

  if (
    handleDryRun({
      topic,
      options,
      runtime,
      artifactsDir,
      archetype,
      orientation,
      templateSpec,
      resolvedTemplateId,
    })
  )
    return;

  logger.info(
    {
      topic,
      archetype,
      orientation,
      template: resolvedTemplate?.template.id,
      templateSource: getTemplateSourceForLog(resolvedTemplate),
      fps: getLogFps(options),
      captionPreset: getCaptionPreset(options),
    },
    'Starting full pipeline'
  );

  const research = await loadOrRunResearch(options.research, topic, options.mock);
  reportResearchSummary(research, runtime);

  const llmProvider = createGenerateLlmProvider(topic, options, runtime);

  const gameplaySpecified = Boolean(options.gameplay);
  const gameplayStyleSpecified = Boolean(options.gameplayStyle);
  const gameplayStrictSource = command.getOptionValueSource('gameplayStrict');
  const gameplayStrict =
    gameplayStrictSource === 'default' ? undefined : Boolean(options.gameplayStrict);
  const templateRequired =
    templateGameplay?.required ?? Boolean(templateGameplay?.library || templateGameplay?.clip);

  const templateClip = !options.gameplay ? templateGameplay?.clip : undefined;
  const templateLibrary = !options.gameplay ? templateGameplay?.library : undefined;
  const gameplayRequested =
    gameplaySpecified || gameplayStyleSpecified || Boolean(gameplayStrict) || templateRequired;

  const gameplay = gameplayRequested
    ? {
        clip: templateClip,
        library: options.gameplay ?? templateLibrary,
        style: options.gameplayStyle ?? templateGameplay?.style,
        required: gameplayStrict ?? (gameplaySpecified ? true : templateRequired),
      }
    : undefined;

  if (gameplay) {
    options.gameplayStrict = gameplay.required;
  }

  const splitLayoutPreset = parseSplitLayoutPreset(options.splitLayout);
  if (splitLayoutPreset) {
    if (options.gameplayPosition == null) options.gameplayPosition = splitLayoutPreset.gameplayPosition;
    if (options.contentPosition == null) options.contentPosition = splitLayoutPreset.contentPosition;
  }

  const gameplayPosition = parseLayoutPosition(options.gameplayPosition, '--gameplay-position');
  const contentPosition = parseLayoutPosition(options.contentPosition, '--content-position');
  if (gameplayPosition) options.gameplayPosition = gameplayPosition;
  if (contentPosition) options.contentPosition = contentPosition;

  const { result, finalOptions, sync, exitCode } = await runPipelineWithOptionalSyncQualityGate({
    topic,
    archetype,
    orientation,
    options,
    resolvedTemplate,
    templateDefaults,
    templateParams,
    gameplay,
    research,
    llmProvider,
    runtime,
    artifactsDir,
  });

  await finalizeGenerateOutput({
    topic,
    archetype,
    orientation,
    options: finalOptions,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
    result,
    sync,
    exitCode,
  });
}

function createMockLLMProvider(topic: string): FakeLLMProvider {
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse(createMockScriptResponse(topic));
  return provider;
}

function showDryRunSummary(
  topic: string,
  options: GenerateOptions,
  archetype: string,
  orientation: string
): void {
  writeStderrLine('Dry-run mode - no execution');
  writeStderrLine(`   Topic: ${topic}`);
  writeStderrLine(`   Archetype: ${archetype}`);
  writeStderrLine(`   Orientation: ${orientation}`);
  writeStderrLine(`   Voice: ${options.voice}`);
  writeStderrLine(`   Duration: ${options.duration}s`);
  writeStderrLine(`   Output: ${options.output}`);
  writeStderrLine(`   Keep artifacts: ${options.keepArtifacts}`);
  writeStderrLine(`   Research: ${options.research ? 'enabled' : 'disabled'}`);
  writeStderrLine(
    `   Pipeline: ${options.pipeline ?? 'standard'}${options.pipeline === 'audio-first' ? ' (requires Whisper)' : ''}`
  );
  if (options.whisperModel) {
    writeStderrLine(`   Whisper Model: ${options.whisperModel}`);
  }
  if (options.captionGroupMs) {
    writeStderrLine(`   Caption Group: ${options.captionGroupMs}ms`);
  }
  if (options.reconcile) {
    writeStderrLine(`   Reconcile: enabled (match ASR to script)`);
  }
  if (options.captionMode) {
    writeStderrLine(`   Caption Mode: ${options.captionMode}`);
  }
  const wordsPerPage = options.wordsPerPage ?? options.captionMaxWords;
  if (wordsPerPage) {
    writeStderrLine(`   Caption Max Words: ${wordsPerPage}`);
  }
  if (options.captionMinWords) {
    writeStderrLine(`   Caption Min Words: ${options.captionMinWords}`);
  }
  if (options.captionTargetWords) {
    writeStderrLine(`   Caption Target Words: ${options.captionTargetWords}`);
  }
  if (options.captionMaxWpm) {
    writeStderrLine(`   Caption Max WPM: ${options.captionMaxWpm}`);
  }
  if (options.captionMaxCps) {
    writeStderrLine(`   Caption Max CPS: ${options.captionMaxCps}`);
  }
  if (options.captionMinOnScreenMs) {
    writeStderrLine(`   Caption Min On-Screen: ${options.captionMinOnScreenMs}ms`);
  }
  if (options.captionMinOnScreenMsShort) {
    writeStderrLine(`   Caption Min On-Screen (Short): ${options.captionMinOnScreenMsShort}ms`);
  }
  if (options.captionDropFillers) {
    writeStderrLine('   Caption Cleanup: drop fillers');
  }
  if (options.captionFillerWords) {
    writeStderrLine(`   Caption Filler Words: ${options.captionFillerWords}`);
  }
  if (options.maxLines) {
    writeStderrLine(`   Max Lines: ${options.maxLines}`);
  }
  if (options.charsPerLine) {
    writeStderrLine(`   Chars Per Line: ${options.charsPerLine}`);
  }
  if (options.captionAnimation) {
    writeStderrLine(`   Caption Animation: ${options.captionAnimation}`);
  }
  if (options.gameplay) {
    writeStderrLine(`   Gameplay: ${options.gameplay}`);
  }
  if (options.gameplayStyle) {
    writeStderrLine(`   Gameplay Style: ${options.gameplayStyle}`);
  }
  if (options.gameplayStrict) {
    writeStderrLine('   Gameplay Strict: enabled');
  }
  if (options.gameplayPosition) {
    writeStderrLine(`   Gameplay Position: ${options.gameplayPosition}`);
  }
  if (options.contentPosition) {
    writeStderrLine(`   Content Position: ${options.contentPosition}`);
  }
  writeStderrLine('   Pipeline stages:');
  if (options.research) {
    writeStderrLine('   0. Research -> research.json');
  }
  writeStderrLine('   1. Script -> script.json');
  writeStderrLine(
    `   2. Audio -> audio.wav + timestamps.json${options.pipeline === 'audio-first' ? ' (Whisper ASR required)' : ''}`
  );
  writeStderrLine('   3. Visuals -> visuals.json');
  writeStderrLine(`   4. Render -> ${options.output}`);
}

async function showSuccessSummary(
  result: PipelineResult,
  options: GenerateOptions,
  artifactsDir: string,
  sync: SyncQualitySummary | null
): Promise<void> {
  const title = sync && !sync.passed ? 'Video generated (sync failed)' : 'Video generated';
  const rows: Array<[string, string]> = [
    ['Title', result.script.title ?? options.topic],
    ['Duration', `${result.duration.toFixed(1)}s`],
    ['Resolution', `${result.width}x${result.height}`],
    ['Size', `${(result.fileSize / 1024 / 1024).toFixed(1)} MB`],
    ['Output', result.outputPath],
  ];
  if (result.visuals.gameplayClip) {
    rows.push(['Gameplay', result.visuals.gameplayClip.path]);
  }
  const lines = formatKeyValueRows(rows);

  if (result.costs) {
    lines.push(
      '',
      'Costs',
      ...formatKeyValueRows([
        ['Total', `$${result.costs.total.toFixed(4)}`],
        ['LLM', `$${result.costs.llm.toFixed(4)}`],
        ['TTS', `$${result.costs.tts.toFixed(4)}`],
      ])
    );
  }

  if (sync) {
    const status = sync.passed ? 'PASSED' : 'FAILED';
    lines.push(
      '',
      `Sync rating: ${sync.rating}/100 (${sync.ratingLabel}) - ${status} (attempts: ${sync.attempts})`,
      `Sync report: ${sync.reportPath}`
    );
  }

  if (options.keepArtifacts) {
    lines.push(
      '',
      'Artifacts',
      ...formatKeyValueRows([
        ['Script', join(artifactsDir, 'script.json')],
        ['Audio', join(artifactsDir, 'audio.wav')],
        ['Timestamps', join(artifactsDir, 'timestamps.json')],
        ['Visuals', join(artifactsDir, 'visuals.json')],
      ])
    );
  }

  const profile = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  await writeSummaryCard({
    title,
    lines,
    footerLines: [`Next: cm validate ${result.outputPath} --profile ${profile}`],
  });

  // Human-mode stdout should be reserved for the primary artifact path.
  process.stdout.write(`${result.outputPath}\n`);
}

/**
 * Load research from file or run new research
 */
async function loadOrRunResearch(
  researchOption: string | boolean | undefined,
  topic: string,
  mock: boolean
): Promise<ResearchOutput | undefined> {
  if (!researchOption) return undefined;

  // If it's a file path, load from file
  if (typeof researchOption === 'string') {
    const raw = await readInputFile(researchOption);
    const parsed = ResearchOutputSchema.safeParse(raw);
    if (!parsed.success) {
      throw new SchemaError('Invalid research file', {
        path: researchOption,
        issues: parsed.error.issues,
        fix: 'Generate research via `cm research -q "<topic>" -o research.json` and pass --research research.json',
      });
    }
    return parsed.data;
  }

  // If it's true (boolean flag), run research automatically
  const spinner = createSpinner('Stage 0/4: Researching topic...').start();

  const llmProvider = mock
    ? undefined
    : process.env.OPENAI_API_KEY
      ? new OpenAIProvider('gpt-4o-mini', process.env.OPENAI_API_KEY)
      : undefined;

  const orchestrator = createResearchOrchestrator(
    {
      sources: ['hackernews', 'reddit', 'tavily'],
      limitPerSource: 5,
      generateAngles: true,
      maxAngles: 3,
    },
    llmProvider
  );

  try {
    const result = await orchestrator.research(topic);
    spinner.succeed('Stage 0/4: Research complete');
    return result.output;
  } catch (error) {
    spinner.fail('Stage 0/4: Research failed');
    throw error;
  }
}

export const generateCommand = new Command('generate')
  .description('Generate a complete video from a topic')
  .argument('<topic>', 'Topic for the video')
  .option('-a, --archetype <type>', 'Content archetype', 'listicle')
  .option('--template <idOrPath>', 'Video template id or path to template.json')
  .option('-o, --output <path>', 'Output video file path', 'video.mp4')
  .option('--orientation <type>', 'Video orientation', 'portrait')
  .option('--fps <fps>', 'Frames per second', '30')
  .option(
    '--caption-preset <preset>',
    'Caption style preset (tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke)',
    'capcut'
  )
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--keep-artifacts', 'Keep intermediate files', false)
  .option('--research [path]', 'Use research (true = auto-run, or path to research.json)')
  .option(
    '--pipeline <mode>',
    'Pipeline mode: audio-first (default, requires Whisper) or standard',
    'audio-first'
  )
  .option(
    '--whisper-model <model>',
    'Whisper model size: tiny, base (default), small, medium (larger = more accurate but slower)'
  )
  .option(
    '--caption-group-ms <ms>',
    'Caption grouping window in milliseconds (default: 800, larger = fewer page transitions)'
  )
  .option('--reconcile', 'Reconcile ASR output to match original script text for cleaner captions')
  // Caption display options
  .option(
    '--caption-mode <mode>',
    'Caption display mode: page (default), single (one word at a time), buildup (accumulate per sentence), chunk (CapCut-style)'
  )
  .option(
    '--words-per-page <count>',
    'Words per caption page/group (default: 8 for larger sentences)'
  )
  .option('--caption-max-words <count>', 'Max words per chunk/page (alias of --words-per-page)')
  .option('--caption-min-words <count>', 'Min words per chunk/page')
  .option('--caption-target-words <count>', 'Target words per chunk (chunk mode)')
  .option('--caption-max-wpm <value>', 'Max words per minute for caption pacing')
  .option('--caption-max-cps <value>', 'Max characters per second for caption pacing')
  .option('--caption-min-on-screen-ms <ms>', 'Minimum on-screen time for captions (ms)')
  .option('--caption-min-on-screen-short-ms <ms>', 'Minimum on-screen time for short captions (ms)')
  .option('--caption-drop-fillers', 'Drop filler words from captions')
  .option('--caption-filler-words <list>', 'Comma-separated filler words/phrases to drop')
  .option(
    '--max-lines <count>',
    'Maximum lines per caption page (default: 2 for multi-line captions)'
  )
  .option(
    '--chars-per-line <count>',
    'Maximum characters per line before wrapping (default: 25, words never break mid-word)'
  )
  .option(
    '--caption-animation <animation>',
    'Caption animation: none (default), fade, slideUp, slideDown, pop, bounce'
  )
  .option('--gameplay <path>', 'Gameplay library directory or clip file path')
  .option('--gameplay-style <name>', 'Gameplay subfolder name (e.g., subway-surfers)')
  .option('--gameplay-strict', 'Fail if gameplay clip is missing')
  .option('--split-layout <layout>', 'Split-screen layout preset (gameplay-top, gameplay-bottom)')
  .option('--gameplay-position <pos>', 'Gameplay position (top, bottom, full)')
  .option('--content-position <pos>', 'Content position (top, bottom, full)')
  .option('--download-assets', 'Download remote visual assets into the render bundle', true)
  .option('--no-download-assets', 'Do not download remote assets (stream URLs directly)')
  // Sync quality options
  .option(
    '--sync-preset <preset>',
    'Sync quality preset: fast, standard, quality, maximum',
    'standard'
  )
  .option('--sync-quality-check', 'Run sync quality rating after render')
  .option('--min-sync-rating <rating>', 'Minimum acceptable sync rating (0-100)', '75')
  .option('--auto-retry-sync', 'Auto-retry with better strategy if rating fails')
  .option('--mock', 'Use mock providers (for testing)')
  .option('--dry-run', 'Preview configuration without execution')
  .option('--preflight', 'Validate dependencies and exit without execution')
  .action(async (topic: string, options: GenerateOptions, command: Command) => {
    try {
      await runGenerate(topic, options, command);
    } catch (error) {
      handleCommandError(error);
    }
  });
