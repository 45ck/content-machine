import { mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { execFfmpeg } from '../../../core/video/ffmpeg';
import type { MediaSynthesisAdapter, MediaSynthesisRequest } from '../types';

interface Scene3dStaticAdapterOptions {
  ffmpegPath?: string;
}

type SceneSpec = {
  backgroundColor?: string;
};

function sanitizeColor(input: string | undefined): string {
  const value = String(input ?? '').trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return `0x${value.slice(1)}`;
  }
  if (/^[a-zA-Z]+$/.test(value)) {
    return value.toLowerCase();
  }
  return 'black';
}

async function readSceneSpec(path: string): Promise<SceneSpec> {
  const raw = await readFile(path, 'utf8');
  try {
    const parsed = JSON.parse(raw) as SceneSpec;
    return parsed ?? {};
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid scene spec JSON at "${path}": ${detail}`);
  }
}

/**
 * Deterministic local scene-to-video adapter placeholder.
 *
 * This provides a stable contract for scene-to-video requests so higher-level
 * orchestration can integrate 3D backends without waiting for Blender/Timesnap.
 */
export class Scene3dStaticAdapter implements MediaSynthesisAdapter {
  readonly name = 'scene3d-static';
  readonly capabilities = ['scene-to-video'] as const;

  constructor(private readonly options: Scene3dStaticAdapterOptions = {}) {}

  async submit(request: MediaSynthesisRequest): Promise<{ outputPath: string }> {
    if (request.kind !== 'scene-to-video') {
      throw new Error('scene3d-static adapter only supports scene-to-video requests');
    }

    await mkdir(dirname(request.outputPath), { recursive: true });
    const spec = await readSceneSpec(request.sceneSpecPath);
    const color = sanitizeColor(spec.backgroundColor);

    await execFfmpeg(
      [
        '-y',
        '-f',
        'lavfi',
        '-i',
        `color=c=${color}:s=${request.width}x${request.height}:r=30`,
        '-t',
        request.durationSeconds.toFixed(3),
        '-pix_fmt',
        'yuv420p',
        request.outputPath,
      ],
      {
        ffmpegPath: this.options.ffmpegPath,
        dependencyMessage: 'ffmpeg is required for scene-to-video synthesis',
        timeoutMs: 120_000,
      }
    );

    return { outputPath: request.outputPath };
  }
}
