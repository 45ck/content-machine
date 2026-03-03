/**
 * Tavily Search Tool - Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TavilySearchTool } from './tavily';
import { EvidenceSchema } from '../../domain';

// Mock the @tavily/core module
vi.mock('@tavily/core', () => ({
  tavily: vi.fn(() => ({
    search: vi.fn(),
  })),
}));

import { tavily } from '@tavily/core';

const mockTavily = vi.mocked(tavily);

describe('TavilySearchTool', () => {
  const originalEnv = process.env.TAVILY_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TAVILY_API_KEY = 'test-tavily-key';
  });

  afterEach(() => {
    process.env.TAVILY_API_KEY = originalEnv;
  });

  it('should create instance with API key from env', () => {
    const tool = new TavilySearchTool();
    expect(tool.source).toBe('tavily');
    expect(tool.name).toBe('Tavily Search');
    expect(tool.isAvailable()).toBe(true);
  });

  it('should report unavailable without API key', () => {
    delete process.env.TAVILY_API_KEY;
    const tool = new TavilySearchTool();
    expect(tool.isAvailable()).toBe(false);
  });

  it('should return error when searching without API key', async () => {
    delete process.env.TAVILY_API_KEY;
    const tool = new TavilySearchTool();
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.error).toContain('TAVILY_API_KEY');
  });

  it('should return valid Evidence from search results', async () => {
    const mockSearch = vi.fn().mockResolvedValue({
      results: [
        {
          title: 'TypeScript Best Practices',
          url: 'https://example.com/typescript',
          content: 'A comprehensive guide to TypeScript best practices and patterns.',
          score: 0.95,
          publishedDate: '2026-01-05',
        },
        {
          title: 'Advanced TypeScript Techniques',
          url: 'https://example.com/advanced-ts',
          content: 'Learn advanced TypeScript techniques for enterprise applications.',
          score: 0.88,
        },
      ],
    });

    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    const result = await tool.search('TypeScript tips');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(2);
    expect(result.totalFound).toBe(2);
    expect(result.searchTimeMs).toBeGreaterThanOrEqual(0);

    // Validate against schema
    for (const evidence of result.evidence) {
      const parsed = EvidenceSchema.safeParse(evidence);
      expect(parsed.success).toBe(true);
    }
  });

  it('should correctly map Tavily result to Evidence', async () => {
    const mockSearch = vi.fn().mockResolvedValue({
      results: [
        {
          title: 'Test Article',
          url: 'https://example.com/test',
          content: 'This is the article content for testing purposes.',
          score: 0.92,
          publishedDate: '2026-01-06',
        },
      ],
    });

    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test');

    const evidence = result.evidence[0];
    expect(evidence.title).toBe('Test Article');
    expect(evidence.url).toBe('https://example.com/test');
    expect(evidence.source).toBe('tavily');
    expect(evidence.relevanceScore).toBe(0.92);
    expect(evidence.publishedAt).toBe('2026-01-06');
    expect(evidence.summary).toBe('This is the article content for testing purposes.');
  });

  it('should truncate long content in summary', async () => {
    const longContent = 'A'.repeat(400);
    const mockSearch = vi.fn().mockResolvedValue({
      results: [
        {
          title: 'Long Article',
          url: 'https://example.com/long',
          content: longContent,
          score: 0.85,
        },
      ],
    });

    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test');

    expect(result.evidence[0].summary!.length).toBeLessThanOrEqual(303); // 300 + "..."
    expect(result.evidence[0].summary).toContain('...');
  });

  it('should cap relevance score at 1.0', async () => {
    const mockSearch = vi.fn().mockResolvedValue({
      results: [
        {
          title: 'High Score',
          url: 'https://example.com/high',
          content: 'Content',
          score: 1.5, // Above 1.0
        },
      ],
    });

    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test');

    expect(result.evidence[0].relevanceScore).toBe(1.0);
  });

  it('should handle empty results', async () => {
    const mockSearch = vi.fn().mockResolvedValue({
      results: [],
    });

    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    const result = await tool.search('nonexistent query xyz');

    expect(result.success).toBe(true);
    expect(result.evidence).toHaveLength(0);
    expect(result.totalFound).toBe(0);
  });

  it('should handle API errors gracefully', async () => {
    const mockSearch = vi.fn().mockRejectedValue(new Error('API rate limit exceeded'));

    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    const result = await tool.search('test');

    expect(result.success).toBe(false);
    expect(result.evidence).toHaveLength(0);
    expect(result.error).toContain('rate limit');
  });

  it('should pass time range to API', async () => {
    const mockSearch = vi.fn().mockResolvedValue({ results: [] });
    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    await tool.search('test', { timeRange: 'week' });

    expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
      days: 7,
    }));
  });

  it('should pass limit to API', async () => {
    const mockSearch = vi.fn().mockResolvedValue({ results: [] });
    mockTavily.mockReturnValue({ search: mockSearch } as any);

    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    await tool.search('test', { limit: 5 });

    expect(mockSearch).toHaveBeenCalledWith('test', expect.objectContaining({
      maxResults: 5,
    }));
  });

  it('should report rate limit status', () => {
    const tool = new TavilySearchTool({ apiKey: 'test-key' });
    const status = tool.getRateLimitStatus();

    expect(status.isLimited).toBe(false);
    expect(status.remaining).toBeGreaterThan(0);
  });
});
