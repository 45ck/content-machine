/**
 * Extended Visual Schema Tests
 *
 * TDD tests for the extended visual provider system schema.
 * Tests are written BEFORE implementation (Red phase).
 */
import { describe, it, expect } from 'vitest';
import {
  VisualAssetSchema,
  VisualSourceEnum,
  MotionStrategyEnum,
  VisualsOutputSchema,
  VISUALS_SCHEMA_VERSION,
} from '../../../src/visuals/schema.js';

describe('Extended Visual Schema', () => {
  // ===========================================================================
  // VisualSourceEnum Tests
  // ===========================================================================

  describe('VisualSourceEnum', () => {
    it('accepts existing stock video sources', () => {
      expect(VisualSourceEnum.parse('stock-pexels')).toBe('stock-pexels');
      expect(VisualSourceEnum.parse('stock-pixabay')).toBe('stock-pixabay');
      expect(VisualSourceEnum.parse('user-footage')).toBe('user-footage');
      expect(VisualSourceEnum.parse('fallback-color')).toBe('fallback-color');
      expect(VisualSourceEnum.parse('mock')).toBe('mock');
    });

    it('accepts new AI-generated image sources', () => {
      expect(VisualSourceEnum.parse('generated-nanobanana')).toBe('generated-nanobanana');
      expect(VisualSourceEnum.parse('generated-dalle')).toBe('generated-dalle');
    });

    it('accepts stock image sources', () => {
      expect(VisualSourceEnum.parse('stock-unsplash')).toBe('stock-unsplash');
    });

    it('rejects invalid sources', () => {
      expect(() => VisualSourceEnum.parse('invalid-source')).toThrow();
      expect(() => VisualSourceEnum.parse('')).toThrow();
      expect(() => VisualSourceEnum.parse(null)).toThrow();
    });
  });

  // ===========================================================================
  // MotionStrategyEnum Tests
  // ===========================================================================

  describe('MotionStrategyEnum', () => {
    it('accepts valid motion strategies', () => {
      expect(MotionStrategyEnum.parse('none')).toBe('none');
      expect(MotionStrategyEnum.parse('kenburns')).toBe('kenburns');
      expect(MotionStrategyEnum.parse('depthflow')).toBe('depthflow');
      expect(MotionStrategyEnum.parse('veo')).toBe('veo');
    });

    it('rejects invalid strategies', () => {
      expect(() => MotionStrategyEnum.parse('invalid')).toThrow();
      expect(() => MotionStrategyEnum.parse('')).toThrow();
    });
  });

  // ===========================================================================
  // VisualAssetSchema Tests - Extended Fields
  // ===========================================================================

  describe('VisualAssetSchema extended fields', () => {
    const baseAsset = {
      sceneId: 'scene-1',
      source: 'stock-pexels',
      assetPath: 'https://example.com/video.mp4',
      duration: 5.0,
    };

    it('accepts assetType field with video value', () => {
      const asset = { ...baseAsset, assetType: 'video' };
      const result = VisualAssetSchema.parse(asset);
      expect(result.assetType).toBe('video');
    });

    it('accepts assetType field with image value', () => {
      const asset = { ...baseAsset, assetType: 'image', source: 'generated-nanobanana' };
      const result = VisualAssetSchema.parse(asset);
      expect(result.assetType).toBe('image');
    });

    it('defaults assetType to video when not provided', () => {
      const result = VisualAssetSchema.parse(baseAsset);
      expect(result.assetType).toBe('video');
    });

    it('accepts motionStrategy field', () => {
      const asset = {
        ...baseAsset,
        source: 'generated-nanobanana',
        assetType: 'image',
        motionStrategy: 'kenburns',
      };
      const result = VisualAssetSchema.parse(asset);
      expect(result.motionStrategy).toBe('kenburns');
    });

    it('accepts motionApplied field', () => {
      const asset = {
        ...baseAsset,
        source: 'generated-nanobanana',
        assetType: 'image',
        motionStrategy: 'kenburns',
        motionApplied: true,
      };
      const result = VisualAssetSchema.parse(asset);
      expect(result.motionApplied).toBe(true);
    });

    it('defaults motionApplied to false', () => {
      const result = VisualAssetSchema.parse(baseAsset);
      expect(result.motionApplied).toBe(false);
    });

    it('accepts generationPrompt field', () => {
      const asset = {
        ...baseAsset,
        source: 'generated-nanobanana',
        generationPrompt: 'A sunset over mountains, cinematic style',
      };
      const result = VisualAssetSchema.parse(asset);
      expect(result.generationPrompt).toBe('A sunset over mountains, cinematic style');
    });

    it('accepts generationModel field', () => {
      const asset = {
        ...baseAsset,
        source: 'generated-nanobanana',
        generationModel: 'gemini-2.5-flash-image',
      };
      const result = VisualAssetSchema.parse(asset);
      expect(result.generationModel).toBe('gemini-2.5-flash-image');
    });

    it('accepts generationCost field', () => {
      const asset = {
        ...baseAsset,
        source: 'generated-nanobanana',
        generationCost: 0.04,
      };
      const result = VisualAssetSchema.parse(asset);
      expect(result.generationCost).toBe(0.04);
    });

    it('rejects negative generationCost', () => {
      const asset = {
        ...baseAsset,
        generationCost: -0.01,
      };
      expect(() => VisualAssetSchema.parse(asset)).toThrow();
    });
  });

  // ===========================================================================
  // VisualsOutputSchema Tests
  // ===========================================================================

  describe('VisualsOutputSchema with extended sources', () => {
    it('accepts scenes with generated sources', () => {
      const output = {
        schemaVersion: VISUALS_SCHEMA_VERSION,
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'generated-nanobanana',
            assetPath: 'https://storage.example.com/generated-1.png',
            duration: 3.5,
            assetType: 'image',
            motionStrategy: 'kenburns',
            generationPrompt: 'test prompt',
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 0,
        fromGenerated: 1,
        fallbacks: 0,
      };

      const result = VisualsOutputSchema.parse(output);
      expect(result.scenes[0].source).toBe('generated-nanobanana');
    });

    it('tracks fromGenerated count', () => {
      const output = {
        schemaVersion: VISUALS_SCHEMA_VERSION,
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'generated-nanobanana',
            assetPath: 'image.png',
            duration: 3.0,
          },
          {
            sceneId: 'scene-2',
            source: 'generated-dalle',
            assetPath: 'image2.png',
            duration: 3.0,
          },
        ],
        totalAssets: 2,
        fromUserFootage: 0,
        fromStock: 0,
        fromGenerated: 2,
        fallbacks: 0,
      };

      const result = VisualsOutputSchema.parse(output);
      expect(result.fromGenerated).toBe(2);
    });

    it('accepts totalGenerationCost field', () => {
      const output = {
        schemaVersion: VISUALS_SCHEMA_VERSION,
        scenes: [],
        totalAssets: 0,
        fromUserFootage: 0,
        fromStock: 0,
        fromGenerated: 0,
        fallbacks: 0,
        totalGenerationCost: 0.32,
      };

      const result = VisualsOutputSchema.parse(output);
      expect(result.totalGenerationCost).toBe(0.32);
    });

    it('accepts motionStrategy at output level', () => {
      const output = {
        schemaVersion: VISUALS_SCHEMA_VERSION,
        scenes: [],
        totalAssets: 0,
        fromUserFootage: 0,
        fromStock: 0,
        fallbacks: 0,
        motionStrategy: 'depthflow',
      };

      const result = VisualsOutputSchema.parse(output);
      expect(result.motionStrategy).toBe('depthflow');
    });
  });

  // ===========================================================================
  // Backward Compatibility Tests
  // ===========================================================================

  describe('backward compatibility', () => {
    it('existing pexels assets still parse correctly', () => {
      const legacyAsset = {
        sceneId: 'scene-1',
        source: 'stock-pexels',
        assetPath: 'https://videos.pexels.com/video.mp4',
        duration: 5.0,
        matchReasoning: {
          reasoning: 'Found matching video',
        },
      };

      const result = VisualAssetSchema.parse(legacyAsset);
      expect(result.source).toBe('stock-pexels');
      expect(result.assetType).toBe('video'); // Default
      expect(result.motionApplied).toBe(false); // Default
    });

    it('existing output schema still parses correctly', () => {
      const legacyOutput = {
        schemaVersion: VISUALS_SCHEMA_VERSION,
        scenes: [
          {
            sceneId: 'scene-1',
            source: 'stock-pexels',
            assetPath: 'https://example.com/video.mp4',
            duration: 5.0,
          },
        ],
        totalAssets: 1,
        fromUserFootage: 0,
        fromStock: 1,
        fallbacks: 0,
      };

      // Should not throw - backward compatible
      expect(() => VisualsOutputSchema.parse(legacyOutput)).not.toThrow();
    });
  });
});
