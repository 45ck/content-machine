/**
 * Pipeline Orchestration
 *
 * Coordinates the full video generation pipeline:
 * topic → script → audio → visuals → render → video
 */
import { generateScript, ScriptOutput } from '../script/generator';
import { generateAudio, AudioOutput } from '../audio/pipeline';
import { matchVisuals, VisualsOutput } from '../visuals/matcher';
import { renderVideo, RenderOutput } from '../render/service';
import { Archetype, Orientation } from './config';
import { createLogger, logTiming, Logger } from './logger';
import { PipelineError } from './errors';
import { LLMProvider } from './llm';
import { rm } from 'fs/promises';
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
  // Dependency injection for testing
  llmProvider?: LLMProvider;
  /** Use mock mode for testing without real API calls */
  mock?: boolean;
  /** Research output to inject evidence into script generation */
  research?: ResearchOutput;
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
  log.info('Starting Stage 2: Audio generation');
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
  log: Logger
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
  log: Logger
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
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const log = createLogger({ pipeline: 'main', topic: options.topic });
  const workDir = options.workDir ?? dirname(options.outputPath);
  const costs: PipelineCosts = { llm: 0, tts: 0, total: 0 };

  const artifacts: PipelineArtifacts = {
    script: join(workDir, 'script.json'),
    audio: join(workDir, 'audio.wav'),
    timestamps: join(workDir, 'timestamps.json'),
    visuals: join(workDir, 'visuals.json'),
  };

  try {
    const script = await executeScriptStage(options, log, costs);
    const audio = await executeAudioStage(options, script, artifacts, log, costs);
    const visuals = await executeVisualsStage(options, audio, log);
    const render = await executeRenderStage(options, visuals, audio, artifacts, log);

    costs.total = costs.llm + costs.tts;

    if (!options.keepArtifacts) {
      log.debug('Cleaning up artifacts');
      await cleanupArtifacts(artifacts);
    }

    log.info(
      { duration: render.duration, fileSize: render.fileSize, costs: costs.total },
      'Pipeline completed successfully'
    );

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
