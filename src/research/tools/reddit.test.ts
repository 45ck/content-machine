/**
 * Reddit Tool - Unit Tests
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { RedditTool } from './reddit';
import { EvidenceSchema } from '../schema';
import type { RedditSearchResponse } from './types';

const mockResponse: RedditSearchResponse = {
  data: {
    after: 't3_abc123',
    before: null,
    children: [
      {
        kind: 't3',
        data: {
          id: 'post123',
          title: 'Test Post About Programming',
          selftext: 'This is a detailed post about programming with lots of useful information that spans multiple sentences.',
          url: 'https://www.reddit.com/r/programming/comments/post123',
          author: 'testuser',
          score: 5000,
          num_comments: 250,
          subreddit: 'programming',
          created_utc: 1704067200, // 2024-01-01
          permalink: '/r/programming/comments/post123/test_post/',
        },
      },
      {
        kind: 't3',
        data: {
          id: 'post456',
          title: 'Link Post Example',
          selftext: '',
          url: 'https://example.com/article',
          author: 'anotheruser',
          score: 1500,
          num_comments: 75,
          subreddit: 'technology',
          created_utc: 1704153600, // 2024-01-02
          permalink: '/r/technology/comments/post456/link_post/',
        },
      },
    ],
  },
};

const server = setupServer(
  http.get('https://www.reddit.com/search.json', () => {
    return HttpResponse.json(mockResponse);
  }),
  http.get('https://www.reddit.com/r/:subreddit/search.json', () => {
    return HttpResponse.json(mockResponse);
  })
);

describe('RedditTool', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  it('should create instance with default config', () => {
    const tool = new RedditTool();
    expect(tool.source).toBe('reddit');
    expect(tool.name).toBe('Reddit');
    expect(tool.isAvailable()).toBe(true);
  });

  it('should return valid Evidence from search results', async () => {
    const tool = new RedditTool();
    const result = await tool.search('programming tips');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(2);
    expect(result.totalFound).toBe(2);
    expect(result.searchTimeMs).toBeGreaterThan(0);

    // Validate against schema
    for (const evidence of result.evidence) {
      const parsed = EvidenceSchema.safeParse(evidence);
      expect(parsed.success).toBe(true);
    }
  });

  it('should correctly map Reddit post to Evidence', async () => {
    const tool = new RedditTool();
    const result = await tool.search('test');

    const first = result.evidence[0];
    expect(first.title).toBe('Test Post About Programming');
    expect(first.url).toBe('https://www.reddit.com/r/programming/comments/post123/test_post/');
    expect(first.source).toBe('reddit');
    expect(first.relevanceScore).toBeGreaterThan(0);
    expect(first.relevanceScore).toBeLessThanOrEqual(1);
    expect(first.publishedAt).toBeDefined();
    expect(first.summary).toContain('This is a detailed post');
  });

  it('should truncate long selftext in summary', async () => {
    server.use(
      http.get('https://www.reddit.com/search.json', () => {
        return HttpResponse.json({
          data: {
            after: null,
            before: null,
            children: [
              {
                kind: 't3',
                data: {
                  ...mockResponse.data.children[0].data,
                  selftext: 'A'.repeat(300), // 300 chars
                },
              },
            ],
          },
        });
      })
    );

    const tool = new RedditTool();
    const result = await tool.search('test');

    expect(result.evidence[0].summary!.length).toBeLessThanOrEqual(203); // 200 + "..."
    expect(result.evidence[0].summary).toContain('...');
  });

  it('should use upvotes/comments for empty selftext', async () => {
    const tool = new RedditTool();
    const result = await tool.search('test');

    const second = result.evidence[1]; // Link post with empty selftext
    expect(second.summary).toContain('upvotes');
    expect(second.summary).toContain('comments');
    expect(second.summary).toContain('r/technology');
  });

  it('should handle subreddit-specific search', async () => {
    const tool = new RedditTool();
    const result = await tool.search('python', { subreddit: 'programming' });

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(2);
  });

  it('should handle empty results gracefully', async () => {
    server.use(
      http.get('https://www.reddit.com/search.json', () => {
        return HttpResponse.json({
          data: {
            after: null,
            before: null,
            children: [],
          },
        });
      })
    );

    const tool = new RedditTool();
    const result = await tool.search('nonexistent query xyz');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(0);
    expect(result.totalFound).toBe(0);
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      http.get('https://www.reddit.com/search.json', () => {
        return new HttpResponse(null, { status: 429, statusText: 'Too Many Requests' });
      })
    );

    const tool = new RedditTool();
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.evidence).toHaveLength(0);
    expect(result.error).toContain('429');
  });

  it('should send proper User-Agent header', async () => {
    let capturedHeaders: Headers | undefined;

    server.use(
      http.get('https://www.reddit.com/search.json', ({ request }) => {
        capturedHeaders = request.headers;
        return HttpResponse.json(mockResponse);
      })
    );

    const tool = new RedditTool({ userAgent: 'test-agent/1.0' });
    await tool.search('test');

    expect(capturedHeaders?.get('user-agent')).toBe('test-agent/1.0');
  });

  it('should include correct time range in request URL', async () => {
    let capturedUrl: string | undefined;

    server.use(
      http.get('https://www.reddit.com/search.json', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(mockResponse);
      })
    );

    const tool = new RedditTool();
    await tool.search('test', { timeRange: 'month' });

    expect(capturedUrl).toContain('t=month');
  });

  it('should send correct query parameters', async () => {
    let capturedUrl: URL | undefined;

    server.use(
      http.get('https://www.reddit.com/search.json', ({ request }) => {
        capturedUrl = new URL(request.url);
        return HttpResponse.json(mockResponse);
      })
    );

    const tool = new RedditTool();
    await tool.search('test query', { limit: 5, timeRange: 'week' });

    expect(capturedUrl?.searchParams.get('q')).toBe('test query');
    expect(capturedUrl?.searchParams.get('limit')).toBe('5');
    expect(capturedUrl?.searchParams.get('t')).toBe('week');
    expect(capturedUrl?.searchParams.get('sort')).toBe('relevance');
  });

  it('should handle network errors gracefully', async () => {
    server.use(
      http.get('https://www.reddit.com/search.json', () => {
        return HttpResponse.error();
      })
    );

    const tool = new RedditTool();
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.evidence).toHaveLength(0);
    expect(result.error).toBeDefined();
  });

  it('should timeout after configured duration', async () => {
    server.use(
      http.get('https://www.reddit.com/search.json', async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return HttpResponse.json(mockResponse);
      })
    );

    const tool = new RedditTool({ timeoutMs: 50 });
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should report rate limit status', () => {
    const tool = new RedditTool();
    const status = tool.getRateLimitStatus();

    expect(status.isLimited).toBe(false);
    expect(status.remaining).toBeGreaterThan(0);
  });
});
