import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFfmpeg } from '../../../core/video/ffmpeg';
import type { MediaSynthesisAdapter, MediaSynthesisRequest } from '../types';

interface StaticVideoAdapterOptions {
  ffmpegPath?: string;
}

/**
 * Local fallback image-to-video adapter using ffmpeg.
 *
 * This adapter is deterministic and offline-capable, intended as the default
 * motion synthesizer when cloud adapters are unavailable.
 */
export class StaticVideoSynthesisAdapter implements MediaSynthesisAdapter {
  readonly name = 'static-video';
  readonly capabilities = ['image-to-video'] as const;

  constructor(private readonly options: StaticVideoAdapterOptions = {}) {}

  async submit(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    if (request.kind !== 'image-to-video') {
      throw new Error('static-video adapter only supports image-to-video requests');
    }

    await mkdir(dirname(request.outputPath), { recursive: true });

    await execFfmpeg(
      [
        '-y',
        '-loop',
        '1',
        '-i',
        request.inputImagePath,
        '-t',
        request.durationSeconds.toFixed(3),
        '-vf',
        `scale=${request.width}:${request.height}:force_original_aspect_ratio=increase,crop=${request.width}:${request.height}`,
        '-r',
        '30',
        '-pix_fmt',
        'yuv420p',
        request.outputPath,
      ],
      {
        ffmpegPath: this.options.ffmpegPath,
        dependencyMessage: 'ffmpeg is required for image-to-video synthesis',
        timeoutMs: 120_000,
      }
    );

    return { outputPath: request.outputPath };
  }
}
