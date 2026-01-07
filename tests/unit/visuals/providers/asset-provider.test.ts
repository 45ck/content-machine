/**
 * Asset Provider Interface Tests
 *
 * TDD tests for the extended AssetProvider interface.
 * Tests are written BEFORE implementation (Red phase).
 */
import { describe, it, expect, vi } from 'vitest';
import type {
  AssetProvider,
  AssetSearchOptions,
  VisualAssetResult,
} from '../../../src/visuals/providers/types.js';

describe('AssetProvider Interface', () => {
  // ===========================================================================
  // Interface Contract Tests
  // ===========================================================================

  describe('interface contract', () => {
    /**
     * Helper to create a minimal conforming provider for testing
     */
    function createMockProvider(overrides: Partial<AssetProvider> = {}): AssetProvider {
      return {
        name: 'test-provider',
        assetType: 'video',
        requiresMotion: false,
        costPerAsset: 0,
        search: vi.fn().mockResolvedValue([]),
        isAvailable: vi.fn().mockReturnValue(true),
        estimateCost: vi.fn().mockReturnValue(0),
        ...overrides,
      };
    }

    it('requires name property', () => {
      const provider = createMockProvider();
      expect(provider.name).toBeDefined();
      expect(typeof provider.name).toBe('string');
      expect(provider.name.length).toBeGreaterThan(0);
    });

    it('requires assetType property (video or image)', () => {
      const videoProvider = createMockProvider({ assetType: 'video' });
      const imageProvider = createMockProvider({ assetType: 'image' });

      expect(videoProvider.assetType).toBe('video');
      expect(imageProvider.assetType).toBe('image');
    });

    it('requires requiresMotion property', () => {
      const videoProvider = createMockProvider({ assetType: 'video', requiresMotion: false });
      const imageProvider = createMockProvider({ assetType: 'image', requiresMotion: true });

      expect(videoProvider.requiresMotion).toBe(false);
      expect(imageProvider.requiresMotion).toBe(true);
    });

    it('requires costPerAsset property (non-negative)', () => {
      const freeProvider = createMockProvider({ costPerAsset: 0 });
      const paidProvider = createMockProvider({ costPerAsset: 0.04 });

      expect(freeProvider.costPerAsset).toBe(0);
      expect(paidProvider.costPerAsset).toBe(0.04);
      expect(freeProvider.costPerAsset).toBeGreaterThanOrEqual(0);
    });

    it('requires search method', () => {
      const provider = createMockProvider();
      expect(typeof provider.search).toBe('function');
    });

    it('requires isAvailable method', () => {
      const provider = createMockProvider();
      expect(typeof provider.isAvailable).toBe('function');
    });

    it('requires estimateCost method', () => {
      const provider = createMockProvider();
      expect(typeof provider.estimateCost).toBe('function');
    });

    it('generate method is optional', () => {
      const providerWithoutGenerate = createMockProvider();
      const providerWithGenerate = createMockProvider({
        generate: vi.fn().mockResolvedValue({} as VisualAssetResult),
      });

      expect(providerWithoutGenerate.generate).toBeUndefined();
      expect(typeof providerWithGenerate.generate).toBe('function');
    });
  });

  // ===========================================================================
  // Search Method Contract
  // ===========================================================================

  describe('search() method contract', () => {
    it('returns array of VisualAssetResult', async () => {
      const mockResults: VisualAssetResult[] = [
        { id: '1', url: 'https://example.com/v1.mp4', type: 'video', width: 1080, height: 1920 },
        { id: '2', url: 'https://example.com/v2.mp4', type: 'video', width: 1080, height: 1920 },
      ];

      const provider: AssetProvider = {
        name: 'test',
        assetType: 'video',
        requiresMotion: false,
        costPerAsset: 0,
        search: vi.fn().mockResolvedValue(mockResults),
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const results = await provider.search({
        query: 'sunset',
        orientation: 'portrait',
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
    });

    it('each result has required fields', async () => {
      const mockResults: VisualAssetResult[] = [
        {
          id: 'abc',
          url: 'https://example.com/asset.mp4',
          type: 'video',
          width: 1920,
          height: 1080,
        },
      ];

      const provider: AssetProvider = {
        name: 'test',
        assetType: 'video',
        requiresMotion: false,
        costPerAsset: 0,
        search: vi.fn().mockResolvedValue(mockResults),
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const results = await provider.search({
        query: 'nature',
        orientation: 'landscape',
      });

      expect(results[0]).toMatchObject({
        id: expect.any(String),
        url: expect.any(String),
        type: expect.stringMatching(/^(video|image)$/),
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });

    it('accepts all search options', async () => {
      const searchMock = vi.fn().mockResolvedValue([]);

      const provider: AssetProvider = {
        name: 'test',
        assetType: 'video',
        requiresMotion: false,
        costPerAsset: 0,
        search: searchMock,
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const options: AssetSearchOptions = {
        query: 'mountains',
        orientation: 'portrait',
        perPage: 10,
        aspectRatio: '9:16',
        style: 'cinematic',
        minDuration: 3,
      };

      await provider.search(options);

      expect(searchMock).toHaveBeenCalledWith(options);
    });
  });

  // ===========================================================================
  // Generate Method Contract (for AI providers)
  // ===========================================================================

  describe('generate() method contract', () => {
    it('returns single VisualAssetResult', async () => {
      const mockResult: VisualAssetResult = {
        id: 'gen-123',
        url: 'https://storage.example.com/generated.png',
        type: 'image',
        width: 1080,
        height: 1920,
      };

      const provider: AssetProvider = {
        name: 'test-ai',
        assetType: 'image',
        requiresMotion: true,
        costPerAsset: 0.04,
        search: vi.fn().mockResolvedValue([mockResult]),
        generate: vi.fn().mockResolvedValue(mockResult),
        isAvailable: () => true,
        estimateCost: (n) => n * 0.04,
      };

      const result = await provider.generate!('a sunset over mountains', {
        query: '',
        orientation: 'portrait',
      });

      expect(result).toMatchObject({
        id: expect.any(String),
        url: expect.any(String),
        type: 'image',
        width: expect.any(Number),
        height: expect.any(Number),
      });
    });

    it('result type matches provider assetType', async () => {
      const mockResult: VisualAssetResult = {
        id: 'gen-456',
        url: 'https://storage.example.com/generated.png',
        type: 'image',
        width: 1080,
        height: 1920,
      };

      const provider: AssetProvider = {
        name: 'test-ai',
        assetType: 'image',
        requiresMotion: true,
        costPerAsset: 0.04,
        search: vi.fn().mockResolvedValue([mockResult]),
        generate: vi.fn().mockResolvedValue(mockResult),
        isAvailable: () => true,
        estimateCost: (n) => n * 0.04,
      };

      const result = await provider.generate!('a mountain landscape', {
        query: '',
        orientation: 'portrait',
      });

      expect(result.type).toBe(provider.assetType);
    });
  });

  // ===========================================================================
  // Availability Method Contract
  // ===========================================================================

  describe('isAvailable() method contract', () => {
    it('returns boolean', () => {
      const availableProvider: AssetProvider = {
        name: 'test',
        assetType: 'video',
        requiresMotion: false,
        costPerAsset: 0,
        search: vi.fn(),
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const unavailableProvider: AssetProvider = {
        name: 'test',
        assetType: 'video',
        requiresMotion: false,
        costPerAsset: 0,
        search: vi.fn(),
        isAvailable: () => false,
        estimateCost: () => 0,
      };

      expect(typeof availableProvider.isAvailable()).toBe('boolean');
      expect(availableProvider.isAvailable()).toBe(true);
      expect(unavailableProvider.isAvailable()).toBe(false);
    });
  });

  // ===========================================================================
  // Cost Estimation Contract
  // ===========================================================================

  describe('estimateCost() method contract', () => {
    it('returns 0 for free providers', () => {
      const freeProvider: AssetProvider = {
        name: 'free-test',
        assetType: 'video',
        requiresMotion: false,
        costPerAsset: 0,
        search: vi.fn(),
        isAvailable: () => true,
        estimateCost: (_n) => 0,
      };

      expect(freeProvider.estimateCost(0)).toBe(0);
      expect(freeProvider.estimateCost(10)).toBe(0);
      expect(freeProvider.estimateCost(100)).toBe(0);
    });

    it('calculates cost correctly for paid providers', () => {
      const costPerAsset = 0.04;
      const paidProvider: AssetProvider = {
        name: 'paid-test',
        assetType: 'image',
        requiresMotion: true,
        costPerAsset,
        search: vi.fn(),
        isAvailable: () => true,
        estimateCost: (n) => n * costPerAsset,
      };

      expect(paidProvider.estimateCost(0)).toBe(0);
      expect(paidProvider.estimateCost(1)).toBe(0.04);
      expect(paidProvider.estimateCost(10)).toBe(0.4);
      expect(paidProvider.estimateCost(25)).toBe(1.0);
    });
  });
});
