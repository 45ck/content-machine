import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TimestampsOutput } from '../../../src/domain';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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
    expect(output.scenes[1].assetPath).toContain('abstract.mp4');
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

    expect(output.fallbacks).toBe(2);
    expect(output.scenes[0].assetPath).toBe('#1a1a2e');
    expect(output.scenes[1].assetPath).toBe('#1a1a2e');
  });

  it('tries fallback providers in order when the primary provider returns no results', async () => {
    const pexelsSearch = vi.fn().mockResolvedValue([]);
    const nanoSearch = vi.fn().mockResolvedValue([
      {
        id: 'img-1',
        url: '/tmp/generated.png',
        type: 'image',
        width: 1080,
        height: 1920,
        metadata: { model: 'gemini-2.5-flash-image', prompt: 'p', cacheHit: false },
      },
    ]);

    createAssetProviderMock.mockImplementation((name: string) => {
      if (name === 'pexels') {
        return {
          name: 'pexels',
          assetType: 'video',
          requiresMotion: false,
          costPerAsset: 0,
          search: pexelsSearch,
          isAvailable: () => true,
          estimateCost: () => 0,
        };
      }
      return {
        name: 'nanobanana',
        assetType: 'image',
        requiresMotion: true,
        costPerAsset: 0.04,
        search: nanoSearch,
        isAvailable: () => true,
        estimateCost: (n: number) => n * 0.04,
      };
    });

    extractKeywordsMock.mockResolvedValue([
      { keyword: 'laptop typing', sectionId: 'scene-1', startTime: 0, endTime: 2 },
      { keyword: 'city skyline', sectionId: 'scene-2', startTime: 2, endTime: 4 },
    ]);

    const { matchVisuals } = await import('../../../src/visuals/matcher');
    const output = await matchVisuals({
      timestamps: buildTimestamps(),
      providers: ['pexels', 'nanobanana'],
      motionStrategy: 'kenburns',
    });

    expect(output.fromGenerated).toBe(2);
    expect(output.fromStock).toBe(0);
    expect(output.scenes[0].assetType).toBe('image');
    expect(output.scenes[0].motionStrategy).toBe('kenburns');
    expect(pexelsSearch).toHaveBeenCalled();
    expect(nanoSearch).toHaveBeenCalled();
  });

  it('uses local manifest sceneId mappings without calling providers', async () => {
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
      { keyword: 'unused', sectionId: 'scene-1', startTime: 0, endTime: 2 },
      { keyword: 'unused', sectionId: 'scene-2', startTime: 2, endTime: 4 },
    ]);

    const dir = await mkdtemp(join(tmpdir(), 'cm-manifest-'));
    const img = join(dir, 'scene-1.png');
    const vid = join(dir, 'scene-2.mp4');
    await writeFile(img, 'x');
    await writeFile(vid, 'x');
    const manifestPath = join(dir, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify({ 'scene-1': img, 'scene-2': vid }), 'utf8');

    const { matchVisuals } = await import('../../../src/visuals/matcher');
    const output = await matchVisuals({
      timestamps: buildTimestamps(),
      providers: ['pexels'],
      localManifest: manifestPath,
      motionStrategy: 'kenburns',
    });

    expect(searchMock).not.toHaveBeenCalled();
    expect((output as any).fromUserFootage).toBe(2);
    expect(output.fromStock).toBe(0);
    expect(output.fromGenerated).toBe(0);
    expect(output.scenes[0].assetType).toBe('image');
    expect(output.scenes[1].assetType).toBe('video');
  });
});
