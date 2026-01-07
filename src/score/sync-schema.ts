/**
 * Sync Rating Schemas
 *
 * Zod schemas for the video sync rating system (`cm rate`).
 * Compares OCR-extracted captions with ASR-extracted audio timestamps
 * to measure synchronization quality.
 */
import { z } from 'zod';

export const SYNC_SCHEMA_VERSION = '1.0.0';

// Word match between OCR and ASR
export const WordMatchSchema = z.object({
  word: z.string(),
  ocrTimestamp: z.number(), // When word appeared on screen (seconds)
  asrTimestamp: z.number(), // When word was spoken (seconds)
  driftMs: z.number(), // Difference in milliseconds (positive = audio late)
  matchQuality: z.enum(['exact', 'fuzzy', 'phonetic']).default('exact'),
});
export type WordMatch = z.infer<typeof WordMatchSchema>;

// Sync metrics
export const SyncMetricsSchema = z.object({
  // Core drift metrics
  meanDriftMs: z.number(),
  maxDriftMs: z.number(),
  p95DriftMs: z.number(),
  medianDriftMs: z.number(),

  // Direction metrics
  meanSignedDriftMs: z.number(),
  leadingRatio: z.number(), // % of words where audio leads (negative drift)
  laggingRatio: z.number(), // % of words where audio lags (positive drift)

  // Stability metrics
  driftStdDev: z.number(),

  // Coverage metrics
  matchedWords: z.number(),
  totalOcrWords: z.number(),
  totalAsrWords: z.number(),
  matchRatio: z.number(),
});
export type SyncMetrics = z.infer<typeof SyncMetricsSchema>;

// Rating labels
export const SyncRatingLabelSchema = z.enum(['excellent', 'good', 'fair', 'poor', 'broken']);
export type SyncRatingLabel = z.infer<typeof SyncRatingLabelSchema>;

// Sync error types
export const SyncErrorTypeSchema = z.enum([
  'global_offset', // Entire video shifted
  'progressive_drift', // Drift increases over time
  'sporadic_errors', // Random misalignments
  'section_mismatch', // Specific section out of sync
  'low_match_ratio', // Not enough words matched
]);
export type SyncErrorType = z.infer<typeof SyncErrorTypeSchema>;

export const SyncErrorSchema = z.object({
  type: SyncErrorTypeSchema,
  severity: z.enum(['warning', 'error', 'critical']),
  message: z.string(),
  timeRange: z
    .object({
      start: z.number(),
      end: z.number(),
    })
    .optional(),
  affectedWords: z.array(z.string()).optional(),
  suggestedFix: z.string().optional(),
});
export type SyncError = z.infer<typeof SyncErrorSchema>;

// OCR Frame result
export const OCRFrameSchema = z.object({
  frameNumber: z.number(),
  timestamp: z.number(), // Seconds
  text: z.string(),
  confidence: z.number(),
});
export type OCRFrame = z.infer<typeof OCRFrameSchema>;

// Full sync rating output
export const SyncRatingOutputSchema = z.object({
  schemaVersion: z.string().default(SYNC_SCHEMA_VERSION),
  videoPath: z.string(),

  // Overall rating
  rating: z.number().int().min(0).max(100),
  ratingLabel: SyncRatingLabelSchema,
  passed: z.boolean(),

  // Detailed metrics
  metrics: SyncMetricsSchema,

  // Individual word comparisons
  wordMatches: z.array(WordMatchSchema),

  // Drift timeline for visualization
  driftTimeline: z.array(
    z.object({
      timestamp: z.number(),
      driftMs: z.number(),
    })
  ),

  // Errors detected
  errors: z.array(SyncErrorSchema),

  // Analysis metadata
  analysis: z.object({
    ocrEngine: z.string(),
    asrEngine: z.string(),
    framesAnalyzed: z.number(),
    analysisTimeMs: z.number(),
  }),

  createdAt: z.string().datetime(),
});
export type SyncRatingOutput = z.infer<typeof SyncRatingOutputSchema>;

// Rating thresholds configuration
export const SyncThresholdsSchema = z.object({
  minRating: z.number().default(60),
  maxMeanDriftMs: z.number().default(180),
  maxMaxDriftMs: z.number().default(500),
  minMatchRatio: z.number().default(0.7),
});
export type SyncThresholds = z.infer<typeof SyncThresholdsSchema>;

// Sync rating options
export const SyncRatingOptionsSchema = z.object({
  fps: z.number().default(2), // Frames per second to sample
  ocrEngine: z.enum(['tesseract', 'easyocr']).default('tesseract'),
  asrModel: z.enum(['tiny', 'base', 'small', 'medium']).default('base'),
  captionRegion: z
    .object({
      yRatio: z.number().default(0.75), // Start at 75% down
      heightRatio: z.number().default(0.25), // 25% of frame height
    })
    .default({}),
  thresholds: SyncThresholdsSchema.default({}),
});
export type SyncRatingOptions = z.infer<typeof SyncRatingOptionsSchema>;
