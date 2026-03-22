/**
 * @file Unit tests for PexelsProvider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../../src/visuals/providers/pexels.js', () => ({
  searchPexels: vi.fn(async () => [
    {
      id: 1,
      url: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      width: 1080,
      height: 1920,
      duration: 2,
    },
  ]),
}));

import { PexelsProvider } from '../../../../src/visuals/providers/pexels-provider.js';

describe('PexelsProvider', () => {
  const originalEnv = process.env.PEXELS_API_KEY;

  beforeEach(() => {
    vi.resetModules();
    process.env.PEXELS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env.PEXELS_API_KEY = originalEnv;
  });

  it('returns provider name "pexels"', () => {
    const provider = new PexelsProvider();
    expect(provider.name).toBe('pexels');
  });

  it('has a search method', () => {
    const provider = new PexelsProvider();
    expect(typeof provider.search).toBe('function');
  });

  it('is available when PEXELS_API_KEY is set', () => {
    const provider = new PexelsProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it('is not available when PEXELS_API_KEY is missing', () => {
    delete process.env.PEXELS_API_KEY;
    const provider = new PexelsProvider();
    expect(provider.isAvailable()).toBe(false);
  });

  it('search returns results with expected shape', async () => {
    const provider = new PexelsProvider();
    const results = await provider.search({ query: 'nature', orientation: 'portrait' });
    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        url: expect.any(String),
        width: expect.any(Number),
        height: expect.any(Number),
        duration: expect.any(Number),
      })
    );
  });
});
