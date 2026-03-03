import { describe, it, expect } from 'vitest';
import { normalizeScenes, summarizeWords } from '../../../src/score/timestamps';

describe('score timestamps', () => {
  it('returns existing scenes when present', () => {
    const scenes = [{ sceneId: 'scene-1', audioStart: 0, audioEnd: 1, words: [] }];
    const result = normalizeScenes({
      schemaVersion: 'audio-v1',
      scenes,
      allWords: [],
      totalDuration: 1,
      ttsEngine: 'external',
      asrEngine: 'whisper',
    });
    expect(result).toBe(scenes);
  });

  it('builds a fallback scene from allWords', () => {
    const result = normalizeScenes({
      schemaVersion: 'audio-v1',
      scenes: [],
      allWords: [
        { word: 'Hi', start: 1, end: 2 },
        { word: 'there', start: 2, end: 3 },
      ],
      totalDuration: 2,
      ttsEngine: 'external',
      asrEngine: 'whisper',
    });
    expect(result).toHaveLength(1);
    expect(result[0].audioStart).toBe(1);
    expect(result[0].audioEnd).toBe(3);
  });

  it('summarizes word duration', () => {
    expect(summarizeWords([]).totalDuration).toBe(0);
    expect(summarizeWords([{ word: 'Hi', start: 1, end: 3 }]).totalDuration).toBe(2);
  });
});
