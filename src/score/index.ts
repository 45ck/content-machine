/**
 * Score module - Script scoring and sync quality rating
 */

// Script scorer
export { scoreScript, type ScoreInputs } from './scorer';
export {
  ScoreOutputSchema,
  ScoreCheckSchema,
  ScoreSeveritySchema,
  type ScoreOutput,
  type ScoreCheck,
  type ScoreSeverity,
} from './schema';

// Sync rater
export { rateSyncQuality, formatSyncRatingCLI } from './sync-rater';
export {
  type SyncRatingOutput,
  type SyncMetrics,
  type WordMatch,
  type SyncError,
  type OCRFrame,
  type SyncRatingOptions,
  type SyncRatingLabel,
  SyncRatingOutputSchema,
  SyncMetricsSchema,
  WordMatchSchema,
  SyncErrorSchema,
  OCRFrameSchema,
  SyncRatingOptionsSchema,
  SyncThresholdsSchema,
} from './sync-schema';

// Caption quality metrics
export {
  analyzeCaptionQuality,
  formatQualityReport,
  QUALITY_THRESHOLDS,
  type CaptionQualityReport,
  type CaptionIssue,
} from './caption-quality';

// Paging quality metrics
export {
  analyzePagingQuality,
  formatPagingReport,
  PAGING_THRESHOLDS,
  type PagingQualityReport,
  type PageMetrics,
  type PagingIssue,
} from './paging-quality';

// Pacing quality metrics
export {
  analyzePacingQuality,
  formatPacingReport,
  PACING_THRESHOLDS,
  type PacingQualityReport,
  type ScenePacingMetrics,
  type PacingIssue,
} from './pacing-quality';
