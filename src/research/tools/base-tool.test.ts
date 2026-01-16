/**
 * @file Unit tests for BaseResearchTool Template Method pattern
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Evidence } from '../../domain';
import type { SearchToolOptions } from '../types';
import { BaseResearchTool } from './base-tool';

// Concrete implementation for testing
interface MockResponse {
  items: MockItem[];
  total: number;
}

interface MockItem {
  id: string;
  title: string;
  score: number;
}

class TestResearchTool extends BaseResearchTool<MockResponse, MockItem> {
  readonly source = 'test';
  readonly name = 'Test Tool';

  protected getDefaultMaxScore(): number {
    return 100;
  }

  protected buildUrl(query: string, limit: number, _options: SearchToolOptions): string {
    return `https://api.test.com/search?q=${encodeURIComponent(query)}&limit=${limit}`;
  }

  protected buildHeaders(): Record<string, string> {
    return {
      'User-Agent': this.config.userAgent ?? 'test-agent',
      Authorization: this.config.apiKey ? `Bearer ${this.config.apiKey}` : '',
    };
  }

  protected extractHits(response: MockResponse): MockItem[] {
    return response.items;
  }

  protected getTotalCount(response: MockResponse): number {
    return response.total;
  }

  protected toEvidence(hit: MockItem): Evidence {
    return {
      title: hit.title,
      url: `https://test.com/${hit.id}`,
      source: 'test',
      relevanceScore: Math.min(hit.score / (this.config.maxScoreNormalization ?? 100), 1.0),
    };
  }
}

describe('BaseResearchTool', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('constructs with default config', () => {
    const tool = new TestResearchTool();
    expect(tool.source).toBe('test');
    expect(tool.name).toBe('Test Tool');
    expect(tool.isAvailable()).toBe(true);
  });

  it('constructs with custom config', () => {
    const tool = new TestResearchTool({
      timeoutMs: 5000,
      userAgent: 'custom-agent',
      apiKey: 'test-key',
    });
    expect(tool.isAvailable()).toBe(true);
  });

  it('returns rate limit status', () => {
    const tool = new TestResearchTool();
    const status = tool.getRateLimitStatus();
    expect(status).toMatchObject({
      isLimited: false,
      remaining: expect.any(Number),
    });
  });

  it('executes search successfully', async () => {
    const mockResponse: MockResponse = {
      items: [
        { id: '1', title: 'Test Item 1', score: 80 },
        { id: '2', title: 'Test Item 2', score: 60 },
      ],
      total: 100,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const tool = new TestResearchTool();
    const result = await tool.search('test query');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(2);
    expect(result.totalFound).toBe(100);
    expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it('transforms hits to evidence correctly', async () => {
    const mockResponse: MockResponse = {
      items: [{ id: 'abc', title: 'Great Article', score: 50 }],
      total: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const tool = new TestResearchTool();
    const result = await tool.search('test');

    expect(result.evidence[0]).toMatchObject({
      title: 'Great Article',
      url: 'https://test.com/abc',
      source: 'test',
      relevanceScore: 0.5, // 50/100
    });
  });

  it('handles API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const tool = new TestResearchTool();
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.evidence).toEqual([]);
    expect(result.error).toContain('500');
  });

  it('handles network errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const tool = new TestResearchTool();
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.evidence).toEqual([]);
    expect(result.error).toBe('Network failure');
  });

  it('builds correct URL with query and limit', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });

    const tool = new TestResearchTool();
    await tool.search('hello world', { limit: 20 });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.test.com/search?q=hello%20world&limit=20',
      expect.any(Object)
    );
  });

  it('includes correct headers in request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });

    const tool = new TestResearchTool({ apiKey: 'my-key', userAgent: 'my-agent' });
    await tool.search('test');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: {
          'User-Agent': 'my-agent',
          Authorization: 'Bearer my-key',
        },
      })
    );
  });

  describe('unavailable tools', () => {
    class RequiresKeyTool extends TestResearchTool {
      isAvailable(): boolean {
        return !!this.config.apiKey;
      }

      protected getUnavailableMessage(): string {
        return 'API key required';
      }
    }

    it('returns error when tool is unavailable', async () => {
      const tool = new RequiresKeyTool(); // No API key
      expect(tool.isAvailable()).toBe(false);
      
      const result = await tool.search('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API key required');
    });
  });
});
