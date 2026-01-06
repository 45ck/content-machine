/**
 * Research Tools - Type Definitions
 */
import type { Evidence, ResearchSource } from '../schema';

export interface SearchToolOptions {
  limit?: number;
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  subreddit?: string;
  timeoutMs?: number;
}

export interface RateLimitStatus {
  isLimited: boolean;
  remaining: number;
  resetAt?: string;
}

export interface SearchToolResult {
  success: boolean;
  evidence: Evidence[];
  totalFound: number;
  searchTimeMs: number;
  error?: string;
  rateLimit?: RateLimitStatus;
}

export interface ResearchTool {
  readonly source: ResearchSource;
  readonly name: string;
  search(query: string, options?: SearchToolOptions): Promise<SearchToolResult>;
  isAvailable(): boolean;
  getRateLimitStatus(): RateLimitStatus;
}

export interface ToolConfig {
  apiKey?: string;
  timeoutMs?: number;
  userAgent?: string;
  maxScoreNormalization?: number;
}

export interface AlgoliaHit {
  objectID: string;
  title: string;
  url: string | null;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  _highlightResult?: {
    title?: { value: string };
  };
}

export interface AlgoliaSearchResponse {
  hits: AlgoliaHit[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
  processingTimeMS: number;
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  url: string;
  author: string;
  score: number;
  num_comments: number;
  subreddit: string;
  created_utc: number;
  permalink: string;
}

export interface RedditSearchResponse {
  data: {
    after: string | null;
    before: string | null;
    children: Array<{
      kind: 't3';
      data: RedditPost;
    }>;
  };
}

export interface BraveWebResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  extra_snippets?: string[];
}

export interface BraveSearchResponse {
  query: {
    original: string;
    altered?: string;
  };
  web?: {
    results: BraveWebResult[];
  };
}

// Tavily API types
export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}
