import { z } from 'zod';

export const EvaluationModeSchema = z.enum(['fast', 'balanced', 'quality']);
export type EvaluationMode = z.infer<typeof EvaluationModeSchema>;

/**
 * Check presets for each evaluation mode.
 * fast: lightweight checks only (no Python ML deps)
 * balanced: adds temporal + OCR/ASR checks
 * quality: all checks including CLIP-based semantic fidelity and safety
 */
export const MODE_CHECK_PRESETS: Record<EvaluationMode, Record<string, boolean>> = {
  fast: {
    validate: true,
    score: true,
    audioSignal: true,
    freeze: true,
    frameBounds: true,
    rate: false,
    captionQuality: false,
    temporalQuality: false,
    semanticFidelity: false,
    safety: false,
    dnsmos: false,
    flowConsistency: false,
  },
  balanced: {
    validate: true,
    score: true,
    audioSignal: true,
    freeze: true,
    frameBounds: true,
    temporalQuality: true,
    rate: true,
    captionQuality: true,
    semanticFidelity: false,
    safety: false,
    dnsmos: false,
    flowConsistency: false,
  },
  quality: {
    validate: true,
    score: true,
    audioSignal: true,
    freeze: true,
    frameBounds: true,
    temporalQuality: true,
    rate: true,
    captionQuality: true,
    semanticFidelity: true,
    safety: true,
    dnsmos: true,
    flowConsistency: true,
  },
};

export const EvaluationThresholdsSchema = z.object({
  minSyncRating: z.number().min(0).max(100).optional(),
  minCaptionOverall: z.number().min(0).max(1).optional(),
  minClipScore: z.number().min(0).max(1).optional(),
  validateProfile: z.enum(['portrait', 'landscape']).default('portrait'),
});

export type EvaluationThresholds = z.infer<typeof EvaluationThresholdsSchema>;

export const EvaluationCheckResultSchema = z.object({
  checkId: z.enum([
    'validate',
    'rate',
    'captionQuality',
    'score',
    'temporalQuality',
    'audioSignal',
    'frameBounds',
    'semanticFidelity',
    'safety',
    'freeze',
    'dnsmos',
    'flowConsistency',
  ]),
  passed: z.boolean(),
  skipped: z.boolean(),
  error: z.string().optional(),
  summary: z.string(),
  durationMs: z.number(),
  detail: z.unknown().optional(),
});

export type EvaluationCheckResult = z.infer<typeof EvaluationCheckResultSchema>;

export const OverallScoreSchema = z.object({
  score: z.number().min(0).max(1),
  label: z.enum(['good', 'borderline', 'bad']),
  confidence: z.number().min(0).max(1),
});

export type OverallScore = z.infer<typeof OverallScoreSchema>;

export const EvaluationReportSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  videoPath: z.string(),
  passed: z.boolean(),
  mode: EvaluationModeSchema.optional(),
  inputHash: z.string().optional(),
  checks: z.array(EvaluationCheckResultSchema),
  thresholds: EvaluationThresholdsSchema,
  overall: OverallScoreSchema.optional(),
  totalDurationMs: z.number(),
  createdAt: z.string(),
});

export type EvaluationReport = z.infer<typeof EvaluationReportSchema>;

export const DiversityResultSchema = z.object({
  pairwiseSimilarities: z.array(
    z.object({
      videoA: z.string(),
      videoB: z.string(),
      similarity: z.number(),
    })
  ),
  nearDuplicates: z.array(
    z.object({
      videoA: z.string(),
      videoB: z.string(),
      similarity: z.number(),
    })
  ),
  meanSimilarity: z.number(),
  diversityScore: z.number().min(0).max(1),
});

export type DiversityResult = z.infer<typeof DiversityResultSchema>;

export const BatchReportSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  reports: z.array(EvaluationReportSchema),
  totalPassed: z.number(),
  totalFailed: z.number(),
  totalDurationMs: z.number(),
  createdAt: z.string(),
  diversity: DiversityResultSchema.optional(),
});

export type BatchReport = z.infer<typeof BatchReportSchema>;

export const ComparisonCheckDiffSchema = z.object({
  checkId: EvaluationCheckResultSchema.shape.checkId,
  previousPassed: z.boolean(),
  currentPassed: z.boolean(),
});

export type ComparisonCheckDiff = z.infer<typeof ComparisonCheckDiffSchema>;

export const ComparisonReportSchema = z.object({
  regressions: z.array(ComparisonCheckDiffSchema),
  improvements: z.array(ComparisonCheckDiffSchema),
  unchanged: z.array(ComparisonCheckDiffSchema),
  previousScore: z.number().optional(),
  currentScore: z.number().optional(),
  scoreDelta: z.number(),
});

export type ComparisonReport = z.infer<typeof ComparisonReportSchema>;
