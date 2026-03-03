import type { SceneTimestamp, TimestampsOutput } from '../domain';

export type TimestampWord = SceneTimestamp['words'][number];

export function normalizeScenes(timestamps: TimestampsOutput): SceneTimestamp[] {
  if (timestamps.scenes && timestamps.scenes.length > 0) return timestamps.scenes;
  if (timestamps.allWords.length === 0) return [];

  return [
    {
      sceneId: 'scene-001',
      audioStart: timestamps.allWords[0].start,
      audioEnd: timestamps.allWords[timestamps.allWords.length - 1].end,
      words: timestamps.allWords,
    },
  ];
}

export function summarizeWords(words: TimestampWord[]): { totalDuration: number } {
  if (words.length === 0) return { totalDuration: 0 };
  return { totalDuration: words[words.length - 1].end - words[0].start };
}
