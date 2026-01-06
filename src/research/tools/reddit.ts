/**
 * Reddit Research Tool - JSON API
 */
import type { Evidence } from '../schema';
import type {
  ResearchTool,
  SearchToolOptions,
  SearchToolResult,
  RateLimitStatus,
  ToolConfig,
  RedditPost,
  RedditSearchResponse,
} from './types';

const REDDIT_BASE = 'https://www.reddit.com';
const MAX_SCORE_DEFAULT = 10000;

export class RedditTool implements ResearchTool {
  readonly source = 'reddit' as const;
  readonly name = 'Reddit';
  private config: ToolConfig;
  private rateLimitStatus: RateLimitStatus = { isLimited: false, remaining: 100 };

  constructor(config: ToolConfig = {}) {
    this.config = {
      timeoutMs: config.timeoutMs ?? 10000,
      userAgent: config.userAgent ?? 'content-machine/1.0',
      maxScoreNormalization: config.maxScoreNormalization ?? MAX_SCORE_DEFAULT,
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
        q: query,
        limit: String(limit),
        sort: 'relevance',
        t: this.mapTimeRange(options.timeRange),
      });

      const baseUrl = options.subreddit
        ? `${REDDIT_BASE}/r/${options.subreddit}/search.json`
        : `${REDDIT_BASE}/search.json`;

      const response = await fetch(`${baseUrl}?${params}`, {
        headers: {
          'User-Agent': this.config.userAgent ?? 'content-machine/1.0',
        },
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10000),
      });

      if (!response.ok) {
        throw new Error(`Reddit API error: ${response.status} ${response.statusText}`);
      }

      const data: RedditSearchResponse = await response.json();
      const evidence = data.data.children.map((child) => this.toEvidence(child.data));

      return {
        success: true,
        evidence,
        totalFound: data.data.children.length,
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

  private mapTimeRange(timeRange?: string): string {
    const mapping: Record<string, string> = {
      hour: 'hour',
      day: 'day',
      week: 'week',
      month: 'month',
      year: 'year',
      all: 'all',
    };
    return mapping[timeRange ?? 'all'] ?? 'all';
  }

  private toEvidence(post: RedditPost): Evidence {
    const maxScore = this.config.maxScoreNormalization ?? MAX_SCORE_DEFAULT;
    const excerpt = post.selftext
      ? post.selftext.slice(0, 200) + (post.selftext.length > 200 ? '...' : '')
      : '';

    return {
      title: post.title,
      url: `${REDDIT_BASE}${post.permalink}`,
      source: 'reddit',
      relevanceScore: Math.min(post.score / maxScore, 1.0),
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
      summary: excerpt || `${post.score} upvotes, ${post.num_comments} comments in r/${post.subreddit}`,
    };
  }
}
