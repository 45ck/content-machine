/**
 * Web Search Research Tool - Brave Search API
 */
import type { Evidence } from '../schema';
import type {
  ResearchTool,
  SearchToolOptions,
  SearchToolResult,
  RateLimitStatus,
  ToolConfig,
  BraveWebResult,
  BraveSearchResponse,
} from './types';

const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search';

export class WebSearchTool implements ResearchTool {
  readonly source = 'web' as const;
  readonly name = 'Web Search';
  private config: ToolConfig;
  private rateLimitStatus: RateLimitStatus = { isLimited: false, remaining: 100 };

  constructor(config: ToolConfig = {}) {
    this.config = {
      apiKey: config.apiKey ?? process.env.BRAVE_SEARCH_API_KEY,
      timeoutMs: config.timeoutMs ?? 10000,
    };
  }

  isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  getRateLimitStatus(): RateLimitStatus {
    return this.rateLimitStatus;
  }

  async search(query: string, options: SearchToolOptions = {}): Promise<SearchToolResult> {
    const startTime = Date.now();
    const limit = options.limit ?? 10;

    if (!this.config.apiKey) {
      return {
        success: false,
        evidence: [],
        totalFound: 0,
        searchTimeMs: Date.now() - startTime,
        error: 'BRAVE_SEARCH_API_KEY not configured',
      };
    }

    try {
      const params = new URLSearchParams({
        q: query,
        count: String(limit),
      });

      if (options.timeRange && options.timeRange !== 'all') {
        params.set('freshness', this.mapFreshness(options.timeRange));
      }

      const response = await fetch(`${BRAVE_API}?${params}`, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': this.config.apiKey,
        },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10000),
      });

      if (!response.ok) {
        throw new Error(`Brave API error: ${response.status} ${response.statusText}`);
      }

      const data: BraveSearchResponse = await response.json();
      const results = data.web?.results ?? [];
      const evidence = results.map((result, index) => this.toEvidence(result, index, results.length));

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

  private mapFreshness(timeRange: string): string {
    const mapping: Record<string, string> = {
      hour: 'pd', // past day (closest available)
      day: 'pd',
      week: 'pw',
      month: 'pm',
      year: 'py',
    };
    return mapping[timeRange] ?? 'pd';
  }

  private toEvidence(result: BraveWebResult, index: number, total: number): Evidence {
    // Position-based scoring: first result = 1.0, last = 0.5
    const positionScore = 1.0 - (index / total) * 0.5;

    return {
      title: result.title,
      url: result.url,
      source: 'web',
      relevanceScore: positionScore,
      publishedAt: result.age,
      summary: result.description,
    };
  }
}
