export { evaluateVideo, resolveChecks, type EvaluateVideoOptions } from './evaluator';
export { evaluateBatch, type BatchConfig } from './batch';
export { compareReports } from './compare';
export type {
  EvaluationReport,
  EvaluationCheckResult,
  EvaluationThresholds,
  EvaluationMode,
  BatchReport,
  ComparisonReport,
  DiversityResult,
} from '../domain';
export {
  EvaluationReportSchema,
  EvaluationCheckResultSchema,
  EvaluationThresholdsSchema,
  EvaluationModeSchema,
  BatchReportSchema,
  ComparisonReportSchema,
  DiversityResultSchema,
  MODE_CHECK_PRESETS,
} from '../domain';
