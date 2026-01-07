/**
 * @file Unit tests for keyword extraction module
 */
import { describe, it, expect } from 'vitest';
import { generateMockKeywords } from '../../../src/visuals/keywords.js';
import type { SceneTimestamp } from '../../../src/audio/schema.js';

describe('generateMockKeywords', () => {
  it('generates keywords for each scene', () => {
    const scenes: SceneTimestamp[] = [
      { sceneId: 'scene1', audioStart: 0, audioEnd: 5, words: [] },
      { sceneId: 'scene2', audioStart: 5, audioEnd: 10, words: [] },
      { sceneId: 'scene3', audioStart: 10, audioEnd: 15, words: [] },
    ];

    const keywords = generateMockKeywords(scenes);

    expect(keywords).toHaveLength(3);
    expect(keywords[0]).toMatchObject({
      sectionId: 'scene1',
      startTime: 0,
      endTime: 5,
    });
    expect(keywords[0].keyword).toBeDefined();
    expect(typeof keywords[0].keyword).toBe('string');
  });

  it('returns empty array for empty scenes', () => {
    const scenes: SceneTimestamp[] = [];

    const keywords = generateMockKeywords(scenes);

    expect(keywords).toEqual([]);
  });

  it('preserves scene timing information', () => {
    const scenes: SceneTimestamp[] = [
      { sceneId: 'intro', audioStart: 0.5, audioEnd: 3.2, words: [] },
      { sceneId: 'main', audioStart: 3.2, audioEnd: 8.7, words: [] },
    ];

    const keywords = generateMockKeywords(scenes);

    expect(keywords[0]).toMatchObject({
      sectionId: 'intro',
      startTime: 0.5,
      endTime: 3.2,
    });
    expect(keywords[1]).toMatchObject({
      sectionId: 'main',
      startTime: 3.2,
      endTime: 8.7,
    });
  });

  it('generates numbered mock keywords', () => {
    const scenes: SceneTimestamp[] = [
      { sceneId: 'a', audioStart: 0, audioEnd: 5, words: [] },
      { sceneId: 'b', audioStart: 5, audioEnd: 10, words: [] },
      { sceneId: 'c', audioStart: 10, audioEnd: 15, words: [] },
    ];

    const keywords = generateMockKeywords(scenes);

    expect(keywords[0].keyword).toBe('mock keyword 1');
    expect(keywords[1].keyword).toBe('mock keyword 2');
    expect(keywords[2].keyword).toBe('mock keyword 3');
  });

  it('maps audioStart/audioEnd to startTime/endTime', () => {
    const scenes: SceneTimestamp[] = [
      { sceneId: 'test', audioStart: 2.5, audioEnd: 7.8, words: [] },
    ];

    const keywords = generateMockKeywords(scenes);

    expect(keywords[0].startTime).toBe(2.5);
    expect(keywords[0].endTime).toBe(7.8);
  });
});
