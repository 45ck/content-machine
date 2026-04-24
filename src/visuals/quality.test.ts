import { describe, expect, it } from 'vitest';
import { VisualsOutputSchema } from '../domain';
import { analyzeVisualsQuality } from './quality';

describe('analyzeVisualsQuality', () => {
  it('passes a portrait visual plan with strong coverage', () => {
    const visuals = VisualsOutputSchema.parse({
      schemaVersion: '1.1.0',
      scenes: [
        {
          sceneId: 'scene-1',
          source: 'stock-pexels',
          assetPath: 'https://example.com/portrait.mp4',
          duration: 3,
          assetType: 'video',
          llmConfidence: 0.8,
        },
      ],
      clips: [
        {
          id: 'clip-1',
          url: 'https://example.com/portrait.mp4',
          duration: 3,
          width: 1080,
          height: 1920,
          startTime: 0,
          endTime: 3,
          source: 'pexels',
          sourceId: '1',
          searchQuery: 'developer laptop',
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
      totalDuration: 3,
    });

    const report = analyzeVisualsQuality(visuals, { targetDurationSeconds: 3 });

    expect(report.passed).toBe(true);
    expect(report.score).toBe(1);
    expect(report.issues).toEqual([]);
  });

  it('flags fallback-heavy, low-confidence, non-portrait visuals', () => {
    const visuals = VisualsOutputSchema.parse({
      schemaVersion: '1.1.0',
      scenes: [
        {
          sceneId: 'scene-1',
          source: 'fallback-color',
          assetPath: '#111111',
          duration: 1,
          llmConfidence: 0.2,
        },
        {
          sceneId: 'scene-2',
          source: 'generated-dalle',
          assetPath: 'https://example.com/still.png',
          duration: 1,
          assetType: 'image',
          motionStrategy: 'none',
        },
      ],
      clips: [
        {
          id: 'clip-1',
          url: 'https://example.com/landscape.mp4',
          duration: 1,
          width: 1920,
          height: 1080,
          startTime: 0,
          endTime: 1,
          source: 'pexels',
          sourceId: '1',
          searchQuery: 'wide office',
        },
      ],
      totalAssets: 2,
      fromUserFootage: 0,
      fromStock: 0,
      fromGenerated: 1,
      fallbacks: 1,
      totalDuration: 2,
    });

    const report = analyzeVisualsQuality(visuals, { targetDurationSeconds: 5 });

    expect(report.passed).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'fallback-rate' }),
        expect.objectContaining({ type: 'duration-coverage' }),
        expect.objectContaining({ type: 'low-confidence' }),
        expect.objectContaining({ type: 'static-image-without-motion' }),
        expect.objectContaining({ type: 'non-portrait-clip' }),
      ])
    );
  });
});
