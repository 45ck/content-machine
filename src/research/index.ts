/**
 * Research Module - Public API
 *
 * Provides research tools for gathering evidence from multiple sources.
 */

// Schema exports
export {
  ResearchSourceEnum,
  EvidenceSchema,
  TrendingTopicSchema,
  ContentAngleSchema,
  ResearchOutputSchema,
} from './schema';

export type {
  ResearchSource,
  Evidence,
  TrendingTopic,
  ContentAngle,
  ResearchOutput,
} from './schema';

// Tool exports
export {
  HackerNewsTool,
  RedditTool,
  WebSearchTool,
  getToolForSource,
  createTool,
  getAvailableTools,
  clearToolInstances,
} from './tools';

export type {
  ResearchTool,
  ToolConfig,
  SearchToolOptions,
  SearchToolResult,
  RateLimitStatus,
} from './tools';

// Orchestrator exports
export {
  ResearchOrchestrator,
  createResearchOrchestrator,
} from './orchestrator';

export type {
  OrchestratorConfig,
  OrchestratorResult,
} from './orchestrator';
