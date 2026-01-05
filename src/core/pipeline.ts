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
import { logger, createLogger, logTiming } from './logger';
import { PipelineError } from './errors';
import { rm } from 'fs/promises';
import { join, dirname } from 'path';

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
}

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

/**
 * Run the full video generation pipeline
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const log = createLogger({ pipeline: 'main', topic: options.topic });
  const workDir = options.workDir ?? dirname(options.outputPath);
  
  // Track costs
  const costs = { llm: 0, tts: 0, total: 0 };
  
  // Artifact paths
  const artifacts = {
    script: join(workDir, 'script.json'),
    audio: join(workDir, 'audio.wav'),
    timestamps: join(workDir, 'timestamps.json'),
    visuals: join(workDir, 'visuals.json'),
  };
  
  try {
    // Stage 1: Generate Script
    log.info('Starting Stage 1: Script generation');
    options.onProgress?.('script', 'Generating script...');
    
    const script = await logTiming('script-generation', async () => {
      return generateScript({
        topic: options.topic,
        archetype: options.archetype,
        targetDuration: options.targetDuration,
      });
    }, log);
    
    if (script.meta?.llmCost) {
      costs.llm += script.meta.llmCost;
    }
    
    options.onProgress?.('script', 'Script generated');
    
    // Stage 2: Generate Audio
    log.info('Starting Stage 2: Audio generation');
    options.onProgress?.('audio', 'Generating audio...');
    
    const audio = await logTiming('audio-generation', async () => {
      return generateAudio({
        script,
        voice: options.voice,
        outputPath: artifacts.audio,
        timestampsPath: artifacts.timestamps,
      });
    }, log);
    
    if (audio.ttsCost) {
      costs.tts += audio.ttsCost;
    }
    
    options.onProgress?.('audio', 'Audio generated');
    
    // Stage 3: Match Visuals
    log.info('Starting Stage 3: Visual matching');
    options.onProgress?.('visuals', 'Matching visuals...');
    
    const visuals = await logTiming('visual-matching', async () => {
      return matchVisuals({
        timestamps: audio.timestamps,
        provider: 'pexels',
      });
    }, log);
    
    options.onProgress?.('visuals', 'Visuals matched');
    
    // Stage 4: Render Video
    log.info('Starting Stage 4: Video rendering');
    options.onProgress?.('render', 'Rendering video...');
    
    const render = await logTiming('video-rendering', async () => {
      return renderVideo({
        visuals,
        timestamps: audio.timestamps,
        audioPath: artifacts.audio,
        outputPath: options.outputPath,
        orientation: options.orientation,
        fps: 30,
      });
    }, log);
    
    options.onProgress?.('render', 'Video rendered');
    
    // Calculate total costs
    costs.total = costs.llm + costs.tts;
    
    // Clean up artifacts if not keeping them
    if (!options.keepArtifacts) {
      log.debug('Cleaning up artifacts');
      await Promise.all([
        rm(artifacts.script, { force: true }),
        rm(artifacts.audio, { force: true }),
        rm(artifacts.timestamps, { force: true }),
        rm(artifacts.visuals, { force: true }),
      ]);
    }
    
    log.info({ 
      duration: render.duration, 
      fileSize: render.fileSize,
      costs: costs.total 
    }, 'Pipeline completed successfully');
    
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
    
    // Clean up artifacts on failure if not keeping them
    if (!options.keepArtifacts) {
      await Promise.all([
        rm(artifacts.script, { force: true }),
        rm(artifacts.audio, { force: true }),
        rm(artifacts.timestamps, { force: true }),
        rm(artifacts.visuals, { force: true }),
        rm(options.outputPath, { force: true }),
      ]).catch(() => {}); // Ignore cleanup errors
    }
    
    throw new PipelineError(
      'generate',
      `Pipeline failed: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}
