/**
 * @file Unit tests for createVideoProvider factory
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createVideoProvider } from '../../../../src/visuals/providers/index.js';
import { MockVideoProvider } from '../../../../src/visuals/providers/mock-provider.js';
import { PexelsProvider } from '../../../../src/visuals/providers/pexels-provider.js';
import { PixabayProvider } from '../../../../src/visuals/providers/pixabay-provider.js';

describe('createVideoProvider factory', () => {
  const originalPexelsKey = process.env.PEXELS_API_KEY;
  const originalPixabayKey = process.env.PIXABAY_API_KEY;

  beforeEach(() => {
    process.env.PEXELS_API_KEY = 'test-api-key';
    process.env.PIXABAY_API_KEY = 'test-pixabay-key';
  });

  afterEach(() => {
    process.env.PEXELS_API_KEY = originalPexelsKey;
    process.env.PIXABAY_API_KEY = originalPixabayKey;
  });

  it('creates MockVideoProvider for "mock"', () => {
    const provider = createVideoProvider('mock');
    expect(provider).toBeInstanceOf(MockVideoProvider);
    expect(provider.name).toBe('mock');
  });

  it('creates PexelsProvider for "pexels"', () => {
    const provider = createVideoProvider('pexels');
    expect(provider).toBeInstanceOf(PexelsProvider);
    expect(provider.name).toBe('pexels');
  });

  it('creates PixabayProvider for "pixabay"', () => {
    const provider = createVideoProvider('pixabay');
    expect(provider).toBeInstanceOf(PixabayProvider);
    expect(provider.name).toBe('pixabay');
  });

  it('reports pixabay as available when PIXABAY_API_KEY is set', () => {
    const provider = createVideoProvider('pixabay');
    expect(provider.isAvailable()).toBe(true);
  });

  it('reports pixabay as unavailable when PIXABAY_API_KEY is missing', () => {
    delete process.env.PIXABAY_API_KEY;
    const provider = createVideoProvider('pixabay');
    expect(provider.isAvailable()).toBe(false);
  });

  it('throws for unknown provider names', () => {
    // @ts-expect-error Testing invalid provider name
    expect(() => createVideoProvider('unknown')).toThrow(/Unknown provider/);
  });

  it('returns a VideoProvider interface-compliant object', async () => {
    const provider = createVideoProvider('mock');

    // Verify the interface
    expect(typeof provider.name).toBe('string');
    expect(typeof provider.search).toBe('function');
    expect(typeof provider.isAvailable).toBe('function');

    // Verify search returns expected structure
    const results = await provider.search({
      query: 'test',
      orientation: 'portrait',
    });
    expect(results).toBeInstanceOf(Array);
    expect(results[0]).toMatchObject({
      id: expect.any(String),
      url: expect.any(String),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });
});
