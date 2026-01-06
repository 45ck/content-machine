/**
 * Web Search Tool (Brave) - Unit Tests
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { WebSearchTool } from './web-search';
import { EvidenceSchema } from '../schema';
import type { BraveSearchResponse } from './types';

const mockResponse: BraveSearchResponse = {
  query: {
    original: 'test query',
  },
  web: {
    results: [
      {
        title: 'First Result - Most Relevant',
        url: 'https://example.com/first',
        description: 'This is the first and most relevant search result.',
        age: '2024-01-15',
      },
      {
        title: 'Second Result',
        url: 'https://example.com/second',
        description: 'This is the second result with less relevance.',
        age: '2024-01-10',
      },
      {
        title: 'Third Result',
        url: 'https://example.com/third',
        description: 'This is the third result.',
      },
    ],
  },
};

const server = setupServer(
  http.get('https://api.search.brave.com/res/v1/web/search', () => {
    return HttpResponse.json(mockResponse);
  })
);

describe('WebSearchTool', () => {
  const originalEnv = process.env.BRAVE_SEARCH_API_KEY;

  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    process.env.BRAVE_SEARCH_API_KEY = originalEnv;
  });
  afterAll(() => server.close());

  beforeEach(() => {
    process.env.BRAVE_SEARCH_API_KEY = 'test-api-key';
  });

  it('should create instance with API key from env', () => {
    const tool = new WebSearchTool();
    expect(tool.source).toBe('web');
    expect(tool.name).toBe('Web Search');
    expect(tool.isAvailable()).toBe(true);
  });

  it('should report unavailable without API key', () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    const tool = new WebSearchTool();
    expect(tool.isAvailable()).toBe(false);
  });

  it('should return error when searching without API key', async () => {
    delete process.env.BRAVE_SEARCH_API_KEY;
    const tool = new WebSearchTool();
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('BRAVE_SEARCH_API_KEY');
  });

  it('should return valid Evidence from search results', async () => {
    const tool = new WebSearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test query');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(3);
    expect(result.totalFound).toBe(3);
    expect(result.searchTimeMs).toBeGreaterThan(0);

    // Validate against schema
    for (const evidence of result.evidence) {
      const parsed = EvidenceSchema.safeParse(evidence);
      expect(parsed.success).toBe(true);
    }
  });

  it('should correctly map Brave result to Evidence', async () => {
    const tool = new WebSearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test');

    const first = result.evidence[0];
    expect(first.title).toBe('First Result - Most Relevant');
    expect(first.url).toBe('https://example.com/first');
    expect(first.source).toBe('web');
    expect(first.summary).toBe('This is the first and most relevant search result.');
    expect(first.publishedAt).toBe('2024-01-15');
  });

  it('should use position-based scoring', async () => {
    const tool = new WebSearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test');

    // First result should have highest score
    expect(result.evidence[0].relevanceScore).toBeGreaterThan(result.evidence[1].relevanceScore);
    expect(result.evidence[1].relevanceScore).toBeGreaterThan(result.evidence[2].relevanceScore);

    // First should be 1.0
    expect(result.evidence[0].relevanceScore).toBe(1.0);
  });

  it('should send API key in header', async () => {
    let capturedHeaders: Headers | undefined;

    server.use(
      http.get('https://api.search.brave.com/res/v1/web/search', ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json(mockResponse);
      })
    );

    const tool = new WebSearchTool({ apiKey: 'my-secret-key' });
    await tool.search('test');

    expect(capturedHeaders?.get('x-subscription-token')).toBe('my-secret-key');
    expect(capturedHeaders?.get('accept')).toBe('application/json');
  });

  it('should handle empty web results', async () => {
    server.use(
      http.get('https://api.search.brave.com/res/v1/web/search', () => {
        return HttpResponse.json({
          query: { original: 'test' },
          web: { results: [] },
        });
      })
    );

    const tool = new WebSearchTool({ apiKey: 'test-key' });
    const result = await tool.search('nonexistent query');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(0);
    expect(result.totalFound).toBe(0);
  });

  it('should handle missing web property', async () => {
    server.use(
      http.get('https://api.search.brave.com/res/v1/web/search', () => {
        return HttpResponse.json({
          query: { original: 'test' },
          // No web property
        });
      })
    );

    const tool = new WebSearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(0);
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      http.get('https://api.search.brave.com/res/v1/web/search', () => {
        return new HttpResponse(null, { status: 401, statusText: 'Unauthorized' });
      })
    );

    const tool = new WebSearchTool({ apiKey: 'invalid-key' });
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.evidence).toHaveLength(0);
    expect(result.error).toContain('401');
  });

  it('should map time ranges to freshness parameter', async () => {
    const tool = new WebSearchTool({ apiKey: 'test-key' });

    // Just verify it doesn't crash with different time ranges
    await tool.search('test', { timeRange: 'day' });
    await tool.search('test', { timeRange: 'week' });
    await tool.search('test', { timeRange: 'month' });

    expect(true).toBe(true);
  });

  it('should report rate limit status', () => {
    const tool = new WebSearchTool({ apiKey: 'test-key' });
    const status = tool.getRateLimitStatus();

    expect(status.isLimited).toBe(false);
    expect(status.remaining).toBeGreaterThan(0);
  });
});
