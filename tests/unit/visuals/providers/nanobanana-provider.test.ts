/**
 * NanoBanana Provider Tests
 *
 * TDD tests for the Gemini image generation provider.
 * Tests are written BEFORE implementation (Red phase).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NanoBananaProvider } from '../../../../src/visuals/providers/nanobanana-provider.js';

describe('NanoBananaProvider', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // ===========================================================================
  // Interface Compliance Tests
  // ===========================================================================

  describe('interface compliance', () => {
    it('implements AssetProvider interface', () => {
      const provider = new NanoBananaProvider();

      // Check all required properties exist
      expect(provider.name).toBeDefined();
      expect(provider.assetType).toBeDefined();
      expect(provider.requiresMotion).toBeDefined();
      expect(provider.costPerAsset).toBeDefined();

      // Check all required methods exist
      expect(typeof provider.search).toBe('function');
      expect(typeof provider.isAvailable).toBe('function');
      expect(typeof provider.estimateCost).toBe('function');
      expect(typeof provider.generate).toBe('function');
    });

    it('has name "nanobanana"', () => {
      const provider = new NanoBananaProvider();
      expect(provider.name).toBe('nanobanana');
    });

    it('has assetType "image"', () => {
      const provider = new NanoBananaProvider();
      expect(provider.assetType).toBe('image');
    });

    it('requires motion (requiresMotion = true)', () => {
      const provider = new NanoBananaProvider();
      expect(provider.requiresMotion).toBe(true);
    });

    it('has positive cost per asset', () => {
      const provider = new NanoBananaProvider();
      expect(provider.costPerAsset).toBeGreaterThan(0);
      // Gemini 2.5 Flash image is approximately $0.04 per image
      expect(provider.costPerAsset).toBeCloseTo(0.04, 2);
    });
  });

  // ===========================================================================
  // Availability Tests
  // ===========================================================================

  describe('isAvailable()', () => {
    it('returns false when GOOGLE_API_KEY not set', () => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const provider = new NanoBananaProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it('returns true when GOOGLE_API_KEY is set', () => {
      process.env.GOOGLE_API_KEY = 'test-api-key';

      const provider = new NanoBananaProvider();
      expect(provider.isAvailable()).toBe(true);
    });

    it('returns true when GEMINI_API_KEY is set (alternative)', () => {
      delete process.env.GOOGLE_API_KEY;
      process.env.GEMINI_API_KEY = 'test-api-key';

      const provider = new NanoBananaProvider();
      expect(provider.isAvailable()).toBe(true);
    });
  });

  // ===========================================================================
  // Cost Estimation Tests
  // ===========================================================================

  describe('estimateCost()', () => {
    it('returns 0 for 0 assets', () => {
      const provider = new NanoBananaProvider();
      expect(provider.estimateCost(0)).toBe(0);
    });

    it('calculates cost correctly for multiple assets', () => {
      const provider = new NanoBananaProvider();
      const cost = provider.costPerAsset;

      expect(provider.estimateCost(1)).toBeCloseTo(cost, 4);
      expect(provider.estimateCost(5)).toBeCloseTo(cost * 5, 4);
      expect(provider.estimateCost(10)).toBeCloseTo(cost * 10, 4);
    });
  });

  // ===========================================================================
  // Generate Method Tests
  // ===========================================================================

  describe('generate()', () => {
    it('throws when API key not available', async () => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;

      const provider = new NanoBananaProvider();

      await expect(
        provider.generate!('a sunset over mountains', { query: '', orientation: 'portrait' })
      ).rejects.toThrow();
    });

    it('returns VisualAssetResult with image type', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new NanoBananaProvider();

      // Mock the Gemini client
      const mockGenerate = vi.fn().mockResolvedValue({
        id: 'mock-123',
        url: 'data:image/png;base64,iVBORw0KGgo...',
        type: 'image',
        width: 1080,
        height: 1920,
      });

      // Inject mock
      (provider as any).generateImage = mockGenerate;

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

    it('uses correct dimensions for portrait orientation', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new NanoBananaProvider();

      const mockGenerate = vi.fn().mockImplementation(async (prompt, options) => ({
        id: 'mock-portrait',
        url: 'data:image/png;base64,...',
        type: 'image' as const,
        width: options?.width || 1080,
        height: options?.height || 1920,
      }));

      (provider as any).generateImage = mockGenerate;

      const result = await provider.generate!('test prompt', {
        query: '',
        orientation: 'portrait',
      });

      expect(result.width).toBe(1080);
      expect(result.height).toBe(1920);
    });

    it('uses correct dimensions for landscape orientation', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new NanoBananaProvider();

      const mockGenerate = vi.fn().mockImplementation(async (prompt, options) => ({
        id: 'mock-landscape',
        url: 'data:image/png;base64,...',
        type: 'image' as const,
        width: options?.width || 1920,
        height: options?.height || 1080,
      }));

      (provider as any).generateImage = mockGenerate;

      const result = await provider.generate!('test prompt', {
        query: '',
        orientation: 'landscape',
      });

      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });
  });

  // ===========================================================================
  // Search Method Tests
  // ===========================================================================

  describe('search()', () => {
    it('wraps generate() for search compatibility', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new NanoBananaProvider();

      const generateMock = vi.fn().mockResolvedValue({
        id: 'search-result',
        url: 'data:image/png;base64,...',
        type: 'image',
        width: 1080,
        height: 1920,
      });

      (provider as any).generateImage = generateMock;

      const results = await provider.search({
        query: 'sunset over mountains',
        orientation: 'portrait',
        perPage: 1,
      });

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].type).toBe('image');
    });

    it('returns single result (AI generates one image at a time)', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new NanoBananaProvider();

      const generateMock = vi.fn().mockResolvedValue({
        id: 'single-result',
        url: 'data:image/png;base64,...',
        type: 'image',
        width: 1080,
        height: 1920,
      });

      (provider as any).generateImage = generateMock;

      const results = await provider.search({
        query: 'mountain landscape',
        orientation: 'portrait',
        perPage: 5, // Request 5, but AI generates 1
      });

      expect(results.length).toBe(1);
    });
  });

  // ===========================================================================
  // Prompt Enhancement Tests
  // ===========================================================================

  describe('prompt enhancement', () => {
    it('enhances prompt with style when provided', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new NanoBananaProvider();

      let capturedPrompt = '';
      const generateMock = vi.fn().mockImplementation(async (prompt) => {
        capturedPrompt = prompt;
        return { id: 'test', url: 'test', type: 'image', width: 1080, height: 1920 };
      });

      (provider as any).generateImage = generateMock;

      await provider.search({
        query: 'a mountain',
        orientation: 'portrait',
        style: 'cinematic',
      });

      expect(capturedPrompt.toLowerCase()).toContain('cinematic');
    });

    it('includes aspect ratio hint for portrait', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const provider = new NanoBananaProvider();

      let capturedPrompt = '';
      const generateMock = vi.fn().mockImplementation(async (prompt) => {
        capturedPrompt = prompt;
        return { id: 'test', url: 'test', type: 'image', width: 1080, height: 1920 };
      });

      (provider as any).generateImage = generateMock;

      await provider.search({
        query: 'a sunset',
        orientation: 'portrait',
      });

      // Should mention vertical or 9:16
      expect(
        capturedPrompt.toLowerCase().includes('vertical') ||
          capturedPrompt.toLowerCase().includes('9:16') ||
          capturedPrompt.toLowerCase().includes('portrait')
      ).toBe(true);
    });
  });
});
