import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import type { VisualsOutput, VisualsOutputInput } from '../domain';
import {
  MediaManifestSchema,
  MEDIA_MANIFEST_SCHEMA_VERSION,
  VisualsOutputSchema,
  type MediaManifest,
  type MediaScene,
} from '../domain';
import { createLogger } from '../core/logger';
import { execFfmpeg } from '../core/video/ffmpeg';
import { MediaSynthesisOrchestrator } from './synthesis/orchestrator';
import { createMediaSynthesisRegistry } from './synthesis/registry';

const log = createLogger({ module: 'media-service' });

interface SynthesizeMediaOptions {
  visuals: VisualsOutput | VisualsOutputInput;
  outputDir: string;
  extractVideoKeyframes?: boolean;
  synthesizeImageMotion?: boolean;
  ffmpegPath?: string;
  adapterByMotionStrategy?: {
    depthflow?: string;
    veo?: string;
  };
}

function isRemoteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

function isVideoPath(path: string): boolean {
  const ext = extname(path).toLowerCase();
  return ['.mp4', '.mov', '.mkv', '.webm', '.avi'].includes(ext);
}

function inferAssetType(assetPath: string, explicitType?: 'video' | 'image'): 'video' | 'image' {
  if (explicitType) return explicitType;
  const ext = extname(assetPath).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return 'image';
  return 'video';
}

function isAdvancedMotionStrategy(strategy: string | undefined): strategy is 'depthflow' | 'veo' {
  return strategy === 'depthflow' || strategy === 'veo';
}

async function extractSceneKeyframe(params: {
  sceneId: string;
  inputPath: string;
  durationSeconds: number;
  outputDir: string;
  ffmpegPath?: string;
}): Promise<string> {
  const { sceneId, inputPath, durationSeconds, outputDir, ffmpegPath } = params;
  const safeSceneId = sceneId.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stem = basename(inputPath, extname(inputPath)).replace(/[^a-zA-Z0-9._-]/g, '_');
  const outputPath = join(outputDir, 'keyframes', `${safeSceneId}-${stem}.jpg`);
  const midpoint = Math.max(0, durationSeconds / 2);

  await mkdir(join(outputDir, 'keyframes'), { recursive: true });
  await execFfmpeg(
    ['-y', '-ss', midpoint.toFixed(3), '-i', inputPath, '-frames:v', '1', outputPath],
    {
      ffmpegPath,
      dependencyMessage: 'ffmpeg is required for `cm media` keyframe extraction',
      timeoutMs: 90_000,
    }
  );

  return outputPath;
}

/**
 * Rewrite a visuals artifact using synthesized media outputs.
 *
 * When a media scene includes `synthesizedVideoPath`, the matching visuals scene
 * is converted to a video asset so render can consume it directly.
 */
export function applyMediaManifestToVisuals(
  visualsInput: VisualsOutput | VisualsOutputInput,
  manifest: MediaManifest
): VisualsOutput {
  const visuals = VisualsOutputSchema.parse(visualsInput);
  const byScene = new Map<string, MediaScene>(
    manifest.scenes.map((scene) => [scene.sceneId, scene])
  );
  const rewrittenScenes = visuals.scenes.map((scene) => {
    const media = byScene.get(scene.sceneId);
    if (!media?.synthesizedVideoPath) return scene;
    return {
      ...scene,
      assetPath: media.synthesizedVideoPath,
      assetType: 'video' as const,
      motionStrategy: 'none' as const,
      motionApplied: true,
    };
  });

  return VisualsOutputSchema.parse({
    ...visuals,
    scenes: rewrittenScenes,
  });
}

interface MediaProcessingContext {
  outputDir: string;
  ffmpegPath?: string;
  extractVideoKeyframes: boolean;
  synthesizeImageMotion: boolean;
  orchestrator: MediaSynthesisOrchestrator;
  adapterByMotionStrategy: {
    depthflow: string;
    veo: string;
  };
}

async function processImageScene(params: {
  scene: VisualsOutput['scenes'][number];
  assetPath: string;
  motionStrategy: 'depthflow' | 'veo';
  context: MediaProcessingContext;
}): Promise<{ scene: MediaScene; videoSynthesized: boolean }> {
  const { scene, assetPath, motionStrategy, context } = params;
  if (!context.synthesizeImageMotion) {
    return {
      videoSynthesized: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath,
        assetType: 'image',
        motionStrategy,
        status: 'skipped-motion-strategy',
      },
    };
  }

  if (isRemoteUrl(assetPath)) {
    return {
      videoSynthesized: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath,
        assetType: 'image',
        motionStrategy,
        status: 'failed',
        error: 'Image-to-video synthesis currently requires local image assets',
      },
    };
  }

  const localImagePath = resolve(assetPath);
  if (!existsSync(localImagePath)) {
    return {
      videoSynthesized: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath: localImagePath,
        assetType: 'image',
        motionStrategy,
        status: 'failed',
        error: 'Local image asset not found',
      },
    };
  }

  const adapterName = context.adapterByMotionStrategy[motionStrategy];
  const outputPath = join(
    context.outputDir,
    'clips',
    `${scene.sceneId.replace(/[^a-zA-Z0-9._-]/g, '_')}-${motionStrategy}.mp4`
  );

  const job = await context.orchestrator.runJob({
    adapterName,
    request: {
      kind: 'image-to-video',
      inputImagePath: localImagePath,
      durationSeconds: scene.duration,
      width: 1080,
      height: 1920,
      outputPath,
    },
  });

  if (job.status === 'succeeded' && job.result?.outputPath) {
    return {
      videoSynthesized: true,
      scene: {
        sceneId: scene.sceneId,
        assetPath: localImagePath,
        assetType: 'image',
        motionStrategy,
        synthesizedVideoPath: job.result.outputPath,
        synthesisAdapter: adapterName,
        synthesisJobId: job.id,
        status: 'video-synthesized',
      },
    };
  }

  return {
    videoSynthesized: false,
    scene: {
      sceneId: scene.sceneId,
      assetPath: localImagePath,
      assetType: 'image',
      motionStrategy,
      synthesisAdapter: adapterName,
      synthesisJobId: job.id,
      status: 'failed',
      error: job.error ?? 'Image-to-video synthesis failed',
    },
  };
}

async function processVideoScene(params: {
  scene: VisualsOutput['scenes'][number];
  assetPath: string;
  context: MediaProcessingContext;
}): Promise<{ scene: MediaScene; keyframeExtracted: boolean }> {
  const { scene, assetPath, context } = params;
  const motionStrategy = scene.motionStrategy;
  if (!context.extractVideoKeyframes) {
    return {
      keyframeExtracted: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath,
        assetType: 'video',
        motionStrategy,
        status: 'passthrough',
      },
    };
  }

  if (!isVideoPath(assetPath)) {
    return {
      keyframeExtracted: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath,
        assetType: 'video',
        motionStrategy,
        status: 'skipped-non-video',
      },
    };
  }

  if (isRemoteUrl(assetPath)) {
    return {
      keyframeExtracted: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath,
        assetType: 'video',
        motionStrategy,
        status: 'skipped-remote-video',
      },
    };
  }

  const localPath = resolve(assetPath);
  if (!existsSync(localPath)) {
    return {
      keyframeExtracted: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath: localPath,
        assetType: 'video',
        motionStrategy,
        status: 'failed',
        error: 'Local video asset not found',
      },
    };
  }

  try {
    const keyframePath = await extractSceneKeyframe({
      sceneId: scene.sceneId,
      inputPath: localPath,
      durationSeconds: scene.duration,
      outputDir: context.outputDir,
      ffmpegPath: context.ffmpegPath,
    });
    return {
      keyframeExtracted: true,
      scene: {
        sceneId: scene.sceneId,
        assetPath: localPath,
        assetType: 'video',
        motionStrategy,
        keyframePath,
        status: 'keyframe-extracted',
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.warn({ sceneId: scene.sceneId, error }, 'Keyframe extraction failed');
    return {
      keyframeExtracted: false,
      scene: {
        sceneId: scene.sceneId,
        assetPath: localPath,
        assetType: 'video',
        motionStrategy,
        status: 'failed',
        error: message,
      },
    };
  }
}

/**
 * Build a media-manifest artifact from visuals input.
 *
 * Responsibilities:
 * - Optional video keyframe extraction (video->image)
 * - Optional advanced image motion synthesis (image->video)
 * - Deterministic scene-level status reporting for downstream stages
 */
export async function synthesizeMediaManifest(
  options: SynthesizeMediaOptions
): Promise<MediaManifest> {
  const visuals = VisualsOutputSchema.parse(options.visuals);
  const outputDir = resolve(options.outputDir);
  await mkdir(outputDir, { recursive: true });

  const context: MediaProcessingContext = {
    outputDir,
    ffmpegPath: options.ffmpegPath,
    extractVideoKeyframes: options.extractVideoKeyframes ?? true,
    synthesizeImageMotion: options.synthesizeImageMotion ?? true,
    orchestrator: new MediaSynthesisOrchestrator(
      createMediaSynthesisRegistry({ ffmpegPath: options.ffmpegPath })
    ),
    adapterByMotionStrategy: {
      depthflow: options.adapterByMotionStrategy?.depthflow ?? 'static-video',
      veo: options.adapterByMotionStrategy?.veo ?? 'static-video',
    },
  };

  let keyframesExtracted = 0;
  let videosSynthesized = 0;
  const scenes: MediaScene[] = [];

  for (const scene of visuals.scenes) {
    const assetPath = scene.assetPath;
    const assetType = inferAssetType(assetPath, scene.assetType);
    if (assetType === 'image' && isAdvancedMotionStrategy(scene.motionStrategy)) {
      const result = await processImageScene({
        scene,
        assetPath,
        motionStrategy: scene.motionStrategy,
        context,
      });
      scenes.push(result.scene);
      if (result.videoSynthesized) videosSynthesized++;
      continue;
    }

    if (assetType === 'video') {
      const result = await processVideoScene({ scene, assetPath, context });
      scenes.push(result.scene);
      if (result.keyframeExtracted) keyframesExtracted++;
      continue;
    }

    scenes.push({
      sceneId: scene.sceneId,
      assetPath,
      assetType,
      motionStrategy: scene.motionStrategy,
      status: 'skipped-non-video',
    });
  }

  return MediaManifestSchema.parse({
    schemaVersion: MEDIA_MANIFEST_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    totalScenes: scenes.length,
    keyframesExtracted,
    videosSynthesized,
    scenes,
  });
}
