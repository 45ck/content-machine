/**
 * Render service progress callback tests
 */

import { describe, expect, it, vi } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { renderVideo } from './service';
import { VISUALS_SCHEMA_VERSION, type VisualsOutput } from '../visuals/schema';
import { AUDIO_SCHEMA_VERSION, type TimestampsOutput } from '../audio/schema';

describe('renderVideo() progress reporting', () => {
  it('calls onProgress in mock mode', async () => {
    const outDir = join(process.cwd(), 'tests', '.tmp', 'render-progress');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });

    const visuals: VisualsOutput = {
      schemaVersion: VISUALS_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: 'scene-001',
          source: 'mock',
          assetPath: 'mock://video.mp4',
          duration: 2,
          matchReasoning: { reasoning: 'mock', conceptsMatched: ['mock'] },
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
      keywords: [],
      totalDuration: 2,
    };

    const timestamps: TimestampsOutput = {
      schemaVersion: AUDIO_SCHEMA_VERSION,
      scenes: [{ sceneId: 'scene-001', audioStart: 0, audioEnd: 2, words: [] }],
      allWords: [],
      totalDuration: 2,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    };

    const onProgress = vi.fn();
    const outputPath = join(outDir, 'video.mp4');

    await renderVideo({
      visuals,
      timestamps,
      audioPath: join(outDir, 'audio.wav'),
      outputPath,
      orientation: 'portrait',
      mock: true,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
  });
});
