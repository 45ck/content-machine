/**
 * Scene Timestamp Builder Tests
 *
 * Verifies that we never drop trailing ASR words when assigning words to scenes.
 * This prevents the regression where visuals ended early while audio continued.
 */

import { describe, expect, it } from 'vitest';
import type { WordTimestamp } from '../../../src/audio/schema';
import type { SpokenSection } from '../../../src/audio/pipeline';
import { buildSceneTimestamps } from '../../../src/audio/pipeline';

describe('buildSceneTimestamps', () => {
  it('appends remaining words to the last scene', () => {
    const words: WordTimestamp[] = [
      { word: 'one', start: 0, end: 0.5, confidence: 0.9 },
      { word: 'two', start: 0.5, end: 1.0, confidence: 0.9 },
      { word: 'three', start: 1.0, end: 1.5, confidence: 0.9 },
      { word: 'four', start: 1.5, end: 2.0, confidence: 0.9 },
      { word: 'five', start: 2.0, end: 2.5, confidence: 0.9 }, // leftover
    ];

    const sections: SpokenSection[] = [
      { id: 'scene-1', text: 'one two' },
      { id: 'scene-2', text: 'three four' },
    ];

    const result = buildSceneTimestamps(words, sections, 2.5);

    expect(result.length).toBe(2);
    expect(result[1].words.map((w) => w.word)).toEqual(['three', 'four', 'five']);
    expect(result[1].audioEnd).toBe(2.5);

    const allAssigned = result.flatMap((s) => s.words);
    expect(allAssigned.map((w) => w.word)).toEqual(words.map((w) => w.word));
  });
});
