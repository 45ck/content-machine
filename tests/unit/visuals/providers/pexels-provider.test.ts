/**
 * @file Unit tests for PexelsProvider
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  // Integration tests would require mocking the searchPexels function
  // or the actual API call. These tests verify the interface contract.
  it('search returns a promise', () => {
    const provider = new PexelsProvider();
    const result = provider.search({
      query: 'nature',
      orientation: 'portrait',
    });
    expect(result).toBeInstanceOf(Promise);
  });
});
