/**
 * Sync Rating Schemas
 *
 * Zod schemas for the video sync rating system (`cm rate`).
 * Compares OCR-extracted captions with ASR-extracted audio timestamps
 * to measure synchronization quality.
 */
import { z } from 'zod';

export const SYNC_SCHEMA_VERSION = '1.0.0';

export const OCRBoundingBoxSchema = z.object({
  x0: z.number(),
  y0: z.number(),
  x1: z.number(),
  y1: z.number(),
});
export type OCRBoundingBox = z.infer<typeof OCRBoundingBoxSchema>;

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
  'caption_quality_overall', // Aggregated caption quality score failed
  'caption_flicker', // Caption disappears briefly
  'caption_safe_margin', // Captions too close to edges
  'caption_density', // Too many lines / chars per line
  'caption_punctuation', // Missing punctuation / repeated punctuation
  'caption_capitalization', // Inconsistent capitalization style
  'caption_low_confidence', // OCR confidence indicates poor legibility
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
  bbox: OCRBoundingBoxSchema.optional(),
});
export type OCRFrame = z.infer<typeof OCRFrameSchema>;

export const OcrCaptionSegmentSchema = z.object({
  text: z.string(),
  normalizedText: z.string(),
  startSeconds: z.number(),
  endSeconds: z.number(),
  durationSeconds: z.number(),
  wordCount: z.number(),
  lineCount: z.number(),
  maxCharsPerLine: z.number(),
  meanConfidence: z.number(),
  bbox: OCRBoundingBoxSchema.optional(),
  center: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  bboxHeightPx: z.number().optional(),
  bboxAreaPx: z.number().optional(),
});
export type OcrCaptionSegment = z.infer<typeof OcrCaptionSegmentSchema>;

export const BurnedInCaptionQualityReportSchema = z.object({
  thresholds: z.object({
    safeMarginRatio: z.number(),
    idealReadingSpeedWps: z.object({ min: z.number(), max: z.number() }),
    absoluteReadingSpeedWps: z.object({ min: z.number(), max: z.number() }),
    recommendedCaptionDurationSeconds: z.object({ min: z.number(), max: z.number() }),
    flashDurationSecondsMax: z.number(),
    density: z.object({ maxLines: z.number(), maxCharsPerLine: z.number() }),
    capitalization: z.object({ allCapsRatioMin: z.number() }),
    alignment: z.object({
      idealCenterXRatio: z.number(),
      maxMeanAbsCenterDxRatio: z.number(),
    }),
    placement: z.object({
      maxStddevCenterXRatio: z.number(),
      maxStddevCenterYRatio: z.number(),
    }),
    jitter: z.object({
      maxMeanCenterDeltaPx: z.number(),
      maxP95CenterDeltaPx: z.number(),
    }),
    style: z.object({
      maxBboxHeightCv: z.number(),
      maxBboxAreaCv: z.number(),
    }),
    pass: z.object({
      minOverall: z.number(),
      minCoverageRatio: z.number(),
      maxFlickerEvents: z.number(),
    }),
  }),
  weights: z.object({
    rhythm: z.number(),
    displayTime: z.number(),
    coverage: z.number(),
    safeArea: z.number(),
    density: z.number(),
    punctuation: z.number(),
    capitalization: z.number(),
    alignment: z.number(),
    placement: z.number(),
    jitter: z.number(),
    style: z.number(),
    redundancy: z.number(),
    segmentation: z.number(),
    ocrConfidence: z.number(),
  }),
  overall: z.object({
    score: z.number(),
    passed: z.boolean(),
  }),
  segments: z.array(OcrCaptionSegmentSchema),
  rhythm: z.object({
    meanWps: z.number(),
    stddevWps: z.number(),
    outOfIdealRangeCount: z.number(),
    outOfAbsoluteRangeCount: z.number(),
    score: z.number(),
  }),
  displayTime: z.object({
    minDurationSeconds: z.number(),
    maxDurationSeconds: z.number(),
    flashSegmentCount: z.number(),
    outOfRecommendedRangeCount: z.number(),
    score: z.number(),
  }),
  coverage: z.object({
    captionedSeconds: z.number(),
    coverageRatio: z.number(),
    score: z.number(),
  }),
  density: z.object({
    maxLines: z.number(),
    maxCharsPerLine: z.number(),
    lineOverflowCount: z.number(),
    charOverflowCount: z.number(),
    score: z.number(),
  }),
  punctuation: z.object({
    missingTerminalPunctuationCount: z.number(),
    repeatedPunctuationCount: z.number(),
    score: z.number(),
  }),
  capitalization: z.object({
    style: z.enum(['all_caps', 'sentence_case', 'lowercase', 'mixed']),
    inconsistentStyleCount: z.number(),
    score: z.number(),
  }),
  ocrConfidence: z.object({
    mean: z.number(),
    min: z.number(),
    stddev: z.number(),
    score: z.number(),
  }),
  safeArea: z.object({
    violationCount: z.number(),
    minMarginRatio: z.number(),
    score: z.number(),
  }),
  flicker: z.object({
    flickerEvents: z.number(),
    score: z.number(),
  }),
  alignment: z.object({
    meanAbsCenterDxRatio: z.number(),
    maxAbsCenterDxRatio: z.number(),
    score: z.number(),
  }),
  placement: z.object({
    stddevCenterXRatio: z.number(),
    stddevCenterYRatio: z.number(),
    score: z.number(),
  }),
  jitter: z.object({
    meanCenterDeltaPx: z.number(),
    p95CenterDeltaPx: z.number(),
    score: z.number(),
  }),
  style: z.object({
    bboxHeightCv: z.number(),
    bboxAreaCv: z.number(),
    score: z.number(),
  }),
  redundancy: z.object({
    reappearanceEvents: z.number(),
    adjacentOverlapEvents: z.number(),
    score: z.number(),
  }),
  segmentation: z.object({
    danglingConjunctionCount: z.number(),
    midSentenceBreakCount: z.number(),
    score: z.number(),
  }),
});
export type BurnedInCaptionQualityReport = z.infer<typeof BurnedInCaptionQualityReportSchema>;

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
    captionFrameSize: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional(),
    videoFrameSize: z
      .object({
        width: z.number(),
        height: z.number(),
      })
      .optional(),
    captionCropOffsetY: z.number().optional(),
  }),

  captionQuality: BurnedInCaptionQualityReportSchema.optional(),

  createdAt: z.string().datetime(),
});
export type SyncRatingOutput = z.infer<typeof SyncRatingOutputSchema>;

export const CaptionQualityRatingOptionsSchema = z.object({
  fps: z.number().default(2),
  ocrEngine: z.enum(['tesseract', 'easyocr']).default('tesseract'),
  captionRegion: z
    .object({
      // Default crop tuned for our templates (captures multi-line captions above the bottom edge).
      yRatio: z.number().default(0.65),
      heightRatio: z.number().default(0.35),
    })
    .default({}),
});
export type CaptionQualityRatingOptions = z.infer<typeof CaptionQualityRatingOptionsSchema>;

export const CaptionQualityRatingOutputSchema = z.object({
  schemaVersion: z.literal(SYNC_SCHEMA_VERSION),
  videoPath: z.string(),
  captionQuality: BurnedInCaptionQualityReportSchema,
  errors: z.array(SyncErrorSchema).default([]),
  analysis: z.object({
    ocrEngine: z.enum(['tesseract', 'easyocr']),
    fps: z.number(),
    framesAnalyzed: z.number(),
    analysisTimeMs: z.number(),
    captionFrameSize: z.object({
      width: z.number(),
      height: z.number(),
    }),
    videoFrameSize: z.object({
      width: z.number(),
      height: z.number(),
    }),
    captionCropOffsetY: z.number(),
    captionRegion: z.object({
      yRatio: z.number(),
      heightRatio: z.number(),
    }),
  }),
  createdAt: z.string().datetime(),
});
export type CaptionQualityRatingOutput = z.infer<typeof CaptionQualityRatingOutputSchema>;

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
      // Default crop tuned for our templates (captures multi-line captions above the bottom edge).
      yRatio: z.number().default(0.65), // Start at 65% down
      heightRatio: z.number().default(0.35), // 35% of frame height
    })
    .default({}),
  thresholds: SyncThresholdsSchema.default({}),
});
export type SyncRatingOptions = z.infer<typeof SyncRatingOptionsSchema>;
