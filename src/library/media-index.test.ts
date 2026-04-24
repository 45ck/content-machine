import { describe, expect, it } from 'vitest';
import { buildMediaIndex } from './media-index';

describe('buildMediaIndex', () => {
  it('indexes source analysis metadata by media path', () => {
    const result = buildMediaIndex([
      {
        path: 'input/source.mp4',
        tags: ['source'],
        analysis: {
          schemaVersion: '1.0.0',
          mediaPath: 'input/source.mp4',
          analyzedAt: '2026-04-24T00:00:00.000Z',
          probe: {
            engine: 'ffprobe',
            durationSeconds: 30,
            width: 1080,
            height: 1920,
            fps: 30,
            hasAudio: true,
            hasVideo: true,
            orientation: 'portrait',
            videoCodec: 'h264',
            audioCodec: 'aac',
            container: 'mp4',
          },
          sourceSignals: {
            audioEnergyScore: 0.5,
            sceneChangeScore: 1,
            sampledFrameCount: 120,
            estimatedSceneCount: 8,
          },
          warnings: [],
        },
        indexedAt: '2026-04-24T00:00:00.000Z',
      },
    ]);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.type).toBe('video');
    expect(result.items[0]?.orientation).toBe('portrait');
    expect(result.items[0]?.tags).toEqual(['source']);
  });
});
