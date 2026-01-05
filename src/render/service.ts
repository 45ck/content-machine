/**
 * Render Service
 * 
 * Coordinates video rendering with Remotion.
 * Based on SYSTEM-DESIGN §7.4 cm render command.
 */
import { stat, writeFile } from 'fs/promises';
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
  RENDER_SCHEMA_VERSION,
} from './schema';
import { join, dirname } from 'path';

export type { RenderOutput, RenderProps } from './schema';

export interface RenderVideoOptions {
  visuals: VisualsOutput;
  timestamps: TimestampsOutput;
  audioPath: string;
  outputPath: string;
  orientation: Orientation;
  fps?: number;
  captionStyle?: Partial<CaptionStyle>;
  archetype?: string;
  /** Use mock mode for testing without real rendering */
  mock?: boolean;
}

// Video dimensions by orientation
const DIMENSIONS: Record<Orientation, { width: number; height: number }> = {
  portrait: { width: 1080, height: 1920 },
  landscape: { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

/**
 * Render final video with Remotion
 */
export async function renderVideo(options: RenderVideoOptions): Promise<RenderOutput> {
  const log = createLogger({ module: 'render', outputPath: options.outputPath });
  
  const fps = options.fps ?? 30;
  const dimensions = DIMENSIONS[options.orientation];
  const totalDuration = options.timestamps.totalDuration;
  const allWords = options.timestamps.allWords;
  const sceneCount = options.visuals.scenes.length;
  
  log.info({ 
    orientation: options.orientation, 
    fps, 
    duration: totalDuration,
    sceneCount,
    mock: options.mock,
  }, 'Starting video render');
  
  // Mock mode for testing
  if (options.mock) {
    return generateMockRender(options, dimensions, fps, totalDuration);
  }
  
  try {
    // Step 1: Bundle the Remotion composition
    log.debug('Bundling Remotion composition');
    
    const bundleLocation = await bundle({
      entryPoint: join(__dirname, 'remotion/index.ts'),
      onProgress: (progress) => {
        log.debug({ progress: Math.round(progress * 100) }, 'Bundling progress');
      },
    });
    
    log.debug({ bundleLocation }, 'Bundle complete');
    
    // Step 2: Prepare render props
    const renderProps: RenderProps = {
      schemaVersion: RENDER_SCHEMA_VERSION,
      scenes: options.visuals.scenes,
      words: allWords,
      audioPath: options.audioPath,
      duration: totalDuration,
      width: dimensions.width,
      height: dimensions.height,
      fps,
      archetype: options.archetype,
      captionStyle: {
        fontFamily: 'Inter',
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        highlightColor: '#FFE135',
        highlightCurrentWord: true,
        strokeColor: '#000000',
        strokeWidth: 3,
        position: 'center',
        animation: 'pop',
        ...options.captionStyle,
      },
    };
    
    // Step 3: Get composition
    log.debug('Selecting composition');
    
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'ShortVideo',
      inputProps: renderProps,
    });
    
    // Override with our calculated values
    const durationInFrames = Math.ceil(totalDuration * fps);
    
    // Step 4: Render
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
      outputLocation: options.outputPath,
      inputProps: renderProps,
      onProgress: ({ progress }) => {
        log.debug({ progress: Math.round(progress * 100) }, 'Render progress');
      },
    });
    
    // Step 5: Get file info
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
    
    // Validate output
    const validated = RenderOutputSchema.parse(output);
    
    log.info({ 
      duration: validated.duration, 
      fileSize: validated.fileSize 
    }, 'Video render complete');
    
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
  
  log.info({ 
    duration: output.duration, 
    fileSize: output.fileSize 
  }, 'Mock video render complete');
  
  return RenderOutputSchema.parse(output);
}
