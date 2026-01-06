/**
 * Research Tools - Registry and Exports
 */
import type { ResearchSource } from '../schema';
import type { ResearchTool, ToolConfig } from './types';
import { HackerNewsTool } from './hackernews';
import { RedditTool } from './reddit';
import { WebSearchTool } from './web-search';
import { TavilySearchTool } from './tavily';

// Re-export types
export type { ResearchTool, ToolConfig, SearchToolOptions, SearchToolResult, RateLimitStatus } from './types';

// Re-export tool classes
export { HackerNewsTool } from './hackernews';
export { RedditTool } from './reddit';
export { WebSearchTool } from './web-search';
export { TavilySearchTool } from './tavily';

// Singleton instances for reuse
const toolInstances = new Map<ResearchSource, ResearchTool>();

/**
 * Get a tool instance for the given source.
 * Creates singleton instances for efficiency.
 */
export function getToolForSource(source: ResearchSource, config?: ToolConfig): ResearchTool | null {
  // Check cache first
  if (toolInstances.has(source)) {
    return toolInstances.get(source)!;
  }

  // Create new instance
  const tool = createTool(source, config);
  if (tool) {
    toolInstances.set(source, tool);
  }
  return tool;
}

/**
 * Create a new tool instance (not cached).
 */
export function createTool(source: ResearchSource, config?: ToolConfig): ResearchTool | null {
  switch (source) {
    case 'hackernews':
      return new HackerNewsTool(config);
    case 'reddit':
      return new RedditTool(config);
    case 'web':
      return new WebSearchTool(config);
    case 'tavily':
      return new TavilySearchTool(config);
    case 'youtube':
    case 'twitter':
      // Not implemented yet
      return null;
    default:
      return null;
  }
}

/**
 * Get all available tools that can be used.
 */
export function getAvailableTools(config?: ToolConfig): ResearchTool[] {
  const sources: ResearchSource[] = ['hackernews', 'reddit', 'web', 'tavily'];
  return sources
    .map((source) => createTool(source, config))
    .filter((tool): tool is ResearchTool => tool !== null && tool.isAvailable());
}

/**
 * Clear cached tool instances (useful for testing).
 */
export function clearToolInstances(): void {
  toolInstances.clear();
}
