/**
 * Content Machine - Automated Short-Form Video Generation Pipeline
 *
 * Daily Pipeline:  1A → 1B → 2 → 3 → 4 → 5 → 6 → 7
 * Weekly Batch:    Deep Research → Backlog Items
 */

export { PipelineOrchestrator } from './pipeline/orchestrator.js';

// Steps
export { TrendIngestStep } from './steps/1a-trend-ingest.js';
export { PlannerStep } from './steps/1b-planner.js';
export { ScriptGenerationStep } from './steps/2-script-generation.js';
export { AssetCaptureStep } from './steps/3-asset-capture.js';
export { VideoRenderStep } from './steps/4-video-render.js';
export { HumanReviewQueue, reviewQueue } from './steps/5-human-review.js';
export { ExportPackageStep } from './steps/6-export-package.js';
export { AnalyticsStep } from './steps/7-analytics.js';

// Jobs
export { WeeklyDeepResearch, runWeeklyResearch } from './jobs/weekly-research.js';

// Types
export type {
  TrendItem,
  ContentObject,
  SceneJSON,
  Script,
  Asset,
  ExportPackage,
  PipelineJob,
} from './types/index.js';
export type { ReviewItem, ReviewDecision } from './steps/5-human-review.js';
export type { PerformanceMetrics, AnalyticsInsights } from './steps/7-analytics.js';
export type { DeepResearchResult, WeeklyResearchOutput } from './jobs/weekly-research.js';
