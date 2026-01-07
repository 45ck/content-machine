/**
 * Render Service
 *
 * Coordinates video rendering with Remotion.
 * Based on SYSTEM-DESIGN §7.4 cm render command.
 */
import { stat, writeFile, copyFile, mkdir } from 'fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { VisualsOutput } from '../visuals/schema';
import { TimestampsOutput } from '../audio/schema';
import { Orientation } from '../core/config';
import { createLogger } from '../core/logger';
import { RenderError } from '../core/errors';
import {
  RenderOutput,
  RenderOutputSchema,
  RenderProps,
  CaptionStyle,
  CaptionConfig,
  RENDER_SCHEMA_VERSION,
} from './schema';
import { getCaptionPreset, CaptionPresetName } from './captions/presets';
import { join, dirname, resolve, basename } from 'path';
import { fileURLToPath } from 'url';

// Get the directory containing this file for Remotion bundling
// In ESM, we use import.meta.url; __dirname is injected by esbuild for CJS
function getCurrentDir(): string {
  // ESM path - always try this first when running with tsx or native ESM
  if (typeof import.meta !== 'undefined' && import.meta.url) {
    return dirname(fileURLToPath(import.meta.url));
  }
  // CJS fallback - __dirname is available when bundled with esbuild
  // This line is only reached in bundled CJS context where esbuild injects __dirname
  return typeof __dirname !== 'undefined' ? __dirname : process.cwd();
}

const RENDER_DIR = getCurrentDir();

export type { RenderOutput, RenderProps } from './schema';

export interface RenderVideoOptions {
  visuals: VisualsOutput;
  timestamps: TimestampsOutput;
  audioPath: string;
  outputPath: string;
  orientation: Orientation;
  fps?: number;
  /** @deprecated Use captionConfig or captionPreset instead */
  captionStyle?: Partial<CaptionStyle>;
  /** New comprehensive caption configuration */
  captionConfig?: Partial<CaptionConfig>;
  /** Use a preset caption style (tiktok, youtube, reels, bold, minimal, neon) */
  captionPreset?: CaptionPresetName;
  archetype?: string;
  /** Use mock mode for testing without real rendering */
  mock?: boolean;
  /**
   * Optional progress callback for CLI UX (phase + percent).
   * Progress is reported as 0..1 when available.
   */
  onProgress?: (event: RenderProgressEvent) => void;
}

export type RenderProgressPhase = 'bundle' | 'select-composition' | 'render-media' | 'mock';

export interface RenderProgressEvent {
  phase: RenderProgressPhase;
  progress?: number; // 0..1
  message?: string;
}

// Video dimensions by orientation
const DIMENSIONS: Record<Orientation, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

interface BundleResult {
  bundleLocation: string;
  audioFilename: string;
}

/**
 * Bundle Remotion composition and copy audio to bundle
 */
async function bundleComposition(
  audioPath: string,
  log: ReturnType<typeof createLogger>,
  onProgress?: (event: RenderProgressEvent) => void
): Promise<BundleResult> {
  log.debug('Bundling Remotion composition');

  const bundleLocation = await bundle({
    entryPoint: join(RENDER_DIR, 'remotion/index.ts'),
    onProgress: (progress) => {
      log.debug({ progress: Math.round(progress * 100) }, 'Bundling progress');
      onProgress?.({ phase: 'bundle', progress, message: 'Bundling' });
    },
  });

  log.debug({ bundleLocation }, 'Bundle complete');
  onProgress?.({ phase: 'bundle', progress: 1, message: 'Bundle complete' });

  // Copy audio file to bundle's public folder
  const audioFilename = basename(audioPath);
  const bundlePublicDir = join(bundleLocation, 'public');
  const bundleAudioPath = join(bundlePublicDir, audioFilename);

  await mkdir(bundlePublicDir, { recursive: true });
  await copyFile(resolve(audioPath), bundleAudioPath);
  log.debug({ audioFilename, bundleAudioPath }, 'Audio copied to bundle');

  return { bundleLocation, audioFilename };
}

/**
 * Resolve caption configuration from options
 * Priority: captionConfig > captionPreset > default (tiktok)
 */
function resolveCaptionConfig(options: RenderVideoOptions): CaptionConfig {
  // Start with a preset (default to tiktok)
  const presetName = options.captionPreset ?? 'tiktok';
  const preset = getCaptionPreset(presetName);

  // If captionConfig is provided, merge it with the preset
  if (options.captionConfig) {
    return {
      ...preset,
      ...options.captionConfig,
      // Deep merge nested objects
      pillStyle: { ...preset.pillStyle, ...options.captionConfig.pillStyle },
      stroke: { ...preset.stroke, ...options.captionConfig.stroke },
      shadow: { ...preset.shadow, ...options.captionConfig.shadow },
      layout: { ...preset.layout, ...options.captionConfig.layout },
      positionOffset: { ...preset.positionOffset, ...options.captionConfig.positionOffset },
    };
  }

  return preset;
}

/**
 * Build render props with caption styling
 */
function buildRenderProps(
  options: RenderVideoOptions,
  dimensions: { width: number; height: number },
  fps: number,
  audioFilename: string
): RenderProps {
  const captionConfig = resolveCaptionConfig(options);

  return {
    schemaVersion: RENDER_SCHEMA_VERSION,
    scenes: options.visuals.scenes,
    words: options.timestamps.allWords,
    audioPath: audioFilename,
    duration: options.timestamps.totalDuration,
    width: dimensions.width,
    height: dimensions.height,
    fps,
    archetype: options.archetype,
    captionConfig,
    // Keep legacy captionStyle for backwards compatibility
    captionStyle: {
      fontFamily: 'Inter',
      fontSize: 80,
      fontWeight: 'bold',
      color: '#FFFFFF',
      highlightColor: '#FFE135',
      highlightCurrentWord: true,
      strokeColor: '#000000',
      strokeWidth: 4,
      position: 'bottom',
      animation: 'pop',
      ...options.captionStyle,
    },
  };
}

/** Options for executeRender helper */
interface ExecuteRenderOptions {
  bundleLocation: string;
  renderProps: RenderProps;
  outputPath: string;
  dimensions: { width: number; height: number };
  fps: number;
  totalDuration: number;
  log: ReturnType<typeof createLogger>;
  onProgress?: (event: RenderProgressEvent) => void;
}

/**
 * Execute Remotion render
 */
async function executeRender(opts: ExecuteRenderOptions): Promise<void> {
  const {
    bundleLocation,
    renderProps,
    outputPath,
    dimensions,
    fps,
    totalDuration,
    log,
    onProgress,
  } = opts;
  log.debug('Selecting composition');
  onProgress?.({ phase: 'select-composition', progress: 0, message: 'Selecting composition' });

  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'ShortVideo',
    inputProps: renderProps,
  });

  onProgress?.({ phase: 'select-composition', progress: 1, message: 'Composition selected' });

  const durationInFrames = Math.ceil(totalDuration * fps);
  log.info({ durationInFrames }, 'Rendering video');

  await renderMedia({
    composition: {
      ...composition,
      durationInFrames,
      width: dimensions.width,
      height: dimensions.height,
      fps,
    },
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: renderProps,
    onProgress: ({ progress }) => {
      log.debug({ progress: Math.round(progress * 100) }, 'Render progress');
      onProgress?.({ phase: 'render-media', progress, message: 'Rendering' });
    },
  });
}

/**
 * Render final video with Remotion
 */
export async function renderVideo(options: RenderVideoOptions): Promise<RenderOutput> {
  const log = createLogger({ module: 'render', outputPath: options.outputPath });

  const safeProgress = (event: RenderProgressEvent): void => {
    try {
      options.onProgress?.(event);
    } catch (error) {
      log.debug({ error }, 'Render progress callback failed');
    }
  };

  const fps = options.fps ?? 30;
  const dimensions = DIMENSIONS[options.orientation];
  const totalDuration = options.timestamps.totalDuration;

  await mkdir(dirname(options.outputPath), { recursive: true });

  log.info(
    {
      orientation: options.orientation,
      fps,
      duration: totalDuration,
      sceneCount: options.visuals.scenes.length,
      mock: options.mock,
    },
    'Starting video render'
  );

  if (options.mock) {
    safeProgress({ phase: 'mock', progress: 1, message: 'Mock render complete' });
    return generateMockRender(options, dimensions, fps, totalDuration);
  }

  try {
    const { bundleLocation, audioFilename } = await bundleComposition(
      options.audioPath,
      log,
      safeProgress
    );
    const renderProps = buildRenderProps(options, dimensions, fps, audioFilename);
    await executeRender({
      bundleLocation,
      renderProps,
      outputPath: options.outputPath,
      dimensions,
      fps,
      totalDuration,
      log,
      onProgress: safeProgress,
    });

    const stats = await stat(options.outputPath);
    const output: RenderOutput = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      outputPath: options.outputPath,
      duration: totalDuration,
      width: dimensions.width,
      height: dimensions.height,
      fps,
      fileSize: stats.size,
      codec: 'h264',
      archetype: options.archetype,
    };

    const validated = RenderOutputSchema.parse(output);
    log.info(
      { duration: validated.duration, fileSize: validated.fileSize },
      'Video render complete'
    );
    return validated;
  } catch (error) {
    log.error({ error }, 'Video render failed');
    throw new RenderError(
      `Video render failed: ${error instanceof Error ? error.message : String(error)}`,
      { outputPath: options.outputPath }
    );
  }
}

/**
 * Generate mock render output for testing
 */
async function generateMockRender(
  options: RenderVideoOptions,
  dimensions: { width: number; height: number },
  fps: number,
  totalDuration: number
): Promise<RenderOutput> {
  const log = createLogger({ module: 'render', mock: true });

  // Create a small mock video file (just a placeholder)
  const mockVideoBuffer = Buffer.alloc(4096);
  await writeFile(options.outputPath, mockVideoBuffer);

  const output: RenderOutput = {
    schemaVersion: RENDER_SCHEMA_VERSION,
    outputPath: options.outputPath,
    duration: totalDuration,
    width: dimensions.width,
    height: dimensions.height,
    fps,
    fileSize: mockVideoBuffer.length,
    codec: 'h264',
    archetype: options.archetype,
  };

  log.info(
    {
      duration: output.duration,
      fileSize: output.fileSize,
    },
    'Mock video render complete'
  );

  return RenderOutputSchema.parse(output);
}
