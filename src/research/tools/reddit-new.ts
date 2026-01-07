/**
 * Reddit Research Tool - JSON API
 *
 * Uses Template Method pattern via BaseResearchTool.
 */
import type { Evidence } from '../schema';
import type {
  SearchToolOptions,
  ToolConfig,
  RedditPost,
  RedditSearchResponse,
} from './types';
import { BaseResearchTool } from './base-tool';

const REDDIT_BASE = 'https://www.reddit.com';
const MAX_SCORE_DEFAULT = 10000;

export class RedditTool extends BaseResearchTool<RedditSearchResponse, RedditPost> {
  readonly source = 'reddit' as const;
  readonly name = 'Reddit';

  constructor(config: ToolConfig = {}) {
    super(config);
    this.rateLimitStatus = { isLimited: false, remaining: 100 };
  }

  protected getDefaultMaxScore(): number {
    return MAX_SCORE_DEFAULT;
  }

  protected buildUrl(query: string, limit: number, options: SearchToolOptions): string {
    const params = new URLSearchParams({
      q: query,
      limit: String(limit),
      sort: 'relevance',
      t: this.mapTimeRange(options.timeRange),
    });

    const baseUrl = options.subreddit
      ? `${REDDIT_BASE}/r/${options.subreddit}/search.json`
      : `${REDDIT_BASE}/search.json`;

    return `${baseUrl}?${params}`;
  }

  protected buildHeaders(): Record<string, string> {
    return {
      'User-Agent': this.config.userAgent ?? 'content-machine/1.0',
    };
  }

  protected extractHits(response: RedditSearchResponse): RedditPost[] {
    return response.data.children.map((child) => child.data);
  }

  protected toEvidence(post: RedditPost): Evidence {
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
      summary:
        excerpt || `${post.score} upvotes, ${post.num_comments} comments in r/${post.subreddit}`,
    };
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
}
