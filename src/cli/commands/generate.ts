/**
 * Generate command - Full pipeline: topic -> video
 *
 * Usage: cm generate "Redis vs PostgreSQL" --archetype versus --output video.mp4
 *
 * This file contains the command definition and main orchestration.
 * Helpers are extracted into nearby modules:
 *   - generate-defaults.ts  – option parsing, resolution, and defaults
 *   - generate-output.ts    – display, JSON output, and summary formatting
 *   - generate-preflight.ts – preflight validation checks
 */
import { Command } from 'commander';
import type { PipelineResult } from '../../core/pipeline';
import { logger } from '../../core/logger';
import { OrientationEnum, type Archetype, type Orientation } from '../../core/config';
import { getOptionalApiKey, loadConfig } from '../../core/config';
import { formatArchetypeSource, resolveArchetype } from '../../archetypes/registry';
import { handleCommandError, readInputFile, writeOutputFile } from '../utils';
import type { LLMProvider } from '../../core/llm/provider';
import { createSpinner } from '../progress';
import { chalk } from '../colors';
import { getCliRuntime } from '../runtime';
import { writeStderrLine } from '../output';
import { parseTemplateDepsMode, resolveTemplateDepsInstallDecision } from '../template-code';
import { dirname, join, resolve } from 'path';
import { existsSync } from 'fs';
import { createResearchOrchestrator } from '../../research/orchestrator';
import { createLLMProvider } from '../../core/llm';
import { CMError, SchemaError } from '../../core/errors';
import { CliProgressObserver, PipelineEventEmitter, type PipelineEvent } from '../../core/events';
import { getCliErrorInfo } from '../format';
import {
  DEFAULT_ARTIFACT_FILENAMES,
  DEFAULT_SYNC_PRESET_ID,
  LLM_PROVIDERS,
} from '../../domain/repo-facts.generated';
import {
  formatTemplateSource,
  resolveRenderTemplate,
  getTemplateFontSources,
  getTemplateGameplaySlot,
  getTemplateOverlays,
  resolveRemotionTemplateProject,
  type ResolvedRemotionTemplateProject,
} from '../../render/templates';
import {
  AudioMixOutputSchema,
  AudioOutputSchema,
  OverlayAsset,
  ResearchOutputSchema,
  ScriptOutputSchema,
  TimestampsOutputSchema,
  VisualsOutputSchema,
  type AudioOutput,
  type CaptionQualityRatingOutput,
  type HookClip,
  type ResearchOutput,
  type ResearchSource,
  type ScriptOutput,
  type SyncRatingOutput,
  type VisualsOutput,
  type GenerationPolicy,
} from '../../domain';
import type { CaptionConfigInput } from '../../render/captions/config';
import { hasAudioMixSources } from '../../audio/mix/planner';
import { probeAudioWithFfprobe } from '../../validate/ffprobe-audio';
import type { CaptionPresetName } from '../../render/captions/presets';
import { resolveHookFromCli } from '../hooks';
import {
  runGenerateWithSyncQualityGate,
  type SyncAttemptSettings,
  type SyncQualitySummary,
} from './generate-quality';
import {
  runGenerateWithCaptionQualityGate,
  type CaptionAttemptSettings,
} from './caption-quality-gate';
import { resolveWorkflow, formatWorkflowSource } from '../../workflows/resolve';
import {
  collectWorkflowPostCommands,
  collectWorkflowPreCommands,
  runWorkflowCommands,
  workflowHasExec,
} from '../../workflows/runner';
import { analyzeVideoFrames, type AnalyzeVideoFramesResult } from '../../analysis/frame-analysis';

// -- Extracted modules -------------------------------------------------------
import {
  type GenerateOptions,
  type SyncPresetConfig,
  SYNC_PRESETS,
  parseOptionalInt,
  parseOptionalNumber,
  parseWordList,
  parseFontWeight,
  parseCaptionNotation,
  parseMinSyncRating,
  parseMinCaptionOverall,
  parseMaxCaptionRetries,
  parseFrameAnalysisMode,
  parseLayoutPosition,
  parseSplitLayoutPreset,
  collectList,
  parseVisualsProviderChain,
  parseProviderRoutingPolicy,
  loadGenerationPolicy,
  applyQualityDefaults,
  applySyncPresetDefaults,
  applyDefaultsFromConfig,
  applyCaptionQualityPerfectDefaults,
  applyPolicyDefaults,
  applyWorkflowDefaults,
  applyWorkflowInputs,
  applyWorkflowStageDefaults,
  resolveWorkflowStageModes,
  isExternalStageMode,
  resolveTemplateAndApplyDefaults,
  buildAudioMixOptions,
  mergeCaptionConfigPartials,
  mergeTemplateDefaultsCaptionConfig,
  type WorkflowStageModes,
} from './generate-defaults';
import {
  printHeader,
  writeDryRunJson,
  showDryRunSummary,
  writeSuccessJson,
  showSuccessSummary,
  buildSyncQualitySummary,
  buildCaptionQualitySummary,
  type CaptionQualitySummary,
} from './generate-output';
import { runGeneratePreflight, writePreflightOutput } from './generate-preflight';

// Re-export types that were previously exported from this file
export type { GenerateOptions, SyncPresetConfig };
export { SYNC_PRESETS };

const SYNC_PRESET_HELP = Object.keys(SYNC_PRESETS).join(', ');

/* ------------------------------------------------------------------ */
/*  Internal helpers (orchestration-only)                              */
/* ------------------------------------------------------------------ */

function normalizeWhisperModelForSync(
  model: GenerateOptions['whisperModel'] | undefined
): SyncAttemptSettings['whisperModel'] {
  if (!model) return 'base';
  if (model === 'large') return 'medium';
  return model;
}

function toNullableString(value: string | undefined): string | null {
  return value ?? null;
}

function resolveTemplateId(
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined
): string | null {
  return resolvedTemplate?.template.id ?? null;
}

function getTemplateSourceForLog(
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined
): string | undefined {
  return resolvedTemplate ? formatTemplateSource(resolvedTemplate) : undefined;
}

function getLogFps(options: GenerateOptions): number {
  return options.fps ? parseInt(options.fps, 10) : 30;
}

function getCaptionPreset(options: GenerateOptions): string {
  return options.captionPreset ?? 'capcut';
}

function handleDryRun(params: {
  topic: string;
  options: GenerateOptions;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  archetype: string;
  orientation: string;
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

async function createMockLLMProvider(topic: string): Promise<LLMProvider> {
  const { FakeLLMProvider } = await import('../../test/stubs/fake-llm');
  const { createMockScriptResponse } = await import('../../test/fixtures/mock-scenes.js');
  const provider = new FakeLLMProvider();
  provider.queueJsonResponse(createMockScriptResponse(topic));
  return provider;
}

async function createGenerateLlmProvider(
  topic: string,
  options: GenerateOptions,
  runtime: ReturnType<typeof getCliRuntime>
): Promise<LLMProvider | undefined> {
  if (!options.mock) return undefined;
  if (!runtime.json) writeStderrLine(chalk.yellow('Mock mode - using fake providers'));
  return createMockLLMProvider(topic);
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

/**
 * Load research from file or run new research
 */
async function loadOrRunResearch(
  researchOption: string | boolean | undefined,
  topic: string,
  mock: boolean
): Promise<ResearchOutput | undefined> {
  if (!researchOption) return undefined;

  const normalizedOption =
    typeof researchOption === 'string' ? researchOption.trim().toLowerCase() : researchOption;

  // Commander parses `--research true` as a string value ("true") because the option is `[path]`.
  // Accept common boolean string literals for convenience.
  if (normalizedOption === 'true') {
    researchOption = true;
  } else if (normalizedOption === 'false') {
    return undefined;
  }

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

  const sources: ResearchSource[] = ['hackernews', 'reddit'];
  if (process.env.BRAVE_SEARCH_API_KEY) sources.push('web');
  if (process.env.TAVILY_API_KEY) sources.push('tavily');

  let llmProvider = undefined;
  if (!mock) {
    const cfg = loadConfig();
    const providerId = cfg.llm.provider;
    const providerFacts = LLM_PROVIDERS.find((p) => p.id === providerId);
    const key = (providerFacts?.envVarNames ?? []).map((k) => getOptionalApiKey(k)).find(Boolean);
    if (key) {
      llmProvider = createLLMProvider(providerId, cfg.llm.model, key);
    }
  }

  const orchestrator = createResearchOrchestrator(
    {
      sources,
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

async function loadExternalPipelineInputs(options: GenerateOptions): Promise<{
  scriptInput?: ScriptOutput;
  audioInput?: AudioOutput;
  visualsInput?: VisualsOutput;
}> {
  let scriptInput: ScriptOutput | undefined;
  let timestampsInput: ReturnType<typeof TimestampsOutputSchema.parse> | undefined;
  let audioMixInput: ReturnType<typeof AudioMixOutputSchema.parse> | undefined;
  let audioInput: AudioOutput | undefined;
  let visualsInput: VisualsOutput | undefined;

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
    scriptInput = parsedScript.data;
  }

  if (options.timestamps) {
    const rawTimestamps = await readInputFile(options.timestamps);
    const parsedTimestamps = TimestampsOutputSchema.safeParse(rawTimestamps);
    if (!parsedTimestamps.success) {
      throw new SchemaError('Invalid timestamps file', {
        path: options.timestamps,
        issues: parsedTimestamps.error.issues,
        fix: 'Generate timestamps via `cm timestamps --audio <path>`',
      });
    }
    timestampsInput = parsedTimestamps.data;
  }

  if (options.audio) {
    if (!options.timestamps || !timestampsInput) {
      throw new CMError('INVALID_ARGUMENT', 'Audio requires a timestamps file', {
        fix: 'Provide --timestamps alongside --audio',
      });
    }
    if (options.audioMix) {
      const rawMix = await readInputFile(options.audioMix);
      const parsedMix = AudioMixOutputSchema.safeParse(rawMix);
      if (!parsedMix.success) {
        throw new SchemaError('Invalid audio mix file', {
          path: options.audioMix,
          issues: parsedMix.error.issues,
          fix: 'Generate via `cm audio --input script.json --audio-mix audio.mix.json`',
        });
      }
      audioMixInput = parsedMix.data;
    }
    if (!existsSync(options.audio)) {
      throw new CMError('FILE_NOT_FOUND', `Audio file not found: ${options.audio}`, {
        path: options.audio,
        fix: 'Provide a valid audio file path',
      });
    }

    let audioInfo: Awaited<ReturnType<typeof probeAudioWithFfprobe>> | undefined;
    try {
      audioInfo = await probeAudioWithFfprobe(options.audio);
    } catch (error) {
      logger.warn({ error, audio: options.audio }, 'Audio probe failed, using timestamps duration');
    }

    const duration = timestampsInput.totalDuration || audioInfo?.durationSeconds;
    if (!Number.isFinite(duration)) {
      throw new CMError('INVALID_ARGUMENT', 'Unable to determine audio duration', {
        fix: 'Ensure timestamps.json includes totalDuration',
      });
    }
    const sampleRate = audioInfo?.sampleRate ?? 48000;

    const parsedAudio = AudioOutputSchema.parse({
      audioPath: options.audio,
      timestampsPath: options.timestamps,
      timestamps: timestampsInput,
      duration,
      wordCount: timestampsInput.allWords.length,
      voice: 'external',
      sampleRate,
      audioMixPath: options.audioMix,
      audioMix: audioMixInput,
    });

    audioInput = parsedAudio;
  } else if (options.timestamps) {
    throw new CMError('INVALID_ARGUMENT', 'Timestamps provided without audio', {
      fix: 'Provide --audio alongside --timestamps',
    });
  }

  if (options.visuals) {
    const rawVisuals = await readInputFile(options.visuals);
    const parsedVisuals = VisualsOutputSchema.safeParse(rawVisuals);
    if (!parsedVisuals.success) {
      throw new SchemaError('Invalid visuals file', {
        path: options.visuals,
        issues: parsedVisuals.error.issues,
        fix: 'Generate visuals via `cm visuals --input timestamps.json`',
      });
    }
    visualsInput = parsedVisuals.data;
  }

  return { scriptInput, audioInput, visualsInput };
}

function assertWorkflowStageInputs(params: {
  stageModes: WorkflowStageModes;
  scriptInput?: ScriptOutput;
  audioInput?: AudioOutput;
  visualsInput?: VisualsOutput;
}): void {
  const { stageModes, scriptInput, audioInput, visualsInput } = params;

  if (isExternalStageMode(stageModes.render)) {
    throw new CMError(
      'INVALID_ARGUMENT',
      'Workflow render stages are not supported in cm generate',
      {
        fix: 'Remove render stage overrides or use `cm render` with your artifacts',
      }
    );
  }

  if (isExternalStageMode(stageModes.script) && !scriptInput) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow script stage requires an input script', {
      fix: 'Provide --script or set workflow.inputs.script',
    });
  }

  if (isExternalStageMode(stageModes.audio) && !audioInput) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow audio stage requires audio + timestamps', {
      fix: 'Provide --audio and --timestamps, or set workflow.inputs.audio/timestamps',
    });
  }

  if (isExternalStageMode(stageModes.visuals) && !visualsInput) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow visuals stage requires an input visuals file', {
      fix: 'Provide --visuals or set workflow.inputs.visuals',
    });
  }
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
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>> | undefined;
  remotionProject: ResolvedRemotionTemplateProject | null;
  allowTemplateCode?: boolean;
  installTemplateDeps?: boolean;
  templateDepsAllowOutput?: boolean;
  templatePackageManager?: 'npm' | 'pnpm' | 'yarn';
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof import('../../render/templates').getTemplateParams>;
  templateOverlays: OverlayAsset[];
  gameplay?: { library?: string; style?: string; required?: boolean };
  hook?: HookClip | null;
  research: ResearchOutput | undefined;
  blueprint?: import('../../videointel/schema').VideoBlueprintV1;
  llmProvider: LLMProvider | undefined;
  runtime: ReturnType<typeof getCliRuntime>;
  scriptInput?: ScriptOutput;
  audioInput?: AudioOutput;
  visualsInput?: VisualsOutput;
}): Promise<PipelineResult> {
  const { eventEmitter, dispose } = createPipelineObservation(params.runtime);

  try {
    const { runPipeline } = await import('../../core/pipeline');
    const wordsPerPage = params.options.wordsPerPage ?? params.options.captionMaxWords ?? undefined;
    const captionFillerWords = parseWordList(params.options.captionFillerWords);
    const captionDropFillers =
      params.options.captionDropFillers || (captionFillerWords && captionFillerWords.length > 0)
        ? true
        : undefined;
    const captionDropListMarkers = params.options.captionDropListMarkers ? true : undefined;
    const captionFontWeight = parseFontWeight(params.options.captionFontWeight) ?? undefined;
    const requestedDuration = parseOptionalNumber(params.options.duration) ?? 45;
    const hookDuration = params.hook?.duration ?? 0;
    const targetDuration =
      !params.scriptInput && hookDuration > 0
        ? Math.max(1, requestedDuration - hookDuration)
        : requestedDuration;
    if (!params.scriptInput && hookDuration > 0 && targetDuration !== requestedDuration) {
      logger.info(
        { requestedDuration, hookDuration, targetDuration },
        'Adjusted script target duration to account for hook'
      );
    }
    const mixOptions = buildAudioMixOptions(params.options);
    const hasMixSources = hasAudioMixSources(mixOptions);
    const artifactsDir = dirname(params.options.output);
    const audioMixOutputPath =
      params.options.audioMix ?? join(artifactsDir, DEFAULT_ARTIFACT_FILENAMES['audio-mix']);
    const audioMixRequest =
      params.audioInput || (!hasMixSources && !params.options.audioMix)
        ? undefined
        : {
            outputPath: audioMixOutputPath,
            options: mixOptions,
            emitEmpty: Boolean(params.options.audioMix) && !hasMixSources,
          };

    const mockRenderMode: 'placeholder' | 'real' | undefined =
      params.options.mock &&
      (params.options.captionPerfect || params.options.captionQualityCheck) &&
      !params.options.captionQualityMock
        ? 'real'
        : undefined;

    const config = loadConfig();
    const visualsProviderChain = parseVisualsProviderChain({
      providerRaw: params.options.visualsProvider ?? config.visuals?.provider,
      fallbackRaw: params.options.visualsFallbackProviders,
      configFallbacks: Array.isArray(config.visuals?.fallbackProviders)
        ? (config.visuals?.fallbackProviders as string[])
        : [],
    });
    const visualsRoutingPolicy = parseProviderRoutingPolicy(params.options.visualsRoutingPolicy);
    const visualsMaxGenerationCostUsd =
      parseOptionalNumber(params.options.visualsMaxGenerationCostUsd) ?? undefined;
    const visualsGateMaxFallbackRate =
      parseOptionalNumber(params.options.visualsGateMaxFallbackRate) ?? undefined;
    const visualsGateMinProviderSuccessRate =
      parseOptionalNumber(params.options.visualsGateMinProviderSuccessRate) ?? undefined;
    const visualsRoutingAdaptiveWindow =
      parseOptionalInt(params.options.visualsRoutingAdaptiveWindow) ?? undefined;
    const visualsRoutingAdaptiveMinRecords =
      parseOptionalInt(params.options.visualsRoutingAdaptiveMinRecords) ?? undefined;
    const mergedCaptionConfig = mergeCaptionConfigPartials(
      config.captions.config as CaptionConfigInput | undefined,
      (params.templateDefaults?.captionConfig as CaptionConfigInput | undefined) ?? undefined
    );

    return await runPipeline({
      topic: params.topic,
      archetype: params.archetype as Archetype,
      orientation: params.orientation as 'portrait' | 'landscape' | 'square',
      voice: params.options.voice,
      visualsProvider: visualsProviderChain[0],
      visualsProviders: visualsProviderChain,
      visualsRoutingPolicy,
      visualsMaxGenerationCostUsd,
      visualsPolicyGates: {
        enforce: Boolean(params.options.visualsGateEnforce),
        maxFallbackRate: visualsGateMaxFallbackRate,
        minProviderSuccessRate: visualsGateMinProviderSuccessRate,
      },
      visualsRoutingAdaptiveWindow,
      visualsRoutingAdaptiveMinRecords,
      media: {
        enabled: params.options.media,
        extractVideoKeyframes: params.options.mediaKeyframes,
        synthesizeImageMotion: params.options.mediaSynthesizeMotion,
        outputDir: params.options.mediaDir,
        ffmpegPath: params.options.mediaFfmpeg,
        adapterByMotionStrategy: {
          depthflow: params.options.mediaDepthflowAdapter,
          veo: params.options.mediaVeoAdapter,
        },
      },
      targetDuration,
      outputPath: params.options.output,
      fps: params.options.fps ? parseInt(params.options.fps, 10) : undefined,
      compositionId: params.resolvedTemplate?.template.compositionId,
      allowTemplateCode: params.allowTemplateCode,
      installTemplateDeps: params.installTemplateDeps,
      templateDepsAllowOutput: params.templateDepsAllowOutput,
      templatePackageManager: params.templatePackageManager,
      remotionEntryPoint: params.remotionProject?.entryPoint,
      remotionRootDir: params.remotionProject?.rootDir,
      remotionPublicDir: params.remotionProject?.publicDir,
      templateId: params.resolvedTemplate?.template.id,
      templateSource: params.resolvedTemplate
        ? formatTemplateSource(params.resolvedTemplate)
        : undefined,
      templateParams: (params.resolvedTemplate?.template.params ?? undefined) as
        | Record<string, unknown>
        | undefined,
      overlays: params.templateOverlays.length > 0 ? params.templateOverlays : undefined,
      captionPreset: params.options.captionPreset as CaptionPresetName | undefined,
      captionConfig: mergedCaptionConfig,
      keepArtifacts: params.options.keepArtifacts,
      llmProvider: params.llmProvider,
      mock: params.options.mock,
      mockRenderMode,
      research: params.research,
      blueprint: params.blueprint,
      eventEmitter,
      pipelineMode: params.options.pipeline ?? 'standard',
      whisperModel: params.options.whisperModel,
      hook: params.hook ?? undefined,
      captionGroupMs: params.options.captionGroupMs
        ? parseInt(params.options.captionGroupMs, 10)
        : undefined,
      reconcile: params.options.reconcile,
      captionMode: params.options.captionMode,
      captionNotation: parseCaptionNotation(params.options.captionNotation),
      wordsPerPage: wordsPerPage ? parseInt(wordsPerPage, 10) : undefined,
      captionMinWords: parseOptionalInt(params.options.captionMinWords) ?? undefined,
      captionTargetWords: parseOptionalInt(params.options.captionTargetWords) ?? undefined,
      captionMaxWpm: parseOptionalNumber(params.options.captionMaxWpm) ?? undefined,
      captionMaxCps: parseOptionalNumber(params.options.captionMaxCps) ?? undefined,
      captionMinOnScreenMs: parseOptionalInt(params.options.captionMinOnScreenMs) ?? undefined,
      captionMinOnScreenMsShort:
        parseOptionalInt(params.options.captionMinOnScreenMsShort) ?? undefined,
      captionDropFillers,
      captionDropListMarkers,
      captionFillerWords,
      captionFontFamily: params.options.captionFontFamily ?? undefined,
      captionFontWeight,
      captionFontFile: params.options.captionFontFile ?? undefined,
      captionFonts: params.options.captionFonts,
      maxLinesPerPage: params.options.maxLines ? parseInt(params.options.maxLines, 10) : undefined,
      maxCharsPerLine: params.options.charsPerLine
        ? parseInt(params.options.charsPerLine, 10)
        : undefined,
      captionAnimation: params.options.captionAnimation,
      captionWordAnimation: params.options.captionWordAnimation,
      captionWordAnimationMs: parseOptionalInt(params.options.captionWordAnimationMs) ?? undefined,
      captionWordAnimationIntensity:
        parseOptionalNumber(params.options.captionWordAnimationIntensity) ?? undefined,
      captionOffsetMs: parseOptionalInt(params.options.captionOffsetMs) ?? undefined,
      gameplay: params.gameplay,
      splitScreenRatio: params.templateParams.splitScreenRatio,
      gameplayPosition: params.options.gameplayPosition ?? params.templateParams.gameplayPosition,
      contentPosition: params.options.contentPosition ?? params.templateParams.contentPosition,
      downloadAssets: params.options.downloadAssets !== false,
      audioMix: audioMixRequest,
      scriptInput: params.scriptInput,
      audioInput: params.audioInput,
      visualsInput: params.visualsInput,
    });
  } finally {
    dispose();
  }
}

async function runAutoFrameAnalysis(
  options: GenerateOptions,
  outputPath: string
): Promise<AnalyzeVideoFramesResult | null> {
  if (options.frameAnalysis === false) return null;
  const fpsRaw = Number.parseFloat(String(options.frameAnalysisFps ?? '1'));
  if (!Number.isFinite(fpsRaw) || fpsRaw <= 0 || fpsRaw > 1) {
    throw new CMError(
      'INVALID_ARGUMENT',
      `Invalid --frame-analysis-fps value: ${String(options.frameAnalysisFps)}`,
      { fix: 'Use a number > 0 and <= 1' }
    );
  }
  const shots = Number.parseInt(String(options.frameAnalysisShots ?? '30'), 10);
  if (!Number.isFinite(shots) || shots < 1) {
    throw new CMError(
      'INVALID_ARGUMENT',
      `Invalid --frame-analysis-shots value: ${String(options.frameAnalysisShots)}`,
      { fix: 'Use an integer >= 1' }
    );
  }
  const segments = Number.parseInt(String(options.frameAnalysisSegments ?? '5'), 10);
  if (!Number.isFinite(segments) || segments < 1) {
    throw new CMError(
      'INVALID_ARGUMENT',
      `Invalid --frame-analysis-segments value: ${String(options.frameAnalysisSegments)}`,
      { fix: 'Use an integer >= 1' }
    );
  }
  return analyzeVideoFrames({
    inputVideo: outputPath,
    outputRootDir: options.frameAnalysisOutput ?? 'output/analysis',
    mode: parseFrameAnalysisMode(options.frameAnalysisMode ?? 'both'),
    fps: fpsRaw,
    shots,
    segments,
  });
}

type GeneratePipelineWithQualityGateParams = Parameters<typeof runGeneratePipeline>[0] & {
  artifactsDir: string;
};

interface GeneratePipelineWithQualityGateResult {
  result: PipelineResult;
  finalOptions: GenerateOptions;
  sync: SyncQualitySummary | null;
  caption: CaptionQualitySummary | null;
  exitCode: number;
}

async function runPipelineWithOptionalSyncQualityGate(
  params: GeneratePipelineWithQualityGateParams
): Promise<GeneratePipelineWithQualityGateResult> {
  let result: PipelineResult;
  let finalOptions: GenerateOptions = params.options;
  let sync: SyncQualitySummary | null = null;
  let caption: CaptionQualitySummary | null = null;
  let exitCode = 0;

  if (!params.options.syncQualityCheck) {
    result = await runGeneratePipeline(params);
  } else {
    const minRating = parseMinSyncRating(params.options);
    const initialSettings: SyncAttemptSettings = {
      pipelineMode: params.options.pipeline ?? 'standard',
      reconcile: Boolean(params.options.reconcile),
      whisperModel: normalizeWhisperModelForSync(params.options.whisperModel),
    };

    const autoRetryRequested = Boolean(params.options.autoRetrySync);
    const autoRetry = params.audioInput ? false : autoRetryRequested;
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
        ? await createMockLLMProvider(params.topic)
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
        asrModel: normalizeWhisperModelForSync(params.options.whisperModel),
        mock: params.options.mock,
      });
    };

    const outcome = await runGenerateWithSyncQualityGate({
      initialSettings,
      config,
      runAttempt,
      rate,
    });

    result = outcome.pipelineResult;

    const rating = outcome.rating;
    if (rating) {
      const reportPath = await writeSyncQualityReportFiles(
        params.artifactsDir,
        rating,
        outcome.attemptHistory
      );
      sync = buildSyncQualitySummary(reportPath, rating, outcome.attempts);
      if (!sync.passed) exitCode = 1;
    }

    finalOptions = {
      ...params.options,
      pipeline: outcome.finalSettings.pipelineMode,
      reconcile: outcome.finalSettings.reconcile,
      whisperModel: outcome.finalSettings.whisperModel,
    };
  }

  if (params.options.captionQualityCheck) {
    const minOverallScore = parseMinCaptionOverall(params.options);
    const autoRetry = Boolean(params.options.autoRetryCaptions);
    const config = {
      enabled: true,
      autoRetry,
      maxRetries: autoRetry ? parseMaxCaptionRetries(params.options) : 0,
      minOverallScore,
    };

    const baseInputs = {
      scriptInput: result.script,
      audioInput: result.audio,
      visualsInput: result.visuals,
    };

    const wordsPerPage = finalOptions.wordsPerPage ?? finalOptions.captionMaxWords;

    const initialCaptionSettings: CaptionAttemptSettings = {
      captionPreset: finalOptions.captionPreset as CaptionPresetName | undefined,
      captionMode: finalOptions.captionMode ?? undefined,
      wordsPerPage: wordsPerPage ? parseInt(wordsPerPage, 10) : undefined,
      captionTargetWords: parseOptionalInt(finalOptions.captionTargetWords) ?? undefined,
      captionMinWords: parseOptionalInt(finalOptions.captionMinWords) ?? undefined,
      captionMaxWpm: parseOptionalNumber(finalOptions.captionMaxWpm) ?? undefined,
      captionGroupMs: finalOptions.captionGroupMs
        ? parseInt(finalOptions.captionGroupMs, 10)
        : undefined,
      captionConfigOverrides: {},
      maxLinesPerPage: finalOptions.maxLines ? parseInt(finalOptions.maxLines, 10) : undefined,
      maxCharsPerLine: finalOptions.charsPerLine
        ? parseInt(finalOptions.charsPerLine, 10)
        : undefined,
      captionMaxCps: parseOptionalNumber(finalOptions.captionMaxCps) ?? undefined,
      captionMinOnScreenMs: parseOptionalInt(finalOptions.captionMinOnScreenMs) ?? undefined,
      captionMinOnScreenMsShort:
        parseOptionalInt(finalOptions.captionMinOnScreenMsShort) ?? undefined,
    };

    const { rateCaptionQuality } = await import('../../score/sync-rater');

    const rerender = async (settings: CaptionAttemptSettings): Promise<PipelineResult> => {
      const attemptOptions: GenerateOptions = { ...finalOptions };
      if (settings.captionPreset) attemptOptions.captionPreset = settings.captionPreset;
      if (settings.captionMode) attemptOptions.captionMode = settings.captionMode;
      if (settings.wordsPerPage !== undefined)
        attemptOptions.wordsPerPage = String(settings.wordsPerPage);
      if (settings.captionTargetWords !== undefined)
        attemptOptions.captionTargetWords = String(settings.captionTargetWords);
      if (settings.captionMinWords !== undefined)
        attemptOptions.captionMinWords = String(settings.captionMinWords);
      if (settings.captionMaxWpm !== undefined)
        attemptOptions.captionMaxWpm = String(settings.captionMaxWpm);
      if (settings.captionGroupMs !== undefined)
        attemptOptions.captionGroupMs = String(settings.captionGroupMs);
      if (settings.maxLinesPerPage !== undefined)
        attemptOptions.maxLines = String(settings.maxLinesPerPage);
      if (settings.maxCharsPerLine !== undefined)
        attemptOptions.charsPerLine = String(settings.maxCharsPerLine);
      if (settings.captionMaxCps !== undefined)
        attemptOptions.captionMaxCps = String(settings.captionMaxCps);
      if (settings.captionMinOnScreenMs !== undefined) {
        attemptOptions.captionMinOnScreenMs = String(settings.captionMinOnScreenMs);
      }
      if (settings.captionMinOnScreenMsShort !== undefined) {
        attemptOptions.captionMinOnScreenMsShort = String(settings.captionMinOnScreenMsShort);
      }

      const templateDefaults = mergeTemplateDefaultsCaptionConfig(
        params.templateDefaults,
        settings.captionConfigOverrides
      );

      const llmProvider = params.options.mock
        ? await createMockLLMProvider(params.topic)
        : params.llmProvider;

      return runGeneratePipeline({
        ...params,
        options: attemptOptions,
        templateDefaults,
        llmProvider,
        ...baseInputs,
      });
    };

    const rate = (videoPath: string): Promise<CaptionQualityRatingOutput> => {
      return rateCaptionQuality(videoPath, {
        fps: 2,
        captionRegion: { yRatio: 0.65, heightRatio: 0.35 },
        mock: Boolean(params.options.captionQualityMock),
      });
    };

    const outcome = await runGenerateWithCaptionQualityGate({
      initialPipelineResult: result,
      initialSettings: initialCaptionSettings,
      config,
      rerender,
      rate,
    });

    result = outcome.pipelineResult;

    const rating = outcome.rating;
    if (rating) {
      const reportPath = await writeCaptionQualityReportFiles(
        params.artifactsDir,
        rating,
        outcome.attemptHistory
      );
      caption = buildCaptionQualitySummary(reportPath, rating, outcome.attempts, minOverallScore);
      if (!caption.passed) exitCode = 1;
    }
  }

  return { result, finalOptions, sync, caption, exitCode };
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

async function writeCaptionQualityReportFiles(
  artifactsDir: string,
  rating: CaptionQualityRatingOutput,
  attemptHistory: Array<{ rating?: CaptionQualityRatingOutput; settings?: unknown }>
): Promise<string> {
  const reportPath = join(artifactsDir, 'caption-report.json');
  await writeOutputFile(reportPath, rating);

  for (let i = 0; i < attemptHistory.length; i++) {
    const attempt = attemptHistory[i];
    if (!attempt.rating) continue;
    await writeOutputFile(
      join(artifactsDir, `caption-report-attempt${i + 1}.json`),
      attempt.rating
    );
    if (attempt.settings) {
      await writeOutputFile(
        join(artifactsDir, `caption-settings-attempt${i + 1}.json`),
        attempt.settings
      );
    }
  }

  const lastAttempt = attemptHistory[attemptHistory.length - 1];
  if (lastAttempt?.settings) {
    await writeOutputFile(join(artifactsDir, 'caption-settings.json'), lastAttempt.settings);
  }

  return reportPath;
}

async function writeResolvedTemplateArtifact(params: {
  artifactsDir: string;
  resolvedTemplate: Awaited<ReturnType<typeof resolveRenderTemplate>>;
  templateDefaults: Record<string, unknown> | undefined;
  templateParams: ReturnType<typeof import('../../render/templates').getTemplateParams>;
  templateGameplay: ReturnType<typeof getTemplateGameplaySlot>;
  templateFonts: import('../../domain').FontSource[];
  templateOverlays: OverlayAsset[];
  options: GenerateOptions;
}): Promise<string> {
  const outPath = join(params.artifactsDir, 'template.resolved.json');
  await writeOutputFile(outPath, {
    schemaVersion: '1.0.0',
    templateSpec: params.options.template ?? null,
    resolved: {
      id: params.resolvedTemplate.template.id,
      name: params.resolvedTemplate.template.name,
      description: params.resolvedTemplate.template.description ?? null,
      compositionId: params.resolvedTemplate.template.compositionId,
      source: formatTemplateSource(params.resolvedTemplate),
      templatePath: params.resolvedTemplate.templatePath ?? null,
      templateDir: params.resolvedTemplate.templateDir ?? null,
      templateSchemaVersion: params.resolvedTemplate.template.schemaVersion,
      defaults: params.resolvedTemplate.template.defaults ?? null,
      params: params.resolvedTemplate.template.params ?? null,
      assets: params.resolvedTemplate.template.assets ?? null,
      remotion: params.resolvedTemplate.template.remotion ?? null,
    },
    derived: {
      templateDefaults: params.templateDefaults ?? null,
      templateParams: params.templateParams,
      templateGameplay: params.templateGameplay,
      templateFonts: params.templateFonts,
      templateOverlays: params.templateOverlays,
    },
    effective: {
      archetype: params.options.archetype ?? null,
      orientation: params.options.orientation ?? null,
      fps: params.options.fps ?? null,
      captionPreset: params.options.captionPreset ?? null,
      captionFontFamily: params.options.captionFontFamily ?? null,
      captionFontWeight: params.options.captionFontWeight ?? null,
      captionFontFile: params.options.captionFontFile ?? null,
    },
  });
  return outPath;
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
  caption: CaptionQualitySummary | null;
  frameAnalysis: AnalyzeVideoFramesResult | null;
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
      caption: params.caption,
      frameAnalysis: params.frameAnalysis,
      exitCode: params.exitCode,
    });
    return;
  }

  await showSuccessSummary(
    params.result,
    params.options,
    params.artifactsDir,
    params.sync,
    params.caption,
    params.frameAnalysis,
    params.topic
  );
  if (params.exitCode !== 0) process.exit(params.exitCode);
}

/* ------------------------------------------------------------------ */
/*  Main orchestration                                                 */
/* ------------------------------------------------------------------ */

async function runGenerate(
  topic: string,
  options: GenerateOptions,
  command: Command
): Promise<void> {
  const runtime = getCliRuntime();
  const artifactsDir = dirname(options.output);

  applyDefaultsFromConfig(options, command);
  applyQualityDefaults(options, command);
  applySyncPresetDefaults(options, command);
  applyCaptionQualityPerfectDefaults(options, command);
  let resolvedWorkflow: Awaited<ReturnType<typeof resolveWorkflow>> | undefined;
  let workflowError: ReturnType<typeof getCliErrorInfo> | null = null;

  if (options.workflow) {
    try {
      resolvedWorkflow = await resolveWorkflow(options.workflow);
    } catch (error) {
      workflowError = getCliErrorInfo(error);
      if (!options.preflight) {
        throw error;
      }
    }
  }

  const workflowDefinition = resolvedWorkflow?.workflow;
  const workflowBaseDir = resolvedWorkflow?.baseDir;
  const workflowStageModes = resolveWorkflowStageModes(workflowDefinition);
  let generationPolicy: GenerationPolicy | undefined;

  // Apply workflow defaults before template defaults so templates can override workflows.
  applyWorkflowDefaults(options, command, workflowDefinition, new Set(['workflowAllowExec']));
  applyWorkflowInputs(options, command, workflowDefinition, workflowBaseDir);
  applyWorkflowStageDefaults(options, workflowStageModes, artifactsDir);
  if (options.policy) {
    generationPolicy = await loadGenerationPolicy(
      resolve(workflowBaseDir ?? process.cwd(), options.policy)
    );
  }
  applyPolicyDefaults(options, command, generationPolicy);

  const { resolvedTemplate, templateDefaults, templateParams, templateGameplay, templateOverlays } =
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

  const resolvedArchetype = await resolveArchetype(options.archetype);
  const archetype = resolvedArchetype.archetype.id;
  const orientation = OrientationEnum.parse(options.orientation);
  if (!runtime.json) {
    writeStderrLine(
      chalk.gray(`Archetype resolved: ${archetype} (${formatArchetypeSource(resolvedArchetype)})`)
    );
  }

  if (options.preflight) {
    const preflight = await runGeneratePreflight({
      topic,
      options,
      resolvedTemplate,
      templateGameplay,
      runtime,
      command,
      resolvedWorkflow,
      workflowError,
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

  if (isExternalStageMode(workflowStageModes.render)) {
    throw new CMError(
      'INVALID_ARGUMENT',
      'Workflow render stages are not supported in cm generate',
      {
        fix: 'Remove render stage overrides or use `cm render` with your artifacts',
      }
    );
  }

  const remotionProject = resolvedTemplate
    ? resolveRemotionTemplateProject(resolvedTemplate)
    : null;
  let allowTemplateCode: boolean | undefined;
  let installTemplateDeps: boolean | undefined;
  let templatePackageManager: 'npm' | 'pnpm' | 'yarn' | undefined;

  if (remotionProject) {
    const config = loadConfig();

    const allowTemplateCodeSource = command.getOptionValueSource('allowTemplateCode');
    allowTemplateCode =
      allowTemplateCodeSource === 'default' || allowTemplateCodeSource === undefined
        ? Boolean(config.render.allowTemplateCode)
        : Boolean(options.allowTemplateCode);

    if (!allowTemplateCode) {
      throw new CMError('INVALID_ARGUMENT', 'Code templates require --allow-template-code', {
        templateId: resolvedTemplate?.template.id,
        templateDir: remotionProject.templateDir,
        fix: 'Re-run with --allow-template-code to allow executing template-provided Remotion code',
      });
    }

    const templateDepsSource = command.getOptionValueSource('templateDeps');
    const templateDepsRaw =
      templateDepsSource === 'default' || templateDepsSource === undefined
        ? (remotionProject.installDeps ?? config.render.templateDeps)
        : options.templateDeps;
    const templateDepsMode = parseTemplateDepsMode(templateDepsRaw ?? 'prompt');

    const templatePmSource = command.getOptionValueSource('templatePm');
    const templatePmRaw =
      templatePmSource === 'default' || templatePmSource === undefined
        ? (remotionProject.packageManager ?? config.render.templatePackageManager)
        : options.templatePm;
    const templatePmValue = templatePmRaw ? String(templatePmRaw) : undefined;
    templatePackageManager =
      templatePmValue === 'npm' || templatePmValue === 'pnpm' || templatePmValue === 'yarn'
        ? templatePmValue
        : undefined;

    const templateHasPackageJson = existsSync(join(remotionProject.rootDir, 'package.json'));
    const templateHasNodeModules = existsSync(join(remotionProject.rootDir, 'node_modules'));
    const templateDepsMissing = templateHasPackageJson && !templateHasNodeModules;
    installTemplateDeps = templateDepsMissing
      ? await resolveTemplateDepsInstallDecision({
          runtime,
          rootDir: remotionProject.rootDir,
          mode: templateDepsMode ?? 'prompt',
        })
      : false;

    if (templateDepsMissing && runtime.offline && templateDepsMode === 'auto') {
      throw new CMError(
        'OFFLINE',
        'Offline mode enabled; cannot auto-install template dependencies',
        {
          rootDir: remotionProject.rootDir,
          fix: 'Re-run without --offline, or pass --template-deps never and install dependencies manually if needed',
        }
      );
    }
  }

  if (workflowDefinition && workflowHasExec(workflowDefinition) && !options.workflowAllowExec) {
    throw new CMError('INVALID_ARGUMENT', 'Workflow exec hooks require --workflow-allow-exec', {
      fix: 'Re-run with --workflow-allow-exec to allow workflow commands',
    });
  }

  if (workflowDefinition && workflowHasExec(workflowDefinition) && options.workflowAllowExec) {
    const preCommands = collectWorkflowPreCommands(workflowDefinition);
    if (preCommands.length > 0) {
      logger.info({ count: preCommands.length }, 'Running workflow commands');
      await runWorkflowCommands(preCommands, {
        baseDir: workflowBaseDir,
        allowOutput: !runtime.json,
      });
    }
  }

  const { scriptInput, audioInput, visualsInput } = await loadExternalPipelineInputs(options);
  assertWorkflowStageInputs({
    stageModes: workflowStageModes,
    scriptInput,
    audioInput,
    visualsInput,
  });

  if (audioInput && options.autoRetrySync) {
    options.autoRetrySync = false;
  }

  const hook = await resolveHookFromCli(options);
  if (!options.hook && hook) {
    options.hook = hook.id ?? hook.path;
  }

  logger.info(
    {
      topic,
      archetype,
      orientation,
      template: resolvedTemplate?.template.id,
      policy: options.policy,
      templateSource: getTemplateSourceForLog(resolvedTemplate),
      workflow: resolvedWorkflow?.workflow.id,
      workflowSource: resolvedWorkflow ? formatWorkflowSource(resolvedWorkflow) : undefined,
      fps: getLogFps(options),
      captionPreset: getCaptionPreset(options),
      hook: hook?.id ?? hook?.path ?? null,
    },
    'Starting full pipeline'
  );

  const research = scriptInput
    ? undefined
    : await loadOrRunResearch(options.research, topic, options.mock);
  reportResearchSummary(research, runtime);

  let blueprint;
  if (options.blueprint && !scriptInput) {
    const { VideoBlueprintV1Schema } = await import('../../domain');
    const blueprintRaw = await readInputFile(options.blueprint);
    const blueprintParsed = VideoBlueprintV1Schema.safeParse(blueprintRaw);
    if (!blueprintParsed.success) {
      throw new SchemaError('Invalid blueprint file', {
        path: options.blueprint,
        issues: blueprintParsed.error.issues,
        fix: 'Generate a blueprint via `cm blueprint --input videospec.v1.json -o blueprint.v1.json`',
      });
    }
    blueprint = blueprintParsed.data;
    logger.info(
      { archetype: blueprint.archetype, sceneSlots: blueprint.scene_slots.length },
      'Loaded blueprint constraints'
    );
  }

  const llmProvider = await createGenerateLlmProvider(topic, options, runtime);

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
    if (options.gameplayPosition == null)
      options.gameplayPosition = splitLayoutPreset.gameplayPosition;
    if (options.contentPosition == null)
      options.contentPosition = splitLayoutPreset.contentPosition;
  }

  const gameplayPosition = parseLayoutPosition(options.gameplayPosition, '--gameplay-position');
  const contentPosition = parseLayoutPosition(options.contentPosition, '--content-position');
  if (gameplayPosition) options.gameplayPosition = gameplayPosition;
  if (contentPosition) options.contentPosition = contentPosition;

  const { result, finalOptions, sync, caption, exitCode } =
    await runPipelineWithOptionalSyncQualityGate({
      topic,
      archetype,
      orientation,
      options,
      resolvedTemplate,
      remotionProject,
      allowTemplateCode,
      installTemplateDeps,
      templateDepsAllowOutput: runtime.verbose,
      templatePackageManager,
      templateDefaults,
      templateParams,
      templateOverlays,
      gameplay,
      hook,
      research,
      blueprint,
      llmProvider,
      runtime,
      artifactsDir,
      scriptInput,
      audioInput,
      visualsInput,
    });

  let frameAnalysis: AnalyzeVideoFramesResult | null = null;
  try {
    frameAnalysis = await runAutoFrameAnalysis(finalOptions, result.outputPath);
  } catch (error) {
    logger.warn(
      { error: getCliErrorInfo(error), videoPath: result.outputPath },
      'Automatic frame analysis failed'
    );
    if (!runtime.json) {
      writeStderrLine(
        chalk.yellow(
          `Frame analysis skipped: ${getCliErrorInfo(error).message ?? 'unexpected error'}`
        )
      );
    }
  }

  if (options.keepArtifacts && resolvedTemplate) {
    const templateFonts = getTemplateFontSources(
      resolvedTemplate.template,
      resolvedTemplate.templateDir
    );
    const templateOverlays = getTemplateOverlays(
      resolvedTemplate.template,
      resolvedTemplate.templateDir
    );
    await writeResolvedTemplateArtifact({
      artifactsDir,
      resolvedTemplate,
      templateDefaults,
      templateParams,
      templateGameplay,
      templateFonts,
      templateOverlays,
      options,
    });
  }

  if (workflowDefinition && workflowHasExec(workflowDefinition) && options.workflowAllowExec) {
    const postCommands = collectWorkflowPostCommands(workflowDefinition);
    if (postCommands.length > 0) {
      logger.info({ count: postCommands.length }, 'Running workflow post commands');
      await runWorkflowCommands(postCommands, {
        baseDir: workflowBaseDir,
        allowOutput: !runtime.json,
      });
    }
  }

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
    caption,
    frameAnalysis,
    exitCode,
  });
}

/* ------------------------------------------------------------------ */
/*  Command definition                                                 */
/* ------------------------------------------------------------------ */

export const generateCommand = new Command('generate')
  .description('Generate a complete video from a topic')
  .argument('<topic>', 'Topic for the video')
  .option(
    '-a, --archetype <idOrPath>',
    'Script archetype (script format). Use `cm archetypes list`',
    'listicle'
  )
  .option(
    '--template <idOrPath>',
    'Render template (Remotion composition + render defaults). Use `cm templates list`'
  )
  .option('--policy <path>', 'Generation policy JSON file (cross-stage orchestration policy)')
  .option('--allow-template-code', 'Allow executing Remotion code templates (dangerous)', false)
  .option(
    '--template-deps <mode>',
    'Template dependency install mode for code templates (auto, prompt, never)'
  )
  .option('--template-pm <pm>', 'Template package manager (npm, pnpm, yarn)')
  .option(
    '--workflow <idOrPath>',
    'Pipeline workflow (orchestration + defaults). Use `cm workflows list`'
  )
  .option('--workflow-allow-exec', 'Allow workflow exec hooks to run')
  .option(
    '--script <path>',
    `Use existing ${DEFAULT_ARTIFACT_FILENAMES.script} (skip script stage)`
  )
  .option('--audio <path>', 'Use existing audio file (requires --timestamps)')
  .option('--audio-mix <path>', 'Use existing audio mix plan (optional)')
  .option(
    '--timestamps <path>',
    `Use existing ${DEFAULT_ARTIFACT_FILENAMES.timestamps} (use with --audio)`
  )
  .option(
    '--visuals <path>',
    `Use existing ${DEFAULT_ARTIFACT_FILENAMES.visuals} (skip visuals stage)`
  )
  .option(
    '--visuals-provider <providerOrChain>',
    'Visuals provider or provider chain (e.g., pexels or pexels,local,nanobanana)'
  )
  .option(
    '--visuals-fallback-providers <providers>',
    'Comma-separated fallback providers appended to --visuals-provider when provider is a single value'
  )
  .option(
    '--visuals-routing-policy <policy>',
    'Visuals provider routing policy (configured|balanced|cost-first|quality-first)'
  )
  .option(
    '--visuals-max-generation-cost-usd <amount>',
    'Hard cap for AI image generation spend during visuals stage (USD)'
  )
  .option('--visuals-gate-enforce', 'Fail generate if configured visuals policy gates fail', false)
  .option(
    '--visuals-gate-max-fallback-rate <0..1>',
    'Post-stage gate: maximum allowed fallback asset rate'
  )
  .option(
    '--visuals-gate-min-provider-success-rate <0..1>',
    'Post-stage gate: minimum allowed provider success rate'
  )
  .option(
    '--visuals-routing-adaptive-window <n>',
    'Adaptive routing: number of recent telemetry records to inspect'
  )
  .option(
    '--visuals-routing-adaptive-min-records <n>',
    'Adaptive routing: minimum telemetry records before recommendation is trusted'
  )
  .option(
    '--media',
    'Enable media synthesis stage (image-to-video for depthflow/veo + video keyframes)'
  )
  .option('--no-media-keyframes', 'Disable media-stage video keyframe extraction')
  .option(
    '--no-media-synthesize-motion',
    'Disable media-stage image-to-video synthesis for depthflow/veo scenes'
  )
  .option('--media-dir <path>', 'Directory for generated media-stage artifacts')
  .option('--media-ffmpeg <path>', 'ffmpeg executable path for media stage')
  .option('--media-depthflow-adapter <id>', 'Adapter id for depthflow image-to-video synthesis')
  .option('--media-veo-adapter <id>', 'Adapter id for veo image-to-video synthesis')
  .option('-o, --output <path>', 'Output video file path', DEFAULT_ARTIFACT_FILENAMES.video)
  .option('--orientation <type>', 'Video orientation', 'portrait')
  .option('--fps <fps>', 'Frames per second', '30')
  .option(
    '--caption-preset <preset>',
    'Caption style preset (tiktok, youtube, reels, bold, minimal, neon, capcut, hormozi, karaoke)',
    'capcut'
  )
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
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
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--keep-artifacts', 'Keep intermediate files', false)
  .option('--research [path]', 'Use research (true = auto-run, or path to research.json)')
  .option(
    '--blueprint <path>',
    'VideoBlueprint JSON file for structural constraints (from cm blueprint)'
  )
  .option(
    '--pipeline <mode>',
    'Pipeline mode: audio-first (default, requires Whisper) or standard',
    'audio-first'
  )
  .option(
    '--whisper-model <model>',
    'Whisper model size: tiny, base (default), small, medium, large (larger = more accurate but slower)'
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
    '--caption-notation <mode>',
    'Caption notation mode: none (default) or unicode (render math/symbol notation)'
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
  .option('--caption-drop-list-markers', 'Drop list markers like "1:" from captions')
  .option('--caption-filler-words <list>', 'Comma-separated filler words/phrases to drop')
  .option('--caption-font-family <name>', 'Caption font family (e.g., Inter)')
  .option('--caption-font-weight <weight>', 'Caption font weight (normal, bold, black, 100-900)')
  .option('--caption-font-file <path>', 'Caption font file to bundle (ttf/otf/woff/woff2)')
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
  .option(
    '--caption-word-animation <animation>',
    'Active word animation: none (default), pop, bounce, rise, shake'
  )
  .option('--caption-word-animation-ms <ms>', 'Active word animation duration in ms')
  .option('--caption-word-animation-intensity <value>', 'Active word animation intensity (0..1)')
  .option(
    '--caption-offset-ms <ms>',
    'Global caption timing offset in ms (negative = earlier captions)'
  )
  .option('--gameplay <path>', 'Gameplay library directory or clip file path')
  .option('--gameplay-style <name>', 'Gameplay subfolder name (e.g., subway-surfers)')
  .option('--gameplay-strict', 'Fail if gameplay clip is missing')
  .option('--split-layout <layout>', 'Split-screen layout preset (gameplay-top, gameplay-bottom)')
  .option('--gameplay-position <pos>', 'Gameplay position (top, bottom, full)')
  .option('--content-position <pos>', 'Content position (top, bottom, full)')
  .option('--hook <idOrPath>', 'Hook intro clip id, path, or URL (use "none" to disable)')
  .option('--no-hook', 'Disable hook intro clip')
  .option('--hook-library <name>', 'Hook library id (defaults to config)')
  .option('--hooks-dir <path>', 'Root directory for hook libraries')
  .option('--hook-duration <seconds>', 'Hook duration when ffprobe is unavailable')
  .option('--hook-trim <seconds>', 'Trim hook to N seconds (optional)')
  .option('--hook-audio <mode>', 'Hook audio mode (mute, keep)')
  .option('--hook-fit <mode>', 'Hook fit mode (cover, contain)')
  .option('--download-hook', 'Download missing hook clips')
  .option('--download-assets', 'Download remote visual assets into the render bundle', true)
  .option('--no-download-assets', 'Do not download remote assets (stream URLs directly)')
  .option('--frame-analysis', 'Run automatic frame analysis after render', true)
  .option('--no-frame-analysis', 'Skip automatic frame analysis after render')
  .option('--frame-analysis-mode <mode>', 'Frame analysis mode (fps, shots, both)', 'both')
  .option('--frame-analysis-fps <value>', 'Frame analysis FPS sampling rate (> 0 and <= 1)', '1')
  .option('--frame-analysis-shots <count>', 'Frame analysis evenly spaced shot count', '30')
  .option('--frame-analysis-segments <count>', 'Frame analysis timeline segment count', '5')
  .option(
    '--frame-analysis-output <dir>',
    'Frame analysis output root directory',
    'output/analysis'
  )
  .option(
    '--quality',
    'Enable higher-quality defaults (slower): audio-first sync + reconcile + post-render sync/caption quality gates'
  )
  // Sync quality options
  .option(
    '--sync-preset <preset>',
    `Sync quality preset: ${SYNC_PRESET_HELP}`,
    DEFAULT_SYNC_PRESET_ID
  )
  .option('--sync-quality-check', 'Run sync quality rating after render')
  .option('--min-sync-rating <rating>', 'Minimum acceptable sync rating (0-100)', '75')
  .option('--auto-retry-sync', 'Auto-retry with better strategy if rating fails')
  // Caption quality options (OCR-only)
  .option('--caption-quality-check', 'Run burned-in caption quality rating after render (OCR-only)')
  .option(
    '--caption-perfect',
    'Keep retrying caption tuning until captions are excellent (enables caption quality gate)'
  )
  .option('--caption-quality-mock', 'Use mock caption quality scoring (no OCR)')
  .option(
    '--min-caption-overall <score>',
    'Minimum acceptable caption overall score (0..1 or 0..100)',
    '0.75'
  )
  .option('--auto-retry-captions', 'Auto-retry render with caption tuning if caption quality fails')
  .option('--max-caption-retries <count>', 'Maximum number of caption tuning retries (0-100)', '2')
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
