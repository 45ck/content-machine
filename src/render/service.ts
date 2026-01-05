/**
 * Render Service
 * 
 * Coordinates video rendering with Remotion.
 */
import { stat } from 'fs/promises';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { VisualsOutput } from '../visuals/schema';
import { TimestampsOutput } from '../audio/schema';
import { Orientation } from '../core/config';
import { createLogger } from '../core/logger';
import { RenderError } from '../core/errors';
import { RenderOutput, RenderOutputSchema, RenderProps, CaptionStyle } from './schema';
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
  
  log.info({ 
    orientation: options.orientation, 
    fps, 
    duration: options.timestamps.duration,
    clipCount: options.visuals.clips.length 
  }, 'Starting video render');
  
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
      clips: options.visuals.clips,
      words: options.timestamps.words,
      audioPath: options.audioPath,
      duration: options.timestamps.duration,
      width: dimensions.width,
      height: dimensions.height,
      fps,
      captionStyle: {
        fontFamily: 'Inter',
        fontSize: 48,
        fontWeight: 'bold',
        color: '#FFFFFF',
        highlightColor: '#FFE135',
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
    const durationInFrames = Math.ceil(options.timestamps.duration * fps);
    
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
      outputPath: options.outputPath,
      duration: options.timestamps.duration,
      width: dimensions.width,
      height: dimensions.height,
      fps,
      fileSize: stats.size,
      codec: 'h264',
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
