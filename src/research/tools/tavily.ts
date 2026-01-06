/**
 * Tavily Search Research Tool
 *
 * Uses Tavily API for AI-optimized web search.
 * Docs: https://docs.tavily.com/
 */
import { tavily } from '@tavily/core';
import type { Evidence } from '../schema';
import type {
  ResearchTool,
  SearchToolOptions,
  SearchToolResult,
  RateLimitStatus,
  ToolConfig,
  TavilySearchResult,
} from './types';

export class TavilySearchTool implements ResearchTool {
  readonly source = 'tavily' as const;
  readonly name = 'Tavily Search';
  private config: ToolConfig;
  private client: ReturnType<typeof tavily> | null = null;
  private rateLimitStatus: RateLimitStatus = { isLimited: false, remaining: 100 };

  constructor(config: ToolConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.TAVILY_API_KEY,
      timeoutMs: config.timeoutMs ?? 15000,
    };

    if (this.config.apiKey) {
      this.client = tavily({ apiKey: this.config.apiKey });
    }
  }

  isAvailable(): boolean {
    return !!this.config.apiKey && !!this.client;
  }

  getRateLimitStatus(): RateLimitStatus {
    return this.rateLimitStatus;
  }

  async search(query: string, options: SearchToolOptions = {}): Promise<SearchToolResult> {
    const startTime = Date.now();
    const limit = options.limit ?? 10;

    if (!this.client || !this.config.apiKey) {
      return {
        success: false,
        evidence: [],
        totalFound: 0,
        searchTimeMs: Date.now() - startTime,
        error: 'TAVILY_API_KEY not configured',
      };
    }

    try {
      const searchOptions: Parameters<typeof this.client.search>[1] = {
        maxResults: limit,
        searchDepth: 'basic',
        includeAnswer: false,
      };

      // Map time range to Tavily's days parameter
      if (options.timeRange && options.timeRange !== 'all') {
        searchOptions.days = this.mapTimeRangeToDays(options.timeRange);
      }

      const response = await this.client.search(query, searchOptions);

      const results = response.results ?? [];
      const evidence = results.map((result) => this.toEvidence(result as TavilySearchResult));

      return {
        success: true,
        evidence,
        totalFound: results.length,
        searchTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        evidence: [],
        totalFound: 0,
        searchTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private mapTimeRangeToDays(timeRange: string): number {
    const mapping: Record<string, number> = {
      hour: 1,
      day: 1,
      week: 7,
      month: 30,
      year: 365,
    };
    return mapping[timeRange] ?? 7;
  }

  private toEvidence(result: TavilySearchResult): Evidence {
    return {
      title: result.title,
      url: result.url,
      source: 'tavily',
      relevanceScore: Math.min(result.score, 1.0), // Tavily score is already 0-1
      publishedAt: result.publishedDate,
      summary: result.content?.slice(0, 300) + (result.content?.length > 300 ? '...' : ''),
    };
  }
}
