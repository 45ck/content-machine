/**
 * Visuals Schema Tests
 * Updated for SYSTEM-DESIGN §6.5 VisualPlanSchema
 */
import { describe, it, expect } from 'vitest';
import {
  VisualAssetSchema,
  MatchReasoningSchema,
  VideoClipSchema,
  KeywordSchema,
  VisualsOutputSchema,
  VISUALS_SCHEMA_VERSION,
  type VisualAssetInput,
  type MatchReasoning,
  type VideoClip,
  type Keyword,
  type VisualsOutputInput,
} from './schema';

// Test constants to avoid duplicate literals
const TEST_SCENE_ID = 'scene-001';
const TEST_SOURCE_PEXELS = 'stock-pexels';

describe('MatchReasoningSchema', () => {
  it('should validate correct match reasoning', () => {
    const reasoning: MatchReasoning = {
      reasoning: 'Selected video showing developer at laptop',
      conceptsMatched: ['developer', 'coding', 'laptop'],
      moodAlignment: 'focused, professional',
    };

    const result = MatchReasoningSchema.safeParse(reasoning);
    expect(result.success).toBe(true);
  });

  it('should allow minimal reasoning', () => {
    const reasoning = {
      reasoning: 'Best match found',
    };

    const result = MatchReasoningSchema.safeParse(reasoning);
    expect(result.success).toBe(true);
  });
});

describe('VisualAssetSchema', () => {
  it('should validate correct visual asset', () => {
    const asset: VisualAssetInput = {
      sceneId: TEST_SCENE_ID,
      source: TEST_SOURCE_PEXELS,
      assetPath: `assets/${TEST_SCENE_ID}.mp4`,
      duration: 5.0,
      matchReasoning: {
        reasoning: 'Found matching video',
      },
    };

    const result = VisualAssetSchema.safeParse(asset);
    expect(result.success).toBe(true);
  });

  it('should validate fallback-color source', () => {
    const asset: VisualAssetInput = {
      sceneId: 'scene-002',
      source: 'fallback-color',
      assetPath: '#1a1a2e',
      duration: 3.0,
    };

    const result = VisualAssetSchema.safeParse(asset);
    expect(result.success).toBe(true);
  });

  it('should allow optional trim settings', () => {
    const asset: VisualAssetInput = {
      sceneId: TEST_SCENE_ID,
      source: TEST_SOURCE_PEXELS,
      assetPath: `assets/${TEST_SCENE_ID}.mp4`,
      duration: 5.0,
      trimStart: 2.0,
      trimEnd: 7.0,
      trimReasoning: 'Best segment of the clip',
    };

    const result = VisualAssetSchema.safeParse(asset);
    expect(result.success).toBe(true);
  });
});

describe('VideoClipSchema (legacy)', () => {
  it('should validate correct video clip', () => {
    const clip: VideoClip = {
      id: 'clip-001',
      url: 'https://example.com/video.mp4',
      duration: 5.0,
      width: 1080,
      height: 1920,
      startTime: 0,
      endTime: 5.0,
      source: 'pexels',
      sourceId: '12345',
      searchQuery: 'coding developer',
    };

    const result = VideoClipSchema.safeParse(clip);
    expect(result.success).toBe(true);
  });

  it('should allow optional thumbnailUrl', () => {
    const clip: VideoClip = {
      id: 'clip-001',
      url: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      duration: 5.0,
      width: 1080,
      height: 1920,
      startTime: 0,
      endTime: 5.0,
      source: 'pexels',
      sourceId: '12345',
      searchQuery: 'coding developer',
    };

    const result = VideoClipSchema.safeParse(clip);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.thumbnailUrl).toBe('https://example.com/thumb.jpg');
    }
  });
});

describe('KeywordSchema', () => {
  it('should validate correct keyword', () => {
    const keyword: Keyword = {
      keyword: 'developer laptop',
      sectionId: TEST_SCENE_ID,
      startTime: 0,
      endTime: 5.0,
    };

    const result = KeywordSchema.safeParse(keyword);
    expect(result.success).toBe(true);
  });

  it('should allow optional visualHint', () => {
    const keyword: Keyword = {
      keyword: 'developer laptop',
      sectionId: TEST_SCENE_ID,
      startTime: 0,
      endTime: 5.0,
      visualHint: 'professional office environment',
    };

    const result = KeywordSchema.safeParse(keyword);
    expect(result.success).toBe(true);
  });
});

describe('VisualsOutputSchema', () => {
  it('should validate correct visuals output (new schema)', () => {
    const output: VisualsOutputInput = {
      schemaVersion: VISUALS_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: TEST_SCENE_ID,
          source: TEST_SOURCE_PEXELS,
          assetPath: `assets/${TEST_SCENE_ID}.mp4`,
          duration: 5.0,
          matchReasoning: {
            reasoning: 'Found matching video',
          },
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
    };

    const result = VisualsOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('should allow optional gameplay clip', () => {
    const output: VisualsOutputInput = {
      schemaVersion: VISUALS_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: TEST_SCENE_ID,
          source: TEST_SOURCE_PEXELS,
          assetPath: `assets/${TEST_SCENE_ID}.mp4`,
          duration: 5.0,
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
      gameplayClip: {
        path: 'assets/gameplay/clip-001.mp4',
        duration: 12,
        width: 1080,
        height: 1920,
        style: 'subway-surfers',
      },
    };

    const result = VisualsOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
  });

  it('should include keywords and totalDuration', () => {
    const output: VisualsOutputInput = {
      schemaVersion: VISUALS_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: TEST_SCENE_ID,
          source: TEST_SOURCE_PEXELS,
          assetPath: `assets/${TEST_SCENE_ID}.mp4`,
          duration: 5.0,
        },
      ],
      totalAssets: 1,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 0,
      keywords: [
        {
          keyword: 'developer laptop',
          sectionId: TEST_SCENE_ID,
          startTime: 0,
          endTime: 5.0,
        },
      ],
      totalDuration: 5.0,
    };

    const result = VisualsOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keywords?.length).toBe(1);
      expect(result.data.totalDuration).toBe(5.0);
    }
  });

  it('should allow mixed sources', () => {
    const output: VisualsOutputInput = {
      schemaVersion: VISUALS_SCHEMA_VERSION,
      scenes: [
        {
          sceneId: TEST_SCENE_ID,
          source: TEST_SOURCE_PEXELS,
          assetPath: `assets/${TEST_SCENE_ID}.mp4`,
          duration: 3.0,
        },
        {
          sceneId: 'scene-002',
          source: 'fallback-color',
          assetPath: '#1a1a2e',
          duration: 2.0,
        },
      ],
      totalAssets: 2,
      fromUserFootage: 0,
      fromStock: 1,
      fallbacks: 1,
    };

    const result = VisualsOutputSchema.safeParse(output);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fromStock).toBe(1);
      expect(result.data.fallbacks).toBe(1);
    }
  });
});
