/**
 * HackerNews Research Tool - Algolia API
 */
import type { Evidence } from '../schema';
import type {
  ResearchTool,
  SearchToolOptions,
  SearchToolResult,
  RateLimitStatus,
  ToolConfig,
  AlgoliaHit,
  AlgoliaSearchResponse,
} from './types';

const ALGOLIA_BASE = 'https://hn.algolia.com/api/v1';
const HN_ITEM_BASE = 'https://news.ycombinator.com/item';
const MAX_POINTS_DEFAULT = 500;

export class HackerNewsTool implements ResearchTool {
  readonly source = 'hackernews' as const;
  readonly name = 'HackerNews';
  private config: ToolConfig;
  private rateLimitStatus: RateLimitStatus = { isLimited: false, remaining: 1000 };

  constructor(config: ToolConfig = {}) {
    this.config = {
      timeoutMs: config.timeoutMs ?? 10000,
      userAgent: config.userAgent ?? 'content-machine/1.0',
      maxScoreNormalization: config.maxScoreNormalization ?? MAX_POINTS_DEFAULT,
    };
  }

  isAvailable(): boolean {
    return true;
  }

  getRateLimitStatus(): RateLimitStatus {
    return this.rateLimitStatus;
  }

  async search(query: string, options: SearchToolOptions = {}): Promise<SearchToolResult> {
    const startTime = Date.now();
    const limit = options.limit ?? 10;

    try {
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

      const response = await fetch(`${ALGOLIA_BASE}/search?${params}`, {
        headers: {
          'User-Agent': this.config.userAgent ?? 'content-machine/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10000),
      });

      if (!response.ok) {
        throw new Error(`HackerNews API error: ${response.status} ${response.statusText}`);
      }

      const data: AlgoliaSearchResponse = await response.json();
      const evidence = data.hits.map((hit) => this.toEvidence(hit));

      return {
        success: true,
        evidence,
        totalFound: data.nbHits,
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

  private toEvidence(hit: AlgoliaHit): Evidence {
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
}
