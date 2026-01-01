/**
 * Step 1A: Trend Ingest (Deterministic)
 *
 * Fetches trends from sources (Reddit, etc.) and deduplicates.
 * This is a deterministic step - no LLM reasoning.
 */

import crypto from 'crypto';
import type { TrendItem } from '../types/index.js';

export interface TrendSource {
  name: string;
  fetch(): Promise<TrendItem[]>;
}

export class TrendIngestStep {
  private seenHashes: Set<string> = new Set();

  /**
   * Fetch trends from Reddit (placeholder - use MCP in production)
   */
  async fetchRedditHot(subreddit: string, limit = 25): Promise<TrendItem[]> {
    // TODO: Replace with actual Reddit MCP call
    // For now, return mock data
    console.log(`[Step 1A] Fetching r/${subreddit} (mock)...`);

    const mockPosts: TrendItem[] = [
      {
        id: 'reddit-1',
        source: 'reddit',
        title: 'Just made my first Discord bot - it took 10 minutes!',
        url: 'https://reddit.com/r/discordapp/1',
        score: 1500,
        fetchedAt: new Date(),
        contentHash: '',
      },
      {
        id: 'reddit-2',
        source: 'reddit',
        title: 'PSA: New Discord bot permissions are confusing',
        url: 'https://reddit.com/r/discordapp/2',
        score: 890,
        fetchedAt: new Date(),
        contentHash: '',
      },
      {
        id: 'reddit-3',
        source: 'reddit',
        title: 'My Minecraft server setup workflow (fully automated)',
        url: 'https://reddit.com/r/admincraft/3',
        score: 750,
        fetchedAt: new Date(),
        contentHash: '',
      },
    ];

    // Add content hashes
    return mockPosts.map((post) => ({
      ...post,
      contentHash: this.hashContent(post.title),
    }));
  }

  /**
   * Deduplicate trends based on content hash
   */
  deduplicate(trends: TrendItem[]): TrendItem[] {
    const unique: TrendItem[] = [];

    for (const trend of trends) {
      if (!this.seenHashes.has(trend.contentHash)) {
        this.seenHashes.add(trend.contentHash);
        unique.push(trend);
      }
    }

    console.log(`[Step 1A] Deduped: ${trends.length} → ${unique.length}`);
    return unique;
  }

  /**
   * Main execution - fetch and dedupe
   */
  async execute(subreddits: string[] = ['discordapp', 'admincraft']): Promise<TrendItem[]> {
    console.log('[Step 1A] Starting trend ingest...');

    const allTrends: TrendItem[] = [];

    for (const sub of subreddits) {
      const trends = await this.fetchRedditHot(sub);
      allTrends.push(...trends);
    }

    const unique = this.deduplicate(allTrends);

    // Sort by score
    unique.sort((a, b) => b.score - a.score);

    console.log(`[Step 1A] Complete: ${unique.length} unique trends`);
    return unique;
  }

  /**
   * Hash content for deduplication
   */
  private hashContent(content: string): string {
    const normalized = content.toLowerCase().replace(/[^a-z0-9]/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  }
}
