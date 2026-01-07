/**
 * Abstract Base Research Tool
 *
 * Template Method pattern: defines the skeleton of the search algorithm,
 * deferring specific steps to subclasses.
 */
import type { Evidence, ResearchSource } from '../schema';
import type {
  ResearchTool,
  SearchToolOptions,
  SearchToolResult,
  RateLimitStatus,
  ToolConfig,
} from './types';

/**
 * Abstract base class for research tools implementing the Template Method pattern.
 *
 * Provides common infrastructure (config, availability, standardized errors)
 * while allowing subclasses to customize:
 * - URL building
 * - Request headers
 * - Response parsing
 * - Evidence transformation
 */
export abstract class BaseResearchTool<TResponse, THit> implements ResearchTool {
  abstract readonly source: ResearchSource;
  abstract readonly name: string;

  protected config: ToolConfig;
  protected rateLimitStatus: RateLimitStatus = { isLimited: false, remaining: 100 };

  constructor(config: ToolConfig = {}) {
    this.config = {
      timeoutMs: config.timeoutMs ?? 10000,
      userAgent: config.userAgent ?? 'content-machine/1.0',
      apiKey: config.apiKey,
      maxScoreNormalization: config.maxScoreNormalization ?? this.getDefaultMaxScore(),
    };
  }

  /**
   * Default max score for normalization (override in subclasses)
   */
  protected getDefaultMaxScore(): number {
    return 1000;
  }

  /**
   * Check if this tool is available for use
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    return this.rateLimitStatus;
  }

  /**
   * Template Method: Execute search with common error handling
   */
  async search(query: string, options: SearchToolOptions = {}): Promise<SearchToolResult> {
    const startTime = Date.now();
    const limit = options.limit ?? 10;

    // Check availability before making request
    if (!this.isAvailable()) {
      return this.createErrorResult(startTime, this.getUnavailableMessage());
    }

    try {
      const url = this.buildUrl(query, limit, options);
      const headers = this.buildHeaders();

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(this.config.timeoutMs ?? 10000),
      });

      if (!response.ok) {
        throw new Error(`${this.name} API error: ${response.status} ${response.statusText}`);
      }

      const data: TResponse = await response.json();
      const hits = this.extractHits(data);
      const evidence = hits.map((hit, index) => this.toEvidence(hit, index, hits.length));

      return {
        success: true,
        evidence,
        totalFound: this.getTotalCount(data, hits.length),
        searchTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return this.createErrorResult(
        startTime,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Create a standardized error result
   */
  protected createErrorResult(startTime: number, errorMessage: string): SearchToolResult {
    return {
      success: false,
      evidence: [],
      totalFound: 0,
      searchTimeMs: Date.now() - startTime,
      error: errorMessage,
    };
  }

  /**
   * Get message when tool is unavailable (e.g., missing API key)
   */
  protected getUnavailableMessage(): string {
    return `${this.name} is not available`;
  }

  // Abstract methods to be implemented by subclasses

  /**
   * Build the API request URL
   */
  protected abstract buildUrl(query: string, limit: number, options: SearchToolOptions): string;

  /**
   * Build request headers
   */
  protected abstract buildHeaders(): Record<string, string>;

  /**
   * Extract hits/results from API response
   */
  protected abstract extractHits(response: TResponse): THit[];

  /**
   * Convert a hit to Evidence object
   */
  protected abstract toEvidence(hit: THit, index: number, total: number): Evidence;

  /**
   * Get total count from response (defaults to hits length)
   */
  protected getTotalCount(_response: TResponse, hitsLength: number): number {
    return hitsLength;
  }
}

