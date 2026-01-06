/**
 * Research Orchestrator
 *
 * Coordinates multiple research tools, merges results, and generates content angles.
 */
import type { LLMProvider, LLMOptions } from '../core/llm/provider';
import type {
  ResearchSource,
  Evidence,
  ContentAngle,
  ResearchOutput,
} from './schema';
import {
  ContentAngleSchema,
  ResearchOutputSchema,
} from './schema';
import type { ResearchTool, SearchToolOptions, SearchToolResult } from './tools';
import { createTool } from './tools';

export interface OrchestratorConfig {
  /** Sources to search (defaults to all available) */
  sources?: ResearchSource[];
  /** Maximum results per source */
  limitPerSource?: number;
  /** Time range for search */
  timeRange?: SearchToolOptions['timeRange'];
  /** Whether to generate content angles via LLM */
  generateAngles?: boolean;
  /** Maximum number of angles to generate */
  maxAngles?: number;
  /** Timeout for each source in ms */
  timeoutMs?: number;
  /** Run searches in parallel */
  parallel?: boolean;
}

export interface OrchestratorResult {
  output: ResearchOutput;
  errors: Array<{ source: ResearchSource; error: string }>;
  timingMs: {
    total: number;
    perSource: Record<string, number>;
    angleGeneration?: number;
  };
}

const DEFAULT_CONFIG: Required<OrchestratorConfig> = {
  sources: ['hackernews', 'reddit', 'web'],
  limitPerSource: 10,
  timeRange: 'week',
  generateAngles: true,
  maxAngles: 3,
  timeoutMs: 15000,
  parallel: true,
};

interface SearchContext {
  errors: OrchestratorResult['errors'];
  timingPerSource: Record<string, number>;
  allEvidence: Evidence[];
  sourcesSearched: ResearchSource[];
}

interface SourceSearchResult {
  source: ResearchSource;
  result: SearchToolResult;
}

const ANGLE_GENERATION_PROMPT = `You are a content strategist for short-form video (TikTok, Reels, Shorts).
Based on the research evidence provided, generate content angles that would perform well.

For each angle, provide:
- angle: A clear description of the content angle
- hook: An attention-grabbing opening line (under 10 words)
- archetype: One of: listicle, versus, howto, myth, story, hot-take
- targetEmotion: The primary emotion to evoke (curiosity, surprise, fear, excitement, etc.)
- confidence: Your confidence score 0-1 based on evidence strength

Return a JSON array of content angles. Focus on angles with strong evidence support.`;

export class ResearchOrchestrator {
  private config: Required<OrchestratorConfig>;
  private llmProvider?: LLMProvider;
  private tools: Map<ResearchSource, ResearchTool> = new Map();

  constructor(config: OrchestratorConfig = {}, llmProvider?: LLMProvider) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.llmProvider = llmProvider;
    this.initializeTools();
  }

  private initializeTools(): void {
    for (const source of this.config.sources) {
      const tool = createTool(source, { timeoutMs: this.config.timeoutMs });
      if (tool && tool.isAvailable()) {
        this.tools.set(source, tool);
      }
    }
  }

  /**
   * Execute research across all configured sources
   */
  async research(query: string): Promise<OrchestratorResult> {
    const startTime = Date.now();
    const context = this.createSearchContext();

    await this.executeSearches(query, context);

    const sortedEvidence = this.deduplicateAndSort(context.allEvidence);
    const angleResult = await this.tryGenerateAngles(sortedEvidence, context);

    const output = this.buildOutput(query, sortedEvidence, angleResult.angles, context.sourcesSearched);
    const validated = ResearchOutputSchema.parse(output);

    return {
      output: validated,
      errors: context.errors,
      timingMs: {
        total: Date.now() - startTime,
        perSource: context.timingPerSource,
        angleGeneration: angleResult.timeMs,
      },
    };
  }

  private createSearchContext(): SearchContext {
    return {
      errors: [],
      timingPerSource: {},
      allEvidence: [],
      sourcesSearched: [],
    };
  }

  private async executeSearches(query: string, context: SearchContext): Promise<void> {
    const searchOptions: SearchToolOptions = {
      limit: this.config.limitPerSource,
      timeRange: this.config.timeRange,
    };

    if (this.config.parallel) {
      await this.executeParallelSearches(query, searchOptions, context);
    } else {
      await this.executeSequentialSearches(query, searchOptions, context);
    }
  }

  private async executeParallelSearches(
    query: string,
    options: SearchToolOptions,
    context: SearchContext
  ): Promise<void> {
    const promises = Array.from(this.tools.entries()).map(([source, tool]) =>
      this.searchWithTiming(source, tool, query, options, context.timingPerSource)
    );

    const results = await Promise.all(promises);
    this.processSearchResults(results, context);
  }

  private async executeSequentialSearches(
    query: string,
    options: SearchToolOptions,
    context: SearchContext
  ): Promise<void> {
    for (const [source, tool] of this.tools) {
      const result = await this.searchWithTiming(source, tool, query, options, context.timingPerSource);
      this.processSearchResults([result], context);
    }
  }

  private async searchWithTiming(
    source: ResearchSource,
    tool: ResearchTool,
    query: string,
    options: SearchToolOptions,
    timing: Record<string, number>
  ): Promise<SourceSearchResult> {
    const sourceStart = Date.now();
    try {
      const result = await tool.search(query, options);
      timing[source] = Date.now() - sourceStart;
      return { source, result };
    } catch (error) {
      timing[source] = Date.now() - sourceStart;
      return {
        source,
        result: {
          success: false,
          evidence: [],
          totalFound: 0,
          searchTimeMs: 0,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private processSearchResults(results: SourceSearchResult[], context: SearchContext): void {
    for (const { source, result } of results) {
      if (result.success) {
        context.allEvidence.push(...result.evidence);
        context.sourcesSearched.push(source);
      } else if (result.error) {
        context.errors.push({ source, error: result.error });
      }
    }
  }

  private async tryGenerateAngles(
    evidence: Evidence[],
    context: SearchContext
  ): Promise<{ angles?: ContentAngle[]; timeMs?: number }> {
    if (!this.config.generateAngles || !this.llmProvider || evidence.length === 0) {
      return {};
    }

    const angleStart = Date.now();
    try {
      const angles = await this.generateContentAngles(evidence);
      return { angles, timeMs: Date.now() - angleStart };
    } catch (error) {
      context.errors.push({
        source: 'web' as ResearchSource,
        error: `Angle generation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return { timeMs: Date.now() - angleStart };
    }
  }

  private buildOutput(
    query: string,
    evidence: Evidence[],
    angles: ContentAngle[] | undefined,
    sources: ResearchSource[]
  ): ResearchOutput {
    return {
      query,
      evidence,
      suggestedAngles: angles,
      searchedAt: new Date().toISOString(),
      sources,
      totalResults: evidence.length,
    };
  }

  /**
   * Deduplicate evidence by URL and sort by relevance
   */
  private deduplicateAndSort(evidence: Evidence[]): Evidence[] {
    const seen = new Set<string>();
    const unique: Evidence[] = [];

    for (const item of evidence) {
      const normalizedUrl = this.normalizeUrl(item.url);
      if (!seen.has(normalizedUrl)) {
        seen.add(normalizedUrl);
        unique.push(item);
      }
    }

    // Sort by relevance score descending
    return unique.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slashes and common tracking params
      let normalized = `${parsed.host}${parsed.pathname}`.replace(/\/$/, '');
      return normalized.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Generate content angles using LLM
   */
  private async generateContentAngles(evidence: Evidence[]): Promise<ContentAngle[]> {
    if (!this.llmProvider) {
      return [];
    }

    // Prepare evidence summary for prompt
    const evidenceSummary = evidence
      .slice(0, 15) // Top 15 results
      .map((e, i) => `${i + 1}. [${e.source}] ${e.title}\n   ${e.summary ?? ''}`)
      .join('\n\n');

    const userPrompt = `Research query: "${evidence[0]?.title?.split(' ').slice(0, 5).join(' ')}..."

Evidence found:
${evidenceSummary}

Generate ${this.config.maxAngles} content angles as a JSON array.`;

    const options: LLMOptions = {
      temperature: 0.7,
      jsonMode: true,
      maxTokens: 1000,
    };

    const response = await this.llmProvider.chat(
      [
        { role: 'system', content: ANGLE_GENERATION_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      options
    );

    // Parse and validate response
    try {
      const parsed = JSON.parse(response.content);
      const angles = Array.isArray(parsed) 
        ? parsed 
        : parsed.angles ?? parsed.contentAngles ?? parsed.content_angles ?? [];

      // Validate each angle
      const validAngles: ContentAngle[] = [];
      for (const angle of angles.slice(0, this.config.maxAngles)) {
        const result = ContentAngleSchema.safeParse(angle);
        if (result.success) {
          validAngles.push(result.data);
        }
      }

      return validAngles;
    } catch {
      return [];
    }
  }

  /**
   * Get the tools currently configured
   */
  getConfiguredTools(): ResearchSource[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a specific source is available
   */
  isSourceAvailable(source: ResearchSource): boolean {
    return this.tools.has(source);
  }
}

/**
 * Factory function to create an orchestrator with default settings
 */
export function createResearchOrchestrator(
  config?: OrchestratorConfig,
  llmProvider?: LLMProvider
): ResearchOrchestrator {
  return new ResearchOrchestrator(config, llmProvider);
}
