/**
 * Pipeline Orchestration
 *
 * Coordinates the full video generation pipeline:
 * topic → script → audio → visuals → render → video
 */
import { generateScript, ScriptOutput } from '../script/generator';
import { generateAudio, AudioOutput } from '../audio/pipeline';
import { matchVisuals, VisualsProgressEvent } from '../visuals/matcher';
import type { VisualsOutput } from '../visuals/matcher';
import { renderVideo, RenderProgressEvent } from '../render/service';
import type { RenderOutput } from '../render/service';
import { Archetype, Orientation } from './config';
import { createLogger, logTiming, Logger } from './logger';
import { PipelineError } from './errors';
import { LLMProvider } from './llm';
import type { PipelineEvent, PipelineEventEmitter } from './events';
import { randomUUID } from 'crypto';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import type { ResearchOutput } from '../research/schema';
import { z } from 'zod';

export type PipelineStage = 'script' | 'audio' | 'visuals' | 'render';

export interface PipelineOptions {
  topic: string;
  archetype: Archetype;
  orientation: Orientation;
  voice: string;
  targetDuration: number;
  outputPath: string;
  keepArtifacts?: boolean;
  workDir?: string;
  onProgress?: (stage: PipelineStage, message: string) => void;
  /**
   * Optional pipeline event emitter (Observer pattern).
   * Emits lifecycle + progress events for observability and CLI UX.
   */
  eventEmitter?: PipelineEventEmitter;
  // Dependency injection for testing
  llmProvider?: LLMProvider;
  /** Use mock mode for testing without real API calls */
  mock?: boolean;
  /** Research output to inject evidence into script generation */
  research?: ResearchOutput;
  /**
   * Pipeline mode for timestamp generation:
   * - 'standard' (default): Uses Whisper ASR with estimation fallback
   * - 'audio-first': Requires Whisper ASR for ground-truth timestamps, fails if unavailable
   */
  pipelineMode?: 'standard' | 'audio-first';
}

/**
 * Zod schema for pipeline config validation
 */
export const PipelineConfigSchema = z.object({
  topic: z.string().min(1),
  archetype: z.string(),
  orientation: z.string(),
  voice: z.string(),
  targetDuration: z.number().positive(),
  outputPath: z.string(),
  keepArtifacts: z.boolean().optional(),
  research: z.any().optional(), // ResearchOutput is validated separately
});

export interface PipelineResult {
  script: ScriptOutput;
  audio: AudioOutput;
  visuals: VisualsOutput;
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

interface PipelineArtifacts {
  script: string;
  audio: string;
  timestamps: string;
  visuals: string;
}

interface PipelineCosts {
  llm: number;
  tts: number;
  total: number;
}

function emitPipelineEvent(emitter: PipelineEventEmitter | undefined, event: PipelineEvent): void {
  emitter?.emit(event);
}

function createPipelineId(): string {
  try {
    return randomUUID();
  } catch {
    return `pipeline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

async function writeArtifactJson(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
}

/**
 * Execute Stage 1: Script generation
 */
async function executeScriptStage(
  options: PipelineOptions,
  log: Logger,
  costs: PipelineCosts
): Promise<ScriptOutput> {
  log.info('Starting Stage 1: Script generation');
  options.onProgress?.('script', 'Generating script...');

  const script = await logTiming(
    'script-generation',
    async () => {
      return generateScript({
        topic: options.topic,
        archetype: options.archetype,
        targetDuration: options.targetDuration,
        llmProvider: options.llmProvider,
        research: options.research,
      });
    },
    log
  );

  if (script.meta?.llmCost) {
    costs.llm += script.meta.llmCost;
  }

  options.onProgress?.('script', 'Script generated');
  return script;
}

/**
 * Execute Stage 2: Audio generation
 */
async function executeAudioStage(
  options: PipelineOptions,
  script: ScriptOutput,
  artifacts: PipelineArtifacts,
  log: Logger,
  costs: PipelineCosts
): Promise<AudioOutput> {
  log.info(
    { pipelineMode: options.pipelineMode ?? 'standard' },
    'Starting Stage 2: Audio generation'
  );
  options.onProgress?.('audio', 'Generating audio...');

  const audio = await logTiming(
    'audio-generation',
    async () => {
      return generateAudio({
        script,
        voice: options.voice,
        outputPath: artifacts.audio,
        timestampsPath: artifacts.timestamps,
        mock: options.mock,
        requireWhisper: options.pipelineMode === 'audio-first',
      });
    },
    log
  );

  if (audio.ttsCost) {
    costs.tts += audio.ttsCost;
  }

  options.onProgress?.('audio', 'Audio generated');
  return audio;
}

/**
 * Execute Stage 3: Visual matching
 */
async function executeVisualsStage(
  options: PipelineOptions,
  audio: AudioOutput,
  log: Logger,
  onProgress?: (event: VisualsProgressEvent) => void
): Promise<VisualsOutput> {
  log.info('Starting Stage 3: Visual matching');
  options.onProgress?.('visuals', 'Matching visuals...');

  const visuals = await logTiming(
    'visual-matching',
    async () => {
      return matchVisuals({
        timestamps: audio.timestamps,
        provider: 'pexels',
        mock: options.mock,
        onProgress,
      });
    },
    log
  );

  options.onProgress?.('visuals', 'Visuals matched');
  return visuals;
}

/**
 * Execute Stage 4: Video rendering
 */
async function executeRenderStage(
  options: PipelineOptions,
  visuals: VisualsOutput,
  audio: AudioOutput,
  artifacts: PipelineArtifacts,
  log: Logger,
  onProgress?: (event: RenderProgressEvent) => void
): Promise<RenderOutput> {
  log.info('Starting Stage 4: Video rendering');
  options.onProgress?.('render', 'Rendering video...');

  const render = await logTiming(
    'video-rendering',
    async () => {
      return renderVideo({
        visuals,
        timestamps: audio.timestamps,
        audioPath: artifacts.audio,
        outputPath: options.outputPath,
        orientation: options.orientation,
        fps: 30,
        mock: options.mock,
        onProgress,
      });
    },
    log
  );

  options.onProgress?.('render', 'Video rendered');
  return render;
}

/**
 * Clean up pipeline artifacts
 */
async function cleanupArtifacts(artifacts: PipelineArtifacts, outputPath?: string): Promise<void> {
  const paths = [artifacts.script, artifacts.audio, artifacts.timestamps, artifacts.visuals];
  if (outputPath) {
    paths.push(outputPath);
  }
  await Promise.all(paths.map((p) => rm(p, { force: true }))).catch(() => {});
}

/**
 * Run the full video generation pipeline
 */
// eslint-disable-next-line max-lines-per-function, complexity, sonarjs/cognitive-complexity
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const log = createLogger({ pipeline: 'main', topic: options.topic });
  const pipelineId = createPipelineId();
  const emitter = options.eventEmitter;
  const pipelineStart = Date.now();
  const workDir = options.workDir ?? dirname(options.outputPath);
  const costs: PipelineCosts = { llm: 0, tts: 0, total: 0 };
  const totalStages = 4;
  let currentStage: { stage: PipelineStage; stageIndex: number } | null = null;

  const artifacts: PipelineArtifacts = {
    script: join(workDir, 'script.json'),
    audio: join(workDir, 'audio.wav'),
    timestamps: join(workDir, 'timestamps.json'),
    visuals: join(workDir, 'visuals.json'),
  };

  try {
    await mkdir(workDir, { recursive: true });
    await mkdir(dirname(options.outputPath), { recursive: true });

    emitPipelineEvent(emitter, {
      type: 'pipeline:started',
      timestamp: Date.now(),
      pipelineId,
      topic: options.topic,
      archetype: options.archetype,
    });

    currentStage = { stage: 'script', stageIndex: 0 };
    emitPipelineEvent(emitter, {
      type: 'stage:started',
      timestamp: Date.now(),
      pipelineId,
      stage: currentStage.stage,
      stageIndex: currentStage.stageIndex,
      totalStages,
    });
    const scriptStart = Date.now();
    const script = await executeScriptStage(options, log, costs);
    emitPipelineEvent(emitter, {
      type: 'stage:completed',
      timestamp: Date.now(),
      pipelineId,
      stage: currentStage.stage,
      stageIndex: currentStage.stageIndex,
      totalStages,
      durationMs: Date.now() - scriptStart,
      cost: script.meta?.llmCost ? { estimatedCost: script.meta.llmCost } : undefined,
    });
    if (options.keepArtifacts) {
      await writeArtifactJson(artifacts.script, script);
    }

    currentStage = { stage: 'audio', stageIndex: 1 };
    emitPipelineEvent(emitter, {
      type: 'stage:started',
      timestamp: Date.now(),
      pipelineId,
      stage: currentStage.stage,
      stageIndex: currentStage.stageIndex,
      totalStages,
    });
    const audioStart = Date.now();
    const audio = await executeAudioStage(options, script, artifacts, log, costs);
    emitPipelineEvent(emitter, {
      type: 'stage:completed',
      timestamp: Date.now(),
      pipelineId,
      stage: currentStage.stage,
      stageIndex: currentStage.stageIndex,
      totalStages,
      durationMs: Date.now() - audioStart,
      cost: audio.ttsCost ? { estimatedCost: audio.ttsCost } : undefined,
    });

    currentStage = { stage: 'visuals', stageIndex: 2 };
    emitPipelineEvent(emitter, {
      type: 'stage:started',
      timestamp: Date.now(),
      pipelineId,
      stage: currentStage.stage,
      stageIndex: currentStage.stageIndex,
      totalStages,
    });

    const visualsStage = currentStage.stage;
    const visualsStageIndex = currentStage.stageIndex;

    const emitVisualsProgress = (event: VisualsProgressEvent): void => {
      emitPipelineEvent(emitter, {
        type: 'stage:progress',
        timestamp: Date.now(),
        pipelineId,
        stage: visualsStage,
        stageIndex: visualsStageIndex,
        totalStages,
        phase: event.phase,
        progress: Math.min(1, Math.max(0, event.progress)),
        message: event.message,
      });
    };

    const visualsStart = Date.now();
    const visuals = await executeVisualsStage(options, audio, log, emitVisualsProgress);
    emitPipelineEvent(emitter, {
      type: 'stage:completed',
      timestamp: Date.now(),
      pipelineId,
      stage: visualsStage,
      stageIndex: visualsStageIndex,
      totalStages,
      durationMs: Date.now() - visualsStart,
    });
    if (options.keepArtifacts) {
      await writeArtifactJson(artifacts.visuals, visuals);
    }

    currentStage = { stage: 'render', stageIndex: 3 };
    emitPipelineEvent(emitter, {
      type: 'stage:started',
      timestamp: Date.now(),
      pipelineId,
      stage: currentStage.stage,
      stageIndex: currentStage.stageIndex,
      totalStages,
    });

    const renderStage = currentStage.stage;
    const renderStageIndex = currentStage.stageIndex;

    const emitRenderProgress = (event: RenderProgressEvent): void => {
      const progress = Math.min(1, Math.max(0, event.progress ?? 0));
      const overall =
        event.phase === 'bundle'
          ? progress * 0.2
          : event.phase === 'select-composition'
            ? 0.2 + progress * 0.05
            : event.phase === 'render-media'
              ? 0.25 + progress * 0.75
              : progress;

      emitPipelineEvent(emitter, {
        type: 'stage:progress',
        timestamp: Date.now(),
        pipelineId,
        stage: renderStage,
        stageIndex: renderStageIndex,
        totalStages,
        phase: event.phase,
        progress: Math.min(1, Math.max(0, overall)),
        message: event.message,
      });
    };

    const renderStart = Date.now();
    const render = await executeRenderStage(
      options,
      visuals,
      audio,
      artifacts,
      log,
      emitRenderProgress
    );
    emitPipelineEvent(emitter, {
      type: 'stage:completed',
      timestamp: Date.now(),
      pipelineId,
      stage: renderStage,
      stageIndex: renderStageIndex,
      totalStages,
      durationMs: Date.now() - renderStart,
    });

    costs.total = costs.llm + costs.tts;

    if (!options.keepArtifacts) {
      log.debug('Cleaning up artifacts');
      await cleanupArtifacts(artifacts);
    }

    log.info(
      { duration: render.duration, fileSize: render.fileSize, costs: costs.total },
      'Pipeline completed successfully'
    );

    emitPipelineEvent(emitter, {
      type: 'pipeline:completed',
      timestamp: Date.now(),
      pipelineId,
      durationMs: Date.now() - pipelineStart,
      outputPath: render.outputPath,
    });

    return {
      script,
      audio,
      visuals,
      render,
      outputPath: render.outputPath,
      duration: render.duration,
      width: render.width,
      height: render.height,
      fileSize: render.fileSize,
      costs: costs.total > 0 ? costs : undefined,
    };
  } catch (error) {
    log.error({ error }, 'Pipeline failed');

    if (currentStage) {
      emitPipelineEvent(emitter, {
        type: 'stage:failed',
        timestamp: Date.now(),
        pipelineId,
        stage: currentStage.stage,
        stageIndex: currentStage.stageIndex,
        totalStages,
        error: error instanceof Error ? error : new Error(String(error)),
      });
    }
    emitPipelineEvent(emitter, {
      type: 'pipeline:failed',
      timestamp: Date.now(),
      pipelineId,
      error: error instanceof Error ? error : new Error(String(error)),
      stage: currentStage?.stage,
    });

    if (!options.keepArtifacts) {
      await cleanupArtifacts(artifacts, options.outputPath);
    }

    throw new PipelineError(
      'generate',
      `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}
