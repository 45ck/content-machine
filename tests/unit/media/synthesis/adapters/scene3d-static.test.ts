import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MediaSynthesisRequest } from '../../../../../src/media/synthesis/types';

const execFfmpeg = vi.fn(async () => ({ stdout: '', stderr: '' }));

vi.mock('../../../../../src/core/video/ffmpeg', () => ({
  execFfmpeg,
}));

describe('Scene3dStaticAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a deterministic clip from a scene spec', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-scene3d-'));
    const specPath = join(dir, 'scene.json');
    await writeFile(specPath, JSON.stringify({ backgroundColor: '#112233' }), 'utf8');

    const { Scene3dStaticAdapter } = await import(
      '../../../../../src/media/synthesis/adapters/scene3d-static'
    );
    const adapter = new Scene3dStaticAdapter();

    const result = await adapter.submit({
      kind: 'scene-to-video',
      sceneSpecPath: specPath,
      durationSeconds: 3,
      width: 1080,
      height: 1920,
      outputPath: join(dir, 'out.mp4'),
    });

    expect(result.outputPath).toContain('out.mp4');
    expect(execFfmpeg).toHaveBeenCalledWith(
      expect.arrayContaining(['-i', expect.stringContaining('color=c=0x112233:s=1080x1920:r=30')]),
      expect.objectContaining({ dependencyMessage: expect.stringContaining('scene-to-video') })
    );
  });

  it('rejects unsupported request kinds', async () => {
    const { Scene3dStaticAdapter } = await import(
      '../../../../../src/media/synthesis/adapters/scene3d-static'
    );
    const adapter = new Scene3dStaticAdapter();

    const request: MediaSynthesisRequest = {
      kind: 'text-to-video',
      prompt: 'test',
      durationSeconds: 2,
      width: 720,
      height: 1280,
      outputPath: '/tmp/out.mp4',
    };

    await expect(adapter.submit(request)).rejects.toThrow(/only supports scene-to-video/i);
  });

  it('fails fast for invalid scene spec JSON', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-scene3d-'));
    const specPath = join(dir, 'scene.json');
    await writeFile(specPath, '{ not-json', 'utf8');

    const { Scene3dStaticAdapter } = await import(
      '../../../../../src/media/synthesis/adapters/scene3d-static'
    );
    const adapter = new Scene3dStaticAdapter();

    await expect(
      adapter.submit({
        kind: 'scene-to-video',
        sceneSpecPath: specPath,
        durationSeconds: 2,
        width: 720,
        height: 1280,
        outputPath: join(dir, 'out.mp4'),
      })
    ).rejects.toThrow(/Invalid scene spec JSON/);
  });
});
