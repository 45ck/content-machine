/**
 * HackerNews Research Tool - Algolia API
 *
 * Uses Template Method pattern via BaseResearchTool.
 */
import type { Evidence } from '../schema';
import type {
  SearchToolOptions,
  ToolConfig,
  AlgoliaHit,
  AlgoliaSearchResponse,
} from './types';
import { BaseResearchTool } from './base-tool';

const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';
const HN_ITEM_BASE = 'https://news.ycombinator.com/item';
const MAX_POINTS_DEFAULT = 500;

export class HackerNewsTool extends BaseResearchTool<AlgoliaSearchResponse, AlgoliaHit> {
  readonly source = 'hackernews' as const;
  readonly name = 'HackerNews';

  constructor(config: ToolConfig = {}) {
    super(config);
    this.rateLimitStatus = { isLimited: false, remaining: 1000 };
  }

  protected override getDefaultMaxScore(): number {
    return MAX_POINTS_DEFAULT;
  }

  protected override buildUrl(query: string, limit: number, options: SearchToolOptions): string {
    const params = new URLSearchParams({
      query,
      hitsPerPage: String(limit),
      tags: 'story',
    });

    if (options.timeRange) {
      const timestamp = this.getTimestampForRange(options.timeRange);
      if (timestamp) {
        params.set('numericFilters', `created_at_i>${timestamp}`);
      }
    }

    return `${ALGOLIA_BASE}/search?${params}`;
  }

  protected override buildHeaders(): Record<string, string> {
    return {
      'User-Agent': this.config.userAgent ?? 'content-machine/1.0',
    };
  }

  protected override extractHits(response: AlgoliaSearchResponse): AlgoliaHit[] {
    return response.hits;
  }

  protected override getTotalCount(response: AlgoliaSearchResponse): number {
    return response.nbHits;
  }

  protected override toEvidence(hit: AlgoliaHit): Evidence {
    const maxPoints = this.config.maxScoreNormalization ?? MAX_POINTS_DEFAULT;
    const url = hit.url ?? `${HN_ITEM_BASE}?id=${hit.objectID}`;

    return {
      title: hit.title,
      url,
      source: 'hackernews',
      relevanceScore: Math.min((hit.points ?? 0) / maxPoints, 1.0),
      publishedAt: hit.created_at,
      summary: `${hit.points ?? 0} points, ${hit.num_comments ?? 0} comments by ${hit.author ?? 'unknown'}`,
    };
  }

  private getTimestampForRange(timeRange: string): number | null {
    const now = Math.floor(Date.now() / 1000);
    const ranges: Record<string, number> = {
      hour: now - 3600,
      day: now - 86400,
      week: now - 604800,
      month: now - 2592000,
      year: now - 31536000,
    };
    return ranges[timeRange] ?? null;
  }
}
