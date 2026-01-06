/**
 * content-machine - CLI-first automated short-form video generator
 *
 * @packageDocumentation
 */

// Core infrastructure
export { loadConfig } from './core/config';
export { logger, createChildLogger } from './core/logger';
export { CMError, ErrorCode, ERROR_CODES, isRetryable, formatErrorForUser } from './core/errors';
export { retry, retryWithExponentialBackoff } from './core/retry';
export { Pipeline, PipelineStage } from './core/pipeline';

// LLM providers
export type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './core/llm/provider';
export { OpenAIProvider } from './core/llm/openai';
export { AnthropicProvider } from './core/llm/anthropic';

// Script generation
export { ScriptGenerator } from './script/generator';
export type {
  ScriptScene,
  ScriptOutput,
  VisualCue,
  ContentArchetype,
} from './script/schema';
export {
  ScriptSceneSchema,
  ScriptOutputSchema,
  VisualCueSchema,
  ContentArchetypeSchema,
} from './script/schema';

// Audio pipeline
export type { AudioOutput, WordTimestamp, AudioSegment } from './audio/schema';
export { AudioOutputSchema, WordTimestampSchema, AudioSegmentSchema } from './audio/schema';

// Visuals/footage matching
export type { VisualsOutput, FootageClip, FootageProvider } from './visuals/schema';
export { VisualsOutputSchema, FootageClipSchema, FootageProviderSchema } from './visuals/schema';

// Render pipeline
export type { RenderProps, CaptionWord, VideoSpec, RenderOutput } from './render/schema';
export { RenderPropsSchema, CaptionWordSchema, VideoSpecSchema, RenderOutputSchema } from './render/schema';

// Style system
export { resolveTheme } from './render/styles/resolver';
export { defaultTheme, minimalTheme, boldTheme, neonTheme } from './render/themes';
export { palettes } from './render/presets/palette';
export { typographyPresets } from './render/presets/typography';
export { animationPresets } from './render/presets/animation';
export { captionPresets } from './render/presets/caption';
export * from './render/tokens';

// Research pipeline
export { ResearchOrchestrator, createResearchOrchestrator } from './research/orchestrator';
export type {
  Evidence,
  ContentAngle,
  ResearchOutput,
  ResearchSource,
} from './research/schema';
export { EvidenceSchema, ContentAngleSchema, ResearchOutputSchema } from './research/schema';

// Research tools
export { HackerNewsTool } from './research/tools/hackernews';
export { RedditTool } from './research/tools/reddit';
export { WebSearchTool } from './research/tools/web-search';
export type { ResearchTool, SearchToolOptions, SearchToolResult } from './research/tools/types';

// Test stubs (for testing consumers)
export { FakeLLMProvider } from './test/stubs/fake-llm';
export { FakeAsrEngine } from './test/stubs/fake-asr';
export { FakeTtsEngine } from './test/stubs/fake-tts';
export { FakePexelsProvider } from './test/stubs/fake-pexels';
