/**
 * Pipeline Orchestration
 *
 * Coordinates the full video generation pipeline:
 * topic -> script -> audio -> visuals -> render -> video
 */
import { mkdir, writeFile, copyFile, rm } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { performance } from 'perf_hooks';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import type { LLMProvider } from './llm/provider';
import { ResearchOutputSchema } from '../domain';
import type {
  AudioOutput,
  MediaManifest,
  RenderOutput,
  ResearchOutput,
  ScriptOutput,
  VisualsOutput,
} from '../domain';
import type { CaptionPresetName } from '../render/captions/presets';
import type { CaptionConfigInput } from '../render/captions/config';
import type { FontSource, HookClip, OverlayAsset } from '../domain';
import type { ProviderRoutingPolicy } from '../visuals/provider-router';
import type { AssetProviderName } from '../visuals/providers';
import type { PipelineEventEmitter } from './events';
import type { AudioMixPlanOptions } from '../audio/mix/planner';
import { createLogger, logTiming } from './logger';
import { PipelineError } from './errors';
import { DEFAULT_ARTIFACT_FILENAMES } from '../domain/repo-facts.generated';
import {
  ArchetypeEnum,
  OrientationEnum,
  loadConfig,
  type Archetype,
  type Orientation,
} from './config';
import type { TemplateId } from '../domain/ids';

export type PipelineStage = 'script' | 'audio' | 'visuals' | 'render';

export interface PipelineOptions {
  topic: string;
  archetype: Archetype;
  orientation: Orientation;
  voice: string;
  ttsEngine?: 'kokoro' | 'edge' | 'elevenlabs';
  asrEngine?: 'whisper' | 'elevenlabs-forced-alignment';
  targetDuration: number;
  outputPath: string;
  keepArtifacts?: boolean;
  workDir?: string;
  onProgress?: (stage: PipelineStage, message: string) => void;
  llmProvider?: LLMProvider;
  /** Use mock mode for testing without real API calls */
  mock?: boolean;
  /** Mock render mode: placeholder (fast) or real (renders actual video) */
  mockRenderMode?: 'placeholder' | 'real';
  /** Pipeline mode: standard (whisper optional) or audio-first (whisper required) */
  pipelineMode?: 'standard' | 'audio-first';
  /** Whisper model size */
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  /** Reconcile ASR output to script text */
  reconcile?: boolean;
  /** Optional research output to inject into script stage */
  research?: ResearchOutput;
  /** Optional event emitter for pipeline progress */
  eventEmitter?: PipelineEventEmitter;
  /** Optional audio mix plan generation */
  audioMix?: {
    outputPath: string;
    options: AudioMixPlanOptions;
    emitEmpty?: boolean;
  };
  /** Render options */
  fps?: number;
  compositionId?: string;
  captionPreset?: CaptionPresetName;
  captionConfig?: CaptionConfigInput;
  captionGroupMs?: number;
  captionMode?: 'page' | 'single' | 'buildup' | 'chunk';
  wordsPerPage?: number;
  captionMinWords?: number;
  captionTargetWords?: number;
  captionMaxWpm?: number;
  captionMaxCps?: number;
  captionMinOnScreenMs?: number;
  captionMinOnScreenMsShort?: number;
  captionDropFillers?: boolean;
  captionDropListMarkers?: boolean;
  captionFillerWords?: string[];
  captionAnimation?: 'none' | 'fade' | 'slideUp' | 'slideDown' | 'pop' | 'bounce';
  captionWordAnimation?: 'none' | 'pop' | 'bounce' | 'rise' | 'shake';
  captionWordAnimationMs?: number;
  captionWordAnimationIntensity?: number;
  captionOffsetMs?: number;
  captionFontFamily?: string;
  captionFontWeight?: number | 'normal' | 'bold' | 'black';
  captionFontFile?: string;
  captionFonts?: FontSource[];
  overlays?: OverlayAsset[];
  maxLinesPerPage?: number;
  maxCharsPerLine?: number;
  /** Visuals + layout options */
  visualsProvider?: AssetProviderName;
  visualsProviders?: AssetProviderName[];
  visualsRoutingPolicy?: ProviderRoutingPolicy | 'adaptive';
  visualsMaxGenerationCostUsd?: number;
  visualsPolicyGates?: {
    enforce?: boolean;
    maxFallbackRate?: number;
    minProviderSuccessRate?: number;
  };
  visualsRoutingAdaptiveWindow?: number;
  visualsRoutingAdaptiveMinRecords?: number;
  gameplay?: { library?: string; style?: string; required?: boolean };
  splitScreenRatio?: number;
  gameplayPosition?: 'top' | 'bottom' | 'full';
  contentPosition?: 'top' | 'bottom' | 'full';
  downloadAssets?: boolean;
  hook?: HookClip;
  /** External artifacts */
  scriptInput?: ScriptOutput;
  audioInput?: AudioOutput;
  visualsInput?: VisualsOutput;
  mediaManifestInput?: MediaManifest;
  media?: {
    enabled?: boolean;
    extractVideoKeyframes?: boolean;
    synthesizeImageMotion?: boolean;
    outputDir?: string;
    ffmpegPath?: string;
    adapterByMotionStrategy?: {
      depthflow?: string;
      veo?: string;
    };
  };

  // ---------------------------------------------------------------------------
  // Remotion code templates / custom projects (optional)
  // ---------------------------------------------------------------------------
  allowTemplateCode?: boolean;
  installTemplateDeps?: boolean;
  templateDepsAllowOutput?: boolean;
  templatePackageManager?: 'npm' | 'pnpm' | 'yarn';
  remotionEntryPoint?: string;
  remotionRootDir?: string;
  remotionPublicDir?: string;
  remotionEnableCaching?: boolean;
  remotionExtraModules?: string[];
  templateId?: TemplateId;
  templateSource?: string;
  templateParams?: Record<string, unknown>;
}

export const PipelineConfigSchema = z
  .object({
    topic: z.string().min(1),
    archetype: ArchetypeEnum,
    orientation: OrientationEnum,
    voice: z.string().min(1),
    targetDuration: z.number().positive(),
    outputPath: z.string().min(1),
    research: ResearchOutputSchema.optional(),
  })
  .passthrough();

export interface PipelineResult {
  script: ScriptOutput;
  audio: AudioOutput;
  visuals: VisualsOutput;
  media?: MediaManifest;
  render: RenderOutput;
  outputPath: string;
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  costs?: {
    llm: number;
    tts: number;
    total: number;
  };
}

const STAGES: PipelineStage[] = ['script', 'audio', 'visuals', 'render'];

function normalizeWhisperModel(
  model: string | undefined
): 'tiny' | 'base' | 'small' | 'medium' | 'large' {
  switch (model) {
    case 'tiny':
    case 'base':
    case 'small':
    case 'medium':
    case 'large':
      return model;
    default:
      return 'base';
  }
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function shouldAutoEnableMediaStage(visuals: VisualsOutput): boolean {
  return visuals.scenes.some(
    (scene) =>
      scene.assetType === 'image' &&
      scene.motionStrategy !== undefined &&
      scene.motionStrategy !== 'none' &&
      scene.motionStrategy !== 'kenburns'
  );
}

async function writeJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const content = JSON.stringify(data, null, 2);
  await writeFile(path, content, 'utf-8');
}

async function copyFileSafe(sourcePath: string, destPath: string): Promise<boolean> {
  const resolvedSource = resolve(sourcePath);
  const resolvedDest = resolve(destPath);
  if (resolvedSource === resolvedDest) return false;
  await mkdir(dirname(resolvedDest), { recursive: true });
  await copyFile(resolvedSource, resolvedDest);
  return true;
}

function emitStageProgress(params: {
  emitter: PipelineEventEmitter | undefined;
  pipelineId: string;
  stage: PipelineStage;
  stageIndex: number;
  totalStages: number;
  phase?: string;
  progress: number;
  message?: string;
}): void {
  const { emitter } = params;
  if (!emitter) return;
  emitter.emit({
    type: 'stage:progress',
    timestamp: Date.now(),
    pipelineId: params.pipelineId,
    stage: params.stage,
    stageIndex: params.stageIndex,
    totalStages: params.totalStages,
    phase: params.phase,
    progress: clampProgress(params.progress),
    message: params.message,
  });
}

function wrapStageError(stage: PipelineStage, error: unknown): PipelineError {
  if (error instanceof PipelineError) return error;
  const message = error instanceof Error ? error.message : String(error);
  return new PipelineError(
    stage,
    `${stage} stage failed: ${message}`,
    error instanceof Error ? error : undefined
  );
}

/**
 * Run the full video generation pipeline
 */
// eslint-disable-next-line max-lines-per-function
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const log = createLogger({ pipeline: 'main', topic: options.topic });
  const config = loadConfig();
  const workDir = options.workDir ?? dirname(options.outputPath);
  const pipelineId = randomUUID();
  const totalStages = STAGES.length;
  const startTime = performance.now();
  const eventEmitter = options.eventEmitter;

  const pipelineMode = options.pipelineMode ?? config.sync.strategy ?? 'standard';
  const requireWhisper = pipelineMode === 'audio-first' || config.sync.requireWhisper;
  const whisperModel = normalizeWhisperModel(options.whisperModel ?? config.sync.asrModel);
  const reconcile = options.reconcile ?? config.sync.reconcileToScript;

  const captionDefaults = config.captions;
  const defaultCaptionFamily =
    captionDefaults.fonts.length > 0 ? captionDefaults.fonts[0].family : captionDefaults.fontFamily;

  const artifacts = {
    script: join(workDir, DEFAULT_ARTIFACT_FILENAMES.script),
    audio: join(workDir, DEFAULT_ARTIFACT_FILENAMES.audio),
    timestamps: join(workDir, DEFAULT_ARTIFACT_FILENAMES.timestamps),
    audioMix: join(workDir, DEFAULT_ARTIFACT_FILENAMES['audio-mix']),
    visuals: join(workDir, DEFAULT_ARTIFACT_FILENAMES.visuals),
    mediaManifest: join(workDir, 'media-manifest.json'),
  };

  const generatedPaths = new Set<string>();
  const costs = { llm: 0, tts: 0, total: 0 };
  let renderAttempted = false;

  await mkdir(workDir, { recursive: true });

  if (eventEmitter) {
    eventEmitter.emit({
      type: 'pipeline:started',
      timestamp: Date.now(),
      pipelineId,
      topic: options.topic,
      archetype: options.archetype,
    });
  }

  try {
    // Stage 1: Script generation
    const script = await (async () => {
      const stage = 'script' as const;
      const stageIndex = STAGES.indexOf(stage);
      eventEmitter?.emit({
        type: 'stage:started',
        timestamp: Date.now(),
        pipelineId,
        stage,
        stageIndex,
        totalStages,
      });

      const stageStart = performance.now();
      try {
        options.onProgress?.(stage, 'Generating script...');

        if (options.scriptInput) {
          if (options.keepArtifacts) {
            await writeJson(artifacts.script, options.scriptInput);
          }
          options.onProgress?.(stage, 'Script ready');
          const durationMs = Math.round(performance.now() - stageStart);
          eventEmitter?.emit({
            type: 'stage:completed',
            timestamp: Date.now(),
            pipelineId,
            stage,
            stageIndex,
            totalStages,
            durationMs,
            cost: { estimatedCost: options.scriptInput.meta?.llmCost },
          });
          return options.scriptInput;
        }

        const { generateScript } = await import('../script/generator');
        log.info('Starting Stage 1: Script generation');
        const result = await logTiming(
          'script-generation',
          () =>
            generateScript({
              topic: options.topic,
              archetype: options.archetype,
              targetDuration: options.targetDuration,
              llmProvider: options.llmProvider,
              research: options.research,
            }),
          log
        );

        if (options.keepArtifacts) {
          await writeJson(artifacts.script, result);
        }

        options.onProgress?.(stage, 'Script generated');
        const durationMs = Math.round(performance.now() - stageStart);
        eventEmitter?.emit({
          type: 'stage:completed',
          timestamp: Date.now(),
          pipelineId,
          stage,
          stageIndex,
          totalStages,
          durationMs,
          cost: { estimatedCost: result.meta?.llmCost },
        });
        return result;
      } catch (error) {
        const wrapped = wrapStageError(stage, error);
        eventEmitter?.emit({
          type: 'stage:failed',
          timestamp: Date.now(),
          pipelineId,
          stage,
          stageIndex,
          totalStages,
          error: wrapped,
        });
        throw wrapped;
      }
    })();

    if (script.meta?.llmCost) {
      costs.llm += script.meta.llmCost;
    }

    // Stage 2: Audio generation
    const audio = await (async () => {
      const stage = 'audio' as const;
      const stageIndex = STAGES.indexOf(stage);
      eventEmitter?.emit({
        type: 'stage:started',
        timestamp: Date.now(),
        pipelineId,
        stage,
        stageIndex,
        totalStages,
      });

      const stageStart = performance.now();
      try {
        options.onProgress?.(stage, 'Generating audio...');

        if (options.audioInput) {
          let audioResult = options.audioInput;
          if (options.keepArtifacts) {
            await copyFileSafe(audioResult.audioPath, artifacts.audio);
            await writeJson(artifacts.timestamps, audioResult.timestamps);
            if (audioResult.audioMixPath) {
              await copyFileSafe(audioResult.audioMixPath, artifacts.audioMix);
            }
            audioResult = {
              ...audioResult,
              audioPath: artifacts.audio,
              timestampsPath: artifacts.timestamps,
              audioMixPath: audioResult.audioMixPath ? artifacts.audioMix : undefined,
            };
          }

          options.onProgress?.(stage, 'Audio ready');
          const durationMs = Math.round(performance.now() - stageStart);
          eventEmitter?.emit({
            type: 'stage:completed',
            timestamp: Date.now(),
            pipelineId,
            stage,
            stageIndex,
            totalStages,
            durationMs,
            cost: { estimatedCost: audioResult.ttsCost },
          });
          return audioResult;
        }

        const { generateAudio } = await import('../audio/pipeline');
        log.info('Starting Stage 2: Audio generation');
        const audioMixRequest = options.audioMix
          ? {
              ...options.audioMix,
              outputPath: options.audioMix.outputPath ?? artifacts.audioMix,
            }
          : undefined;
        const result = await logTiming(
          'audio-generation',
          () =>
            generateAudio({
              script,
              voice: options.voice,
              ttsEngine: options.ttsEngine ?? config.audio.ttsEngine,
              asrEngine: options.asrEngine ?? config.audio.asrEngine,
              outputPath: artifacts.audio,
              timestampsPath: artifacts.timestamps,
              mock: options.mock,
              requireWhisper,
              whisperModel,
              reconcile,
              audioMix: audioMixRequest,
            }),
          log
        );

        generatedPaths.add(result.audioPath);
        generatedPaths.add(result.timestampsPath);
        if (result.audioMixPath) {
          generatedPaths.add(result.audioMixPath);
        }

        options.onProgress?.(stage, 'Audio generated');
        const durationMs = Math.round(performance.now() - stageStart);
        eventEmitter?.emit({
          type: 'stage:completed',
          timestamp: Date.now(),
          pipelineId,
          stage,
          stageIndex,
          totalStages,
          durationMs,
          cost: { estimatedCost: result.ttsCost },
        });
        return result;
      } catch (error) {
        const wrapped = wrapStageError(stage, error);
        eventEmitter?.emit({
          type: 'stage:failed',
          timestamp: Date.now(),
          pipelineId,
          stage,
          stageIndex,
          totalStages,
          error: wrapped,
        });
        throw wrapped;
      }
    })();

    if (audio.ttsCost) {
      costs.tts += audio.ttsCost;
    }

    const runStageWithEvents = async <T>(
      stage: PipelineStage,
      run: (ctx: { stage: PipelineStage; stageIndex: number }) => Promise<T>
    ): Promise<T> => {
      const stageIndex = STAGES.indexOf(stage);
      eventEmitter?.emit({
        type: 'stage:started',
        timestamp: Date.now(),
        pipelineId,
        stage,
        stageIndex,
        totalStages,
      });

      const stageStart = performance.now();
      try {
        const result = await run({ stage, stageIndex });
        const durationMs = Math.round(performance.now() - stageStart);
        eventEmitter?.emit({
          type: 'stage:completed',
          timestamp: Date.now(),
          pipelineId,
          stage,
          stageIndex,
          totalStages,
          durationMs,
        });
        return result;
      } catch (error) {
        const wrapped = wrapStageError(stage, error);
        eventEmitter?.emit({
          type: 'stage:failed',
          timestamp: Date.now(),
          pipelineId,
          stage,
          stageIndex,
          totalStages,
          error: wrapped,
        });
        throw wrapped;
      }
    };

    // Stage 3: Visual matching
    const visuals = await runStageWithEvents('visuals', async ({ stage, stageIndex }) => {
      options.onProgress?.(stage, 'Matching visuals...');

      if (options.visualsInput) {
        if (options.keepArtifacts) {
          await writeJson(artifacts.visuals, options.visualsInput);
        }
        options.onProgress?.(stage, 'Visuals ready');
        return options.visualsInput;
      }

      const { matchVisuals } = await import('../visuals/matcher');
      log.info('Starting Stage 3: Visual matching');
      const result = await logTiming(
        'visual-matching',
        () =>
          matchVisuals({
            timestamps: audio.timestamps,
            provider: options.visualsProvider ?? config.visuals.provider,
            providers: options.visualsProviders,
            routingPolicy: options.visualsRoutingPolicy,
            maxGenerationCostUsd: options.visualsMaxGenerationCostUsd,
            policyGates: options.visualsPolicyGates,
            routingAdaptiveWindow: options.visualsRoutingAdaptiveWindow,
            routingAdaptiveMinRecords: options.visualsRoutingAdaptiveMinRecords,
            pipelineId,
            topic: options.topic,
            orientation: options.orientation,
            mock: options.mock,
            gameplay: options.gameplay,
            onProgress: (event) =>
              emitStageProgress({
                emitter: eventEmitter,
                pipelineId,
                stage,
                stageIndex,
                totalStages,
                phase: event.phase,
                progress: event.progress,
                message: event.message,
              }),
          }),
        log
      );

      if (options.keepArtifacts) {
        await writeJson(artifacts.visuals, result);
      }

      options.onProgress?.(stage, 'Visuals matched');
      return result;
    });

    let visualsForRender = visuals;
    let mediaManifest: MediaManifest | undefined;
    const mediaEnabled = options.media?.enabled ?? shouldAutoEnableMediaStage(visuals);
    const mediaOutputDir = options.media?.outputDir ?? join(workDir, 'media');
    if (mediaEnabled) {
      if (options.mediaManifestInput) {
        mediaManifest = options.mediaManifestInput;
      } else {
        const { synthesizeMediaManifest } = await import('../media/service');
        mediaManifest = await logTiming(
          'media-synthesis',
          () =>
            synthesizeMediaManifest({
              visuals,
              outputDir: mediaOutputDir,
              extractVideoKeyframes: options.media?.extractVideoKeyframes ?? true,
              synthesizeImageMotion: options.media?.synthesizeImageMotion ?? true,
              ffmpegPath: options.media?.ffmpegPath,
              adapterByMotionStrategy: options.media?.adapterByMotionStrategy,
            }),
          log
        );
      }

      const { applyMediaManifestToVisuals } = await import('../media/service');
      visualsForRender = applyMediaManifestToVisuals(visuals, mediaManifest);
      generatedPaths.add(artifacts.mediaManifest);
      generatedPaths.add(mediaOutputDir);
      if (options.keepArtifacts) {
        await writeJson(artifacts.mediaManifest, mediaManifest);
      }
    }

    // Stage 4: Render
    const render = await runStageWithEvents('render', async ({ stage, stageIndex }) => {
      options.onProgress?.(stage, 'Rendering video...');
      renderAttempted = true;

      const { renderVideo } = await import('../render/service');
      log.info('Starting Stage 4: Video rendering');
      const result = await logTiming(
        'video-rendering',
        () =>
          renderVideo({
            visuals: visualsForRender,
            timestamps: audio.timestamps,
            audioPath: audio.audioPath,
            audioMix: audio.audioMix,
            audioMixBaseDir: audio.audioMixPath ? dirname(audio.audioMixPath) : undefined,
            outputPath: options.outputPath,
            orientation: options.orientation,
            fps: options.fps ?? config.render.fps,
            mock: options.mock,
            mockRenderMode: options.mockRenderMode,
            compositionId: options.compositionId,
            overlays: options.overlays,
            allowTemplateCode: options.allowTemplateCode,
            installTemplateDeps: options.installTemplateDeps,
            templateDepsAllowOutput: options.templateDepsAllowOutput,
            templatePackageManager: options.templatePackageManager,
            remotionEntryPoint: options.remotionEntryPoint,
            remotionRootDir: options.remotionRootDir,
            remotionPublicDir: options.remotionPublicDir,
            remotionEnableCaching: options.remotionEnableCaching,
            remotionExtraModules: options.remotionExtraModules,
            templateId: options.templateId,
            templateSource: options.templateSource,
            templateParams: options.templateParams,
            captionPreset: options.captionPreset,
            captionConfig: options.captionConfig,
            captionGroupMs: options.captionGroupMs,
            captionMode: options.captionMode,
            wordsPerPage: options.wordsPerPage,
            captionMinWords: options.captionMinWords,
            captionTargetWords: options.captionTargetWords,
            captionMaxWpm: options.captionMaxWpm,
            captionMaxCps: options.captionMaxCps,
            captionMinOnScreenMs: options.captionMinOnScreenMs,
            captionMinOnScreenMsShort: options.captionMinOnScreenMsShort,
            captionDropFillers: options.captionDropFillers,
            captionDropListMarkers: options.captionDropListMarkers,
            captionFillerWords: options.captionFillerWords,
            captionAnimation: options.captionAnimation,
            captionWordAnimation: options.captionWordAnimation,
            captionWordAnimationMs: options.captionWordAnimationMs,
            captionWordAnimationIntensity: options.captionWordAnimationIntensity,
            captionOffsetMs: options.captionOffsetMs,
            captionFontFamily: options.captionFontFamily ?? defaultCaptionFamily,
            captionFontWeight: options.captionFontWeight ?? captionDefaults.fontWeight,
            captionFontFile: options.captionFontFile ?? captionDefaults.fontFile,
            fonts:
              options.captionFonts ??
              (captionDefaults.fonts.length > 0 ? captionDefaults.fonts : undefined),
            maxLinesPerPage: options.maxLinesPerPage,
            maxCharsPerLine: options.maxCharsPerLine,
            archetype: options.archetype,
            splitScreenRatio: options.splitScreenRatio,
            gameplayPosition: options.gameplayPosition,
            contentPosition: options.contentPosition,
            downloadAssets: options.downloadAssets,
            hook: options.hook,
            onProgress: (event) =>
              emitStageProgress({
                emitter: eventEmitter,
                pipelineId,
                stage,
                stageIndex,
                totalStages,
                phase: event.phase,
                progress: event.progress ?? 0,
                message: event.message,
              }),
          }),
        log
      );

      options.onProgress?.(stage, 'Video rendered');
      return result;
    });

    costs.total = costs.llm + costs.tts;

    if (!options.keepArtifacts) {
      log.debug('Cleaning up artifacts');
      await Promise.all(Array.from(generatedPaths).map((path) => rm(path, { force: true })));
    }

    log.info(
      {
        duration: render.duration,
        fileSize: render.fileSize,
        costs: costs.total,
      },
      'Pipeline completed successfully'
    );

    if (eventEmitter) {
      eventEmitter.emit({
        type: 'pipeline:completed',
        timestamp: Date.now(),
        pipelineId,
        durationMs: Math.round(performance.now() - startTime),
        outputPath: render.outputPath,
      });
    }

    return {
      script,
      audio,
      visuals,
      media: mediaManifest,
      render,
      outputPath: render.outputPath,
      duration: render.duration,
      width: render.width,
      height: render.height,
      fileSize: render.fileSize,
      costs: costs.total > 0 ? costs : undefined,
    };
  } catch (error) {
    const wrapped =
      error instanceof PipelineError
        ? error
        : new PipelineError(
            'generate',
            `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
            error instanceof Error ? error : undefined
          );

    log.error({ error: wrapped }, 'Pipeline failed');

    if (!options.keepArtifacts) {
      await Promise.all(
        Array.from(generatedPaths).map((path) => rm(path, { force: true, recursive: true }))
      ).catch(() => {});
      if (renderAttempted) {
        await rm(options.outputPath, { force: true }).catch(() => {});
      }
    }

    eventEmitter?.emit({
      type: 'pipeline:failed',
      timestamp: Date.now(),
      pipelineId,
      error: wrapped,
      stage: wrapped.stage,
    });

    throw wrapped;
  }
}
