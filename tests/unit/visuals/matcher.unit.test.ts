import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TimestampsOutput } from '../../../src/domain';

const { extractKeywordsMock, createAssetProviderMock, selectGameplayClipMock } = vi.hoisted(() => ({
  extractKeywordsMock: vi.fn(),
  createAssetProviderMock: vi.fn(),
  selectGameplayClipMock: vi.fn(),
}));

vi.mock('../../../src/visuals/keywords.js', () => ({
  extractKeywords: extractKeywordsMock,
  generateMockKeywords: vi.fn(),
}));

vi.mock('../../../src/visuals/providers/index.js', () => ({
  createAssetProvider: createAssetProviderMock,
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
    createAssetProviderMock.mockReset();
    selectGameplayClipMock.mockResolvedValue(null);
  });

  it('matches keywords with the provider and reports progress', async () => {
    const searchMock = vi.fn().mockResolvedValue([
      {
        id: 'clip-1',
        url: 'https://example.com/clip.mp4',
        type: 'video',
        width: 1080,
        height: 1920,
      },
    ]);
    createAssetProviderMock.mockReturnValue({
      name: 'pexels',
      assetType: 'video',
      requiresMotion: false,
      costPerAsset: 0,
      search: searchMock,
      isAvailable: () => true,
      estimateCost: () => 0,
    });

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
        return [
          {
            id: 'abs-1',
            url: 'https://example.com/abstract.mp4',
            type: 'video',
            width: 1080,
            height: 1920,
          },
        ];
      }
      return [];
    });
    createAssetProviderMock.mockReturnValue({
      name: 'pexels',
      assetType: 'video',
      requiresMotion: false,
      costPerAsset: 0,
      search: searchMock,
      isAvailable: () => true,
      estimateCost: () => 0,
    });

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
    createAssetProviderMock.mockReturnValue({
      name: 'pexels',
      assetType: 'video',
      requiresMotion: false,
      costPerAsset: 0,
      search: searchMock,
      isAvailable: () => true,
      estimateCost: () => 0,
    });

    extractKeywordsMock.mockResolvedValue([
      { keyword: 'missing footage', sectionId: 'scene-1', startTime: 0, endTime: 2 },
    ]);

    const { matchVisuals } = await import('../../../src/visuals/matcher');
    const output = await matchVisuals({ timestamps: buildTimestamps() });

    expect(output.fallbacks).toBe(1);
    expect(output.scenes[0].assetPath).toBe('#1a1a2e');
  });
});
