/**
 * @file Unit tests for createVideoProvider factory
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createVideoProvider } from '../../../../src/visuals/providers/index.js';
import { MockVideoProvider } from '../../../../src/visuals/providers/mock-provider.js';
import { PexelsProvider } from '../../../../src/visuals/providers/pexels-provider.js';

describe('createVideoProvider factory', () => {
  const originalEnv = process.env.PEXELS_API_KEY;

  beforeEach(() => {
    process.env.PEXELS_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    process.env.PEXELS_API_KEY = originalEnv;
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

  it('throws for "pixabay" (not yet implemented)', () => {
    expect(() => createVideoProvider('pixabay')).toThrow(/not yet implemented/);
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
