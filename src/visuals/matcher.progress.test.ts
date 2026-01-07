/**
 * Visual matcher progress callback tests
 */

import { describe, expect, it, vi } from 'vitest';
import { matchVisuals } from './matcher';
import { AUDIO_SCHEMA_VERSION, type TimestampsOutput } from '../audio/schema';

describe('matchVisuals() progress reporting', () => {
  it('calls onProgress in mock mode', async () => {
    const timestamps: TimestampsOutput = {
      schemaVersion: AUDIO_SCHEMA_VERSION,
      scenes: [
        { sceneId: 'scene-001', audioStart: 0, audioEnd: 2, words: [] },
        { sceneId: 'scene-002', audioStart: 2, audioEnd: 4, words: [] },
      ],
      allWords: [],
      totalDuration: 4,
      ttsEngine: 'mock',
      asrEngine: 'mock',
    };

    const onProgress = vi.fn();

    await matchVisuals({
      timestamps,
      mock: true,
      onProgress,
    });

    expect(onProgress).toHaveBeenCalled();
  });
});
