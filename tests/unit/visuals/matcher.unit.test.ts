import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TimestampsOutput } from '../../../src/domain';

const extractKeywordsMock = vi.fn();
const createVideoProviderMock = vi.fn();
const selectGameplayClipMock = vi.fn();

vi.mock('../../../src/visuals/keywords.js', () => ({
  extractKeywords: extractKeywordsMock,
  generateMockKeywords: vi.fn(),
}));

vi.mock('../../../src/visuals/providers/index.js', () => ({
  createVideoProvider: createVideoProviderMock,
}));

vi.mock('../../../src/visuals/gameplay.js', () => ({
  selectGameplayClip: selectGameplayClipMock,
}));

function buildTimestamps(): TimestampsOutput {
  return {
    schemaVersion: '1.0.0',
    scenes: [
      { sceneId: 'scene-1', audioStart: 0, audioEnd: 2, words: [] },
      { sceneId: 'scene-2', audioStart: 2, audioEnd: 4, words: [] },
    ],
    allWords: [],
    totalDuration: 4,
    ttsEngine: 'mock',
    asrEngine: 'mock',
  };
}

describe('matchVisuals', () => {
  beforeEach(() => {
    extractKeywordsMock.mockReset();
    createVideoProviderMock.mockReset();
    selectGameplayClipMock.mockResolvedValue(null);
  });

  it('matches keywords with the provider and reports progress', async () => {
    const searchMock = vi.fn().mockResolvedValue([{ url: 'https://example.com/clip.mp4' }]);
    createVideoProviderMock.mockReturnValue({ name: 'pexels', search: searchMock });

    extractKeywordsMock.mockResolvedValue([
      { keyword: 'laptop typing', sectionId: 'scene-1', startTime: 0, endTime: 2 },
      { keyword: 'city skyline', sectionId: 'scene-2', startTime: 2, endTime: 4 },
    ]);

    const onProgress = vi.fn();
    const { matchVisuals } = await import('../../../src/visuals/matcher');
    const output = await matchVisuals({ timestamps: buildTimestamps(), onProgress });

    expect(output.totalAssets).toBe(2);
    expect(output.fromStock).toBe(2);
    expect(output.fallbacks).toBe(0);
    expect(onProgress).toHaveBeenCalled();
    expect(searchMock).toHaveBeenCalled();
  });

  it('falls back to abstract results when the first search fails', async () => {
    const searchMock = vi.fn(async (params: { query: string }) => {
      if (params.query === 'abstract motion background') {
        return [{ url: 'https://example.com/abstract.mp4' }];
      }
      return [];
    });
    createVideoProviderMock.mockReturnValue({ name: 'pexels', search: searchMock });

    extractKeywordsMock.mockResolvedValue([
      { keyword: 'missing footage', sectionId: 'scene-1', startTime: 0, endTime: 2 },
    ]);

    const { matchVisuals } = await import('../../../src/visuals/matcher');
    const output = await matchVisuals({ timestamps: buildTimestamps() });

    expect(output.fallbacks).toBe(1);
    expect(output.scenes[0].assetPath).toContain('abstract.mp4');
  });

  it('uses solid color fallback when all searches fail', async () => {
    const searchMock = vi.fn().mockResolvedValue([]);
    createVideoProviderMock.mockReturnValue({ name: 'pexels', search: searchMock });

    extractKeywordsMock.mockResolvedValue([
      { keyword: 'missing footage', sectionId: 'scene-1', startTime: 0, endTime: 2 },
    ]);

    const { matchVisuals } = await import('../../../src/visuals/matcher');
    const output = await matchVisuals({ timestamps: buildTimestamps() });

    expect(output.fallbacks).toBe(1);
    expect(output.scenes[0].assetPath).toBe('#1a1a2e');
  });
});
