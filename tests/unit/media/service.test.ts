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

  it('skips image motion synthesis when disabled', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const imagePath = join(dir, 'scene.jpg');
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
            duration: 5,
            motionStrategy: 'depthflow',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 1,
        totalDuration: 5,
      },
      outputDir: join(dir, 'media'),
      synthesizeImageMotion: false,
    });

    expect(manifest.videosSynthesized).toBe(0);
    expect(manifest.scenes[0].status).toBe('skipped-motion-strategy');
  });

  it('marks remote image i2v as failed because local input is required', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const { synthesizeMediaManifest } = await import('../../../src/media/service');
    const manifest = await synthesizeMediaManifest({
      visuals: {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'stock-pexels',
            assetPath: 'https://example.com/image.jpg',
            assetType: 'image',
            duration: 5,
            motionStrategy: 'veo',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 1,
        fallbacks: 0,
        fromGenerated: 0,
        totalDuration: 5,
      },
      outputDir: join(dir, 'media'),
      synthesizeImageMotion: true,
    });

    expect(manifest.videosSynthesized).toBe(0);
    expect(manifest.scenes[0].status).toBe('failed');
    expect(manifest.scenes[0].error).toMatch(/requires local image assets/);
  });

  it('marks missing local video asset as failed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const { synthesizeMediaManifest } = await import('../../../src/media/service');
    const manifest = await synthesizeMediaManifest({
      visuals: {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'user-footage',
            assetPath: join(dir, 'missing.mp4'),
            assetType: 'video',
            duration: 3,
            motionStrategy: 'none',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 1,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 0,
        totalDuration: 3,
      },
      outputDir: join(dir, 'media'),
    });

    expect(manifest.keyframesExtracted).toBe(0);
    expect(manifest.scenes[0].status).toBe('failed');
    expect(manifest.scenes[0].error).toMatch(/Local video asset not found/);
  });

  it('marks non-video file with video asset type as skipped non-video', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const txtPath = join(dir, 'notes.txt');
    await writeFile(txtPath, 'not a video');

    const { synthesizeMediaManifest } = await import('../../../src/media/service');
    const manifest = await synthesizeMediaManifest({
      visuals: {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'user-footage',
            assetPath: txtPath,
            assetType: 'video',
            duration: 3,
            motionStrategy: 'none',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 1,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 0,
        totalDuration: 3,
      },
      outputDir: join(dir, 'media'),
    });

    expect(manifest.scenes[0].status).toBe('skipped-non-video');
  });

  it('captures ffmpeg errors as failed video scene status', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const videoPath = join(dir, 'clip.mp4');
    await writeFile(videoPath, 'fake-video');

    const { execFfmpeg } = await import('../../../src/core/video/ffmpeg');
    (execFfmpeg as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ffmpeg failed')
    );

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

    expect(manifest.scenes[0].status).toBe('failed');
    expect(manifest.scenes[0].error).toMatch(/ffmpeg failed/);
  });

  it('passes through video scenes when keyframe extraction is disabled', async () => {
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
      extractVideoKeyframes: false,
    });

    expect(manifest.keyframesExtracted).toBe(0);
    expect(manifest.scenes[0].status).toBe('passthrough');
  });

  it('marks plain image scenes without advanced motion as skipped non-video', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'cm-media-'));
    const imagePath = join(dir, 'still.jpg');
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
            duration: 3,
            motionStrategy: 'none',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 0,
        fromGenerated: 1,
        totalDuration: 3,
      },
      outputDir: join(dir, 'media'),
    });

    expect(manifest.scenes[0].status).toBe('skipped-non-video');
    expect(manifest.scenes[0].assetType).toBe('image');
  });

  it('keeps original visual scene when media manifest has no synthesized video path', async () => {
    const { applyMediaManifestToVisuals } = await import('../../../src/media/service');
    const rewritten = applyMediaManifestToVisuals(
      {
        schemaVersion: '1.1.0',
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'stock-pexels',
            assetPath: '/tmp/input.mp4',
            assetType: 'video',
            duration: 3,
            motionStrategy: 'none',
            motionApplied: false,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 1,
        fallbacks: 0,
        fromGenerated: 0,
        totalDuration: 3,
      },
      {
        schemaVersion: '1.0.0',
        generatedAt: '2026-02-12T00:00:00.000Z',
        totalScenes: 1,
        keyframesExtracted: 0,
        videosSynthesized: 0,
        scenes: [
          {
            sceneId: 'scene-1',
            assetPath: '/tmp/input.mp4',
            assetType: 'video',
            motionStrategy: 'none',
            status: 'passthrough',
          },
        ],
      }
    );

    expect(rewritten.scenes[0].assetPath).toBe('/tmp/input.mp4');
    expect(rewritten.scenes[0].assetType).toBe('video');
    expect(rewritten.scenes[0].motionApplied).toBe(false);
  });
});
