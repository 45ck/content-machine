import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../../../src/core/video/ffmpeg', () => ({
  execFfmpeg: vi.fn(async () => ({ stdout: '', stderr: '' })),
}));

describe('synthesizeMediaManifest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts keyframes for local video scenes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const videoPath = join(dir, 'clip.mp4');
    await writeFile(videoPath, 'fake-video');

    const { synthesizeMediaManifest } = await import('../../../src/media/service');
    const manifest = await synthesizeMediaManifest({
      visuals: {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'user-footage',
            assetPath: videoPath,
            assetType: 'video',
            duration: 4,
            motionStrategy: 'none',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 1,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 0,
        totalDuration: 4,
      },
      outputDir: join(dir, 'media'),
    });

    const { execFfmpeg } = await import('../../../src/core/video/ffmpeg');
    expect(execFfmpeg).toHaveBeenCalledTimes(1);
    expect(manifest.keyframesExtracted).toBe(1);
    expect(manifest.videosSynthesized).toBe(0);
    expect(manifest.scenes[0].status).toBe('keyframe-extracted');
    expect(manifest.scenes[0].keyframePath).toContain('scene-1-clip.jpg');
  });

  it('skips remote video scenes', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const { synthesizeMediaManifest } = await import('../../../src/media/service');
    const manifest = await synthesizeMediaManifest({
      visuals: {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'stock-pexels',
            assetPath: 'https://example.com/video.mp4',
            assetType: 'video',
            duration: 4,
            motionStrategy: 'none',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 1,
        fallbacks: 0,
        fromGenerated: 0,
        totalDuration: 4,
      },
      outputDir: join(dir, 'media'),
    });

    const { execFfmpeg } = await import('../../../src/core/video/ffmpeg');
    expect(execFfmpeg).not.toHaveBeenCalled();
    expect(manifest.keyframesExtracted).toBe(0);
    expect(manifest.videosSynthesized).toBe(0);
    expect(manifest.scenes[0].status).toBe('skipped-remote-video');
  });

  it('synthesizes image scenes when motion strategy needs media synthesis', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const imagePath = join(dir, 'scene.png');
    await writeFile(imagePath, 'fake-image');

    const { synthesizeMediaManifest } = await import('../../../src/media/service');
    const manifest = await synthesizeMediaManifest({
      visuals: {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'generated-nanobanana',
            assetPath: imagePath,
            assetType: 'image',
            duration: 4,
            motionStrategy: 'veo',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 1,
        totalDuration: 4,
      },
      outputDir: join(dir, 'media'),
      synthesizeImageMotion: true,
    });

    expect(manifest.keyframesExtracted).toBe(0);
    expect(manifest.videosSynthesized).toBe(1);
    expect(manifest.scenes[0].status).toBe('video-synthesized');
    expect(manifest.scenes[0].synthesizedVideoPath).toContain('scene-1-veo.mp4');
    expect(manifest.scenes[0].synthesisJobId).toBeTruthy();
  });

  it('rewrites visuals to synthesized videos for render', async () => {
    const { applyMediaManifestToVisuals } = await import('../../../src/media/service');
    const visuals = {
      schemaVersion: '1.1.0',
      scenes: [
        {
          sceneId: 'scene-1',
          source: 'generated-nanobanana' as const,
          assetPath: '/tmp/scene-1.png',
          assetType: 'image' as const,
          duration: 3,
          motionStrategy: 'veo' as const,
          motionApplied: false,
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 0,
      fallbacks: 0,
      fromGenerated: 1,
      totalDuration: 3,
    };
    const manifest = {
      schemaVersion: '1.0.0',
      generatedAt: '2026-02-12T00:00:00.000Z',
      totalScenes: 1,
      keyframesExtracted: 0,
      videosSynthesized: 1,
      scenes: [
        {
          sceneId: 'scene-1',
          assetPath: '/tmp/scene-1.png',
          assetType: 'image' as const,
          motionStrategy: 'veo' as const,
          synthesizedVideoPath: '/tmp/media/scene-1-veo.mp4',
          status: 'video-synthesized' as const,
        },
      ],
    };

    const rewritten = applyMediaManifestToVisuals(visuals, manifest);
    expect(rewritten.scenes[0].assetType).toBe('video');
    expect(rewritten.scenes[0].assetPath).toBe('/tmp/media/scene-1-veo.mp4');
    expect(rewritten.scenes[0].motionStrategy).toBe('none');
    expect(rewritten.scenes[0].motionApplied).toBe(true);
  });
});
