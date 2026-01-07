/**
 * @file Unit tests for MockVideoProvider
 */
import { describe, it, expect } from 'vitest';
import { MockVideoProvider } from '../../../../src/visuals/providers/mock-provider.js';

describe('MockVideoProvider', () => {
  it('returns provider name "mock"', () => {
    const provider = new MockVideoProvider();
    expect(provider.name).toBe('mock');
  });

  it('returns mock video results for any query', async () => {
    const provider = new MockVideoProvider();
    const results = await provider.search({
      query: 'sunset beach',
      orientation: 'portrait',
    });

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toMatchObject({
      id: expect.any(String),
      url: expect.stringContaining('mock.pexels.com'),
      width: expect.any(Number),
      height: expect.any(Number),
    });
  });

  it('returns specified number of results', async () => {
    const provider = new MockVideoProvider();
    const results = await provider.search({
      query: 'test',
      orientation: 'portrait',
      perPage: 3,
    });

    expect(results).toHaveLength(3);
  });

  it('respects orientation option for portrait', async () => {
    const provider = new MockVideoProvider();
    const results = await provider.search({
      query: 'test',
      orientation: 'portrait',
    });

    expect(results[0].height).toBeGreaterThan(results[0].width);
    expect(results[0].width).toBe(1080);
    expect(results[0].height).toBe(1920);
  });

  it('respects orientation option for landscape', async () => {
    const provider = new MockVideoProvider();
    const results = await provider.search({
      query: 'test',
      orientation: 'landscape',
    });

    expect(results[0].width).toBeGreaterThan(results[0].height);
    expect(results[0].width).toBe(1920);
    expect(results[0].height).toBe(1080);
  });

  it('defaults to portrait dimensions for undefined orientation', async () => {
    const provider = new MockVideoProvider();
    const results = await provider.search({
      query: 'test',
      orientation: 'portrait',
    });

    expect(results[0].width).toBe(1080);
    expect(results[0].height).toBe(1920);
  });

  it('is always available', () => {
    const provider = new MockVideoProvider();
    expect(provider.isAvailable()).toBe(true);
  });

  it('returns unique IDs for each result', async () => {
    const provider = new MockVideoProvider();
    const results = await provider.search({
      query: 'test',
      orientation: 'portrait',
      perPage: 5,
    });

    const ids = results.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(5);
  });

  it('includes duration for each result', async () => {
    const provider = new MockVideoProvider();
    const results = await provider.search({
      query: 'test',
      orientation: 'portrait',
    });

    results.forEach((result) => {
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });
  });
});
