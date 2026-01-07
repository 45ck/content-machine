/**
 * Web Search Research Tool - Brave Search API
 *
 * Uses Template Method pattern via BaseResearchTool.
 */
import type { Evidence } from '../schema';
import type {
  SearchToolOptions,
  ToolConfig,
  BraveWebResult,
  BraveSearchResponse,
} from './types';
import { BaseResearchTool } from './base-tool';

const BRAVE_API = 'https://api.search.brave.com/res/v1/web/search';

export class WebSearchTool extends BaseResearchTool<BraveSearchResponse, BraveWebResult> {
  readonly source = 'web' as const;
  readonly name = 'Web Search';

  constructor(config: ToolConfig = {}) {
    super({
      ...config,
      apiKey: config.apiKey ?? process.env.BRAVE_SEARCH_API_KEY,
    });
  }

  override isAvailable(): boolean {
    return !!this.config.apiKey;
  }

  protected override getUnavailableMessage(): string {
    return 'BRAVE_SEARCH_API_KEY not configured';
  }

  protected override buildUrl(query: string, limit: number, options: SearchToolOptions): string {
    const params = new URLSearchParams({
      q: query,
      count: String(limit),
    });

    if (options.timeRange && options.timeRange !== 'all') {
      params.set('freshness', this.mapFreshness(options.timeRange));
    }

    return `${BRAVE_API}?${params}`;
  }

  protected override buildHeaders(): Record<string, string> {
    return {
      Accept: 'application/json',
      'X-Subscription-Token': this.config.apiKey ?? '',
    };
  }

  protected override extractHits(response: BraveSearchResponse): BraveWebResult[] {
    return response.web?.results ?? [];
  }

  protected override toEvidence(result: BraveWebResult, index: number, total: number): Evidence {
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
}
