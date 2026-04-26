/**
 * content-machine - short-form video skill pack and runtime
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
export {
  VisualQualityIssueSchema,
  VisualQualityReportSchema,
  analyzeVisualsQuality,
  type VisualQualityIssue,
  type VisualQualityOptions,
  type VisualQualityReport,
} from './visuals/quality';
export {
  HIGHLIGHT_SELECTION_SCHEMA_VERSION,
  HIGHLIGHT_APPROVAL_SCHEMA_VERSION,
  BOUNDARY_SNAP_SCHEMA_VERSION,
  SOURCE_MEDIA_ANALYSIS_SCHEMA_VERSION,
  HighlightApprovalSchema,
  HighlightApprovalOutputSchema,
  HighlightCandidateScoresSchema,
  HighlightCandidateSignalsSchema,
  HighlightCandidateSourceSignalsSchema,
  HighlightCandidateSchema,
  BoundarySnapOutputSchema,
  HighlightSelectionOutputSchema,
  HighlightSelectionParamsSchema,
  SourceMediaAnalysisOutputSchema,
  type HighlightApproval,
  type HighlightApprovalOutput,
  type HighlightCandidate,
  type HighlightCandidateScores,
  type HighlightCandidateSignals,
  type HighlightCandidateSourceSignals,
  type BoundarySnapOutput,
  type HighlightSelectionOutput,
  type HighlightSelectionParams,
  type SourceMediaAnalysisOutput,
} from './domain';
export {
  analyzeSourceMedia,
  analyzeSourceMediaFromProbe,
  createHighlightApproval,
  selectHighlightCandidates,
  snapHighlightBoundaries,
} from './highlights';
export {
  MediaIndexSchema,
  MediaIndexItemSchema,
  StyleProfileLibrarySchema,
  StyleProfileSchema,
  type MediaIndex,
  type MediaIndexItem,
  type StyleProfile,
  type StyleProfileLibrary,
} from './domain';
export { buildMediaIndex, upsertStyleProfile } from './library';

// Render pipeline
export type { RenderProps, RenderOutput } from './domain';
export { RenderPropsSchema, RenderOutputSchema } from './domain';

// Remotion template SDK (for code templates)
export * as TemplateSDK from './render/template-sdk';

// Style system - presets
export { PALETTES } from './render/presets/palette';
export { TYPOGRAPHY_PRESETS } from './render/presets/typography';
export { ANIMATION_PRESETS } from './render/presets/animation';
export { THEME_CAPTION_PRESETS } from './render/presets/caption';

// Style system - tokens
export * from './render/tokens';

// Caption export/runtime contracts
export {
  CaptionExportSchema,
  CaptionExportWordSchema,
  CaptionSegmentQualityIssueSchema,
  CaptionSegmentQualityReportSchema,
  CaptionSegmentSchema,
  RemotionCaptionSchema,
  analyzeCaptionSegments,
  createCaptionExport,
  formatAssCaptions,
  formatSrtCaptions,
  toCaptionSegments,
  toRemotionCaptions,
  type AssCaptionStyle,
  type CaptionExport,
  type CaptionExportWord,
  type CaptionSegment,
  type CaptionSegmentOptions,
  type CaptionSegmentQualityIssue,
  type CaptionSegmentQualityReport,
  type CaptionSegmentQualityThresholds,
  type RemotionCaption,
} from './render/captions/export';

// Style system - themes
export { createThemeRegistry, defaultThemeRegistry } from './render/themes';
export type { Theme, ThemeRegistry } from './render/themes';

// Research types
export type { Evidence, ContentAngle, ResearchOutput, ResearchSource } from './domain';
export { EvidenceSchema, ContentAngleSchema, ResearchOutputSchema } from './domain';

// Research tools
export { HackerNewsTool } from './research/tools/hackernews';
export { RedditTool } from './research/tools/reddit';
export { WebSearchTool } from './research/tools/web-search';
export type { ResearchTool, SearchToolOptions, SearchToolResult } from './research/tools/types';

// VideoSpec (reverse-engineering)
export { analyzeVideoToVideoSpecV1 } from './videospec/analyze';
export type { AnalyzeVideoToVideoSpecV1Options } from './videospec/analyze';
export { VideoSpecV1Schema, VIDEOSPEC_V1_VERSION } from './domain';
export type { VideoSpecV1 } from './domain';

// Agent/runtime entrypoints
export {
  runHarnessTool,
  executeHarnessTool,
  parseHarnessInput,
  type HarnessArtifact,
  type HarnessFailure,
  type HarnessRequestMeta,
  type HarnessSuccess,
  type HarnessToolContext,
  type HarnessToolResult,
} from './harness/json-stdio';
export { BriefToScriptRequestSchema, generateBriefToScript } from './harness/brief-to-script';
export { DoctorReportRequestSchema, runDoctorReport } from './harness/doctor-report';
export { FlowCatalogRequestSchema, listFlowCatalog } from './harness/flow-catalog';
export { RunFlowRequestSchema, runFlowHandler, runFlowFromManifest } from './harness/flow-runner';
export { GenerateShortRequestSchema, runGenerateShort } from './harness/generate-short';
export { IngestRequestSchema, ingestReferenceVideo } from './harness/ingest';
export { InstallSkillPackRequestSchema, installSkillPack } from './harness/install-skill-pack';
export {
  RedditStoryAssetsRequestSchema,
  runRedditStoryAssets,
} from './harness/reddit-story-assets';
export {
  LongformHighlightSelectRequestSchema,
  runLongformHighlightSelect,
} from './harness/longform-highlight-select';
export { HighlightApprovalRequestSchema, runHighlightApproval } from './harness/highlight-approval';
export { BoundarySnapRequestSchema, runBoundarySnap } from './harness/boundary-snap';
export {
  SourceMediaAnalyzeRequestSchema,
  runSourceMediaAnalyze,
} from './harness/source-media-analyze';
export { MediaIndexRequestSchema, runMediaIndex } from './harness/media-index';
export {
  StyleProfileLibraryRequestSchema,
  runStyleProfileLibrary,
} from './harness/style-profile-library';
export { PublishPrepRequestSchema, runPublishPrep } from './harness/publish-prep';
export { ScriptToAudioRequestSchema, runScriptToAudio } from './harness/script-to-audio';
export { SkillCatalogRequestSchema, listSkillCatalog } from './harness/skill-catalog';
export {
  TimestampsToVisualsRequestSchema,
  runTimestampsToVisuals,
} from './harness/timestamps-to-visuals';
export { VideoRenderRequestSchema, runVideoRender } from './harness/video-render';
