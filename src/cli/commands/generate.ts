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
import { handleCommandError, readInputFile } from '../utils';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { createMockScriptResponse } from '../../test/fixtures/mock-scenes.js';
import { createSpinner } from '../progress';
import chalk from 'chalk';
import { getCliRuntime } from '../runtime';
import { buildJsonEnvelope, writeJsonEnvelope, writeStderrLine } from '../output';
import { dirname, join } from 'path';
import { ResearchOutputSchema } from '../../research/schema';
import type { ResearchOutput } from '../../research/schema';
import { createResearchOrchestrator } from '../../research/orchestrator';
import { OpenAIProvider } from '../../core/llm/openai';
import { SchemaError } from '../../core/errors';
import { CliProgressObserver, PipelineEventEmitter, type PipelineEvent } from '../../core/events';
import { formatTemplateSource, resolveVideoTemplate } from '../../render/templates';
import type { CaptionConfig } from '../../render/schema';
import type { CaptionPresetName } from '../../render/captions/presets';

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
  /** Standard: standard pipeline with basic quality check */
  standard: {
    pipeline: 'standard',
    reconcile: false,
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
  captionMode?: 'page' | 'single' | 'buildup';
  /** Words per caption page/group (default: 8) */
  wordsPerPage?: string;
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
        voice: options.voice,
        durationSeconds: options.duration,
        output: options.output,
        keepArtifacts: options.keepArtifacts,
        dryRun: true,
      },
      outputs: { dryRun: true, artifactsDir },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
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
        voice: options.voice,
        durationSeconds: options.duration,
        output: options.output,
        keepArtifacts: options.keepArtifacts,
        mock: options.mock,
      },
      outputs: {
        videoPath: result.outputPath,
        durationSeconds: result.duration,
        width: result.width,
        height: result.height,
        fps: result.render.fps,
        fileSizeBytes: result.fileSize,
        artifactsDir,
        costs: result.costs ?? null,
      },
      timingsMs: Date.now() - runtime.startTime,
    })
  );
  process.exit(0);
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
}> {
  if (!options.template) {
    return { resolvedTemplate: undefined, templateDefaults: undefined };
  }

  const resolvedTemplate = await resolveVideoTemplate(options.template);
  const templateDefaults = (resolvedTemplate.template.defaults ?? {}) as Record<string, unknown>;

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

  return { resolvedTemplate, templateDefaults };
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
  research: ResearchOutput | undefined;
  llmProvider: FakeLLMProvider | undefined;
  runtime: ReturnType<typeof getCliRuntime>;
}): Promise<PipelineResult> {
  const { eventEmitter, dispose } = createPipelineObservation(params.runtime);

  try {
    const { runPipeline } = await import('../../core/pipeline');
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
      wordsPerPage: params.options.wordsPerPage
        ? parseInt(params.options.wordsPerPage, 10)
        : undefined,
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
  return options.captionPreset ?? 'tiktok';
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

function finalizeGenerateOutput(params: {
  topic: string;
  archetype: string;
  orientation: string;
  options: GenerateOptions;
  templateSpec: string | null;
  resolvedTemplateId: string | null;
  runtime: ReturnType<typeof getCliRuntime>;
  artifactsDir: string;
  result: PipelineResult;
}): void {
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
    });
    return;
  }

  showSuccessSummary(params.result, params.options, params.artifactsDir);
}

async function runGenerate(
  topic: string,
  options: GenerateOptions,
  command: Command
): Promise<void> {
  const runtime = getCliRuntime();
  const artifactsDir = dirname(options.output);

  applySyncPresetDefaults(options, command);
  const { resolvedTemplate, templateDefaults } = await resolveTemplateAndApplyDefaults(
    options,
    command
  );
  const templateSpec = toNullableString(options.template);
  const resolvedTemplateId = resolveTemplateId(resolvedTemplate);

  printHeader(topic, options, runtime);

  const archetype = ArchetypeEnum.parse(options.archetype);
  const orientation = OrientationEnum.parse(options.orientation);

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

  const result = await runGeneratePipeline({
    topic,
    archetype,
    orientation,
    options,
    resolvedTemplate,
    templateDefaults,
    research,
    llmProvider,
    runtime,
  });

  finalizeGenerateOutput({
    topic,
    archetype,
    orientation,
    options,
    templateSpec,
    resolvedTemplateId,
    runtime,
    artifactsDir,
    result,
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
  if (options.wordsPerPage) {
    writeStderrLine(`   Words Per Page: ${options.wordsPerPage}`);
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

function showSuccessSummary(
  result: PipelineResult,
  options: GenerateOptions,
  artifactsDir: string
): void {
  writeStderrLine(chalk.green.bold('Video generated successfully!'));
  writeStderrLine(`   Title: ${result.script.title}`);
  writeStderrLine(`   Duration: ${result.duration.toFixed(1)}s`);
  writeStderrLine(`   Resolution: ${result.width}x${result.height}`);
  writeStderrLine(`   Size: ${(result.fileSize / 1024 / 1024).toFixed(1)} MB`);
  if (result.costs) {
    writeStderrLine(chalk.gray(`   API Costs: $${result.costs.total.toFixed(4)}`));
    writeStderrLine(chalk.gray(`      - LLM: $${result.costs.llm.toFixed(4)}`));
    writeStderrLine(chalk.gray(`      - TTS: $${result.costs.tts.toFixed(4)}`));
  }

  if (options.keepArtifacts) {
    writeStderrLine(chalk.gray('Artifacts:'));
    writeStderrLine(chalk.gray(`   Script: ${join(artifactsDir, 'script.json')}`));
    writeStderrLine(chalk.gray(`   Audio: ${join(artifactsDir, 'audio.wav')}`));
    writeStderrLine(chalk.gray(`   Timestamps: ${join(artifactsDir, 'timestamps.json')}`));
    writeStderrLine(chalk.gray(`   Visuals: ${join(artifactsDir, 'visuals.json')}`));
  }

  const profile = options.orientation === 'landscape' ? 'landscape' : 'portrait';
  writeStderrLine(chalk.gray(`Next: cm validate ${result.outputPath} --profile ${profile}`));

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
    'Caption style preset (tiktok, youtube, reels, bold, minimal, neon)',
    'tiktok'
  )
  .option('--voice <voice>', 'TTS voice to use', 'af_heart')
  .option('--duration <seconds>', 'Target duration in seconds', '45')
  .option('--keep-artifacts', 'Keep intermediate files', false)
  .option('--research [path]', 'Use research (true = auto-run, or path to research.json)')
  .option(
    '--pipeline <mode>',
    'Pipeline mode: standard (default) or audio-first (requires Whisper)',
    'standard'
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
    'Caption display mode: page (default), single (one word at a time), buildup (accumulate per sentence)'
  )
  .option(
    '--words-per-page <count>',
    'Words per caption page/group (default: 8 for larger sentences)'
  )
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
  .action(async (topic: string, options: GenerateOptions, command: Command) => {
    try {
      await runGenerate(topic, options, command);
    } catch (error) {
      handleCommandError(error);
    }
  });
