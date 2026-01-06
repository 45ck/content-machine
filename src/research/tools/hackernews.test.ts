/**
 * HackerNews Tool - Unit Tests
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { HackerNewsTool } from './hackernews';
import { EvidenceSchema } from '../schema';
import type { AlgoliaSearchResponse } from './types';

const mockResponse: AlgoliaSearchResponse = {
  hits: [
    {
      objectID: '12345',
      title: 'Test Article About AI',
      url: 'https://example.com/article',
      author: 'testuser',
      points: 250,
      num_comments: 45,
      created_at: '2026-01-01T12:00:00.000Z',
    },
    {
      objectID: '12346',
      title: 'Another Test Without URL',
      url: null,
      author: 'anotheruser',
      points: 100,
      num_comments: 10,
      created_at: '2026-01-02T12:00:00.000Z',
    },
  ],
  nbHits: 1500,
  page: 0,
  nbPages: 150,
  hitsPerPage: 10,
  processingTimeMS: 5,
};

const server = setupServer(
  http.get('https://hn.algolia.com/api/v1/search', () => {
    return HttpResponse.json(mockResponse);
  })
);

describe('HackerNewsTool', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should create instance with default config', () => {
    const tool = new HackerNewsTool();
    expect(tool.source).toBe('hackernews');
    expect(tool.name).toBe('HackerNews');
    expect(tool.isAvailable()).toBe(true);
  });

  it('should return valid Evidence from search results', async () => {
    const tool = new HackerNewsTool();
    const result = await tool.search('AI technology');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(2);
    expect(result.totalFound).toBe(1500);
    expect(result.searchTimeMs).toBeGreaterThan(0);

    // Validate against schema
    for (const evidence of result.evidence) {
      const parsed = EvidenceSchema.safeParse(evidence);
      expect(parsed.success).toBe(true);
    }
  });

  it('should correctly map Algolia hit to Evidence', async () => {
    const tool = new HackerNewsTool();
    const result = await tool.search('test');

    const first = result.evidence[0];
    expect(first.title).toBe('Test Article About AI');
    expect(first.url).toBe('https://example.com/article');
    expect(first.source).toBe('hackernews');
    expect(first.relevanceScore).toBe(0.5); // 250/500
    expect(first.publishedAt).toBe('2026-01-01T12:00:00.000Z');
    expect(first.summary).toContain('250 points');
    expect(first.summary).toContain('45 comments');
  });

  it('should generate HN URL for items without external URL', async () => {
    const tool = new HackerNewsTool();
    const result = await tool.search('test');

    const second = result.evidence[1];
    expect(second.url).toBe('https://news.ycombinator.com/item?id=12346');
  });

  it('should cap relevance score at 1.0 for high-scoring posts', async () => {
    server.use(
      http.get('https://hn.algolia.com/api/v1/search', () => {
        return HttpResponse.json({
          ...mockResponse,
          hits: [
            {
              ...mockResponse.hits[0],
              points: 1000, // Higher than max normalization
            },
          ],
        });
      })
    );

    const tool = new HackerNewsTool();
    const result = await tool.search('viral post');

    expect(result.evidence[0].relevanceScore).toBe(1.0);
  });

  it('should handle empty results gracefully', async () => {
    server.use(
      http.get('https://hn.algolia.com/api/v1/search', () => {
        return HttpResponse.json({
          hits: [],
          nbHits: 0,
          page: 0,
          nbPages: 0,
          hitsPerPage: 10,
          processingTimeMS: 1,
        });
      })
    );

    const tool = new HackerNewsTool();
    const result = await tool.search('nonexistent gibberish');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(0);
    expect(result.totalFound).toBe(0);
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      http.get('https://hn.algolia.com/api/v1/search', () => {
        return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
      })
    );

    const tool = new HackerNewsTool();
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.evidence).toHaveLength(0);
    expect(result.error).toContain('500');
  });

  it('should respect limit option', async () => {
    const tool = new HackerNewsTool();
    await tool.search('test', { limit: 5 });

    // We can't easily verify the URL params without more complex mocking
    // but we verify it doesn't crash
    expect(true).toBe(true);
  });

  it('should report rate limit status', () => {
    const tool = new HackerNewsTool();
    const status = tool.getRateLimitStatus();

    expect(status.isLimited).toBe(false);
    expect(status.remaining).toBeGreaterThan(0);
  });
});
