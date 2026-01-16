/**
 * content-machine - CLI-first automated short-form video generator
 *
 * @packageDocumentation
 */

// Core infrastructure
export { loadConfig } from './core/config';
export { logger, createLogger } from './core/logger';
export { CMError, isRetryable } from './core/errors';
export { withRetry } from './core/retry';
export type { PipelineStage } from './core/pipeline';

// LLM providers
export type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './core/llm/provider';
export { OpenAIProvider } from './core/llm/openai';
export { AnthropicProvider } from './core/llm/anthropic';

// Script generation
export { generateScript } from './script/generator';
export type { ScriptOutput, ScriptSection, Scene, ScriptMetadata } from './domain';
export { ScriptOutputSchema, ScriptSectionSchema, SceneSchema } from './domain';

// Audio pipeline
export type { AudioOutput, WordTimestamp } from './domain';
export { AudioOutputSchema, WordTimestampSchema } from './domain';

// Importers
export { generateTimestamps } from './importers/timestamps';
export { importVisualsFromClips } from './importers/visuals';

// Visuals/footage matching
export type { VisualsOutput, VideoClip, VisualAsset } from './domain';
export { VisualsOutputSchema, VideoClipSchema, VisualAssetSchema } from './domain';

// Render pipeline
export type { RenderProps, RenderOutput } from './domain';
export { RenderPropsSchema, RenderOutputSchema } from './domain';

// Style system - presets
export { PALETTES } from './render/presets/palette';
export { TYPOGRAPHY_PRESETS } from './render/presets/typography';
export { ANIMATION_PRESETS } from './render/presets/animation';
export { CAPTION_PRESETS } from './render/presets/caption';

// Style system - tokens
export * from './render/tokens';

// Style system - themes
export { createThemeRegistry, defaultThemeRegistry } from './render/themes';
export type { Theme, ThemeRegistry } from './render/themes';

// Research pipeline
export { ResearchOrchestrator, createResearchOrchestrator } from './research/orchestrator';
export type { Evidence, ContentAngle, ResearchOutput, ResearchSource } from './domain';
export { EvidenceSchema, ContentAngleSchema, ResearchOutputSchema } from './domain';

// Research tools
export { HackerNewsTool } from './research/tools/hackernews';
export { RedditTool } from './research/tools/reddit';
export { WebSearchTool } from './research/tools/web-search';
export type { ResearchTool, SearchToolOptions, SearchToolResult } from './research/tools/types';

// Workflows
export type { WorkflowDefinition, WorkflowCommand, WorkflowStage, WorkflowInputs } from './domain';

// Test stubs (for testing consumers)
export { FakeLLMProvider } from './test/stubs/fake-llm';
