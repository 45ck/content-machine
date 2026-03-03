import { z } from 'zod';

export const FEEDBACK_SCHEMA_VERSION = 1;

export const FeedbackRatingsSchema = z
  .object({
    overall: z.number().int().min(0).max(100).optional(),
    hook: z.number().int().min(0).max(100).optional(),
    pacing: z.number().int().min(0).max(100).optional(),
    script: z.number().int().min(0).max(100).optional(),
    visuals: z.number().int().min(0).max(100).optional(),
    motion: z.number().int().min(0).max(100).optional(),
    captions: z.number().int().min(0).max(100).optional(),
    sync: z.number().int().min(0).max(100).optional(),
  })
  .strict();

export type FeedbackRatings = z.infer<typeof FeedbackRatingsSchema>;

export const FeedbackEntrySchema = z
  .object({
    schemaVersion: z.number().int().min(1).default(FEEDBACK_SCHEMA_VERSION),
    id: z.string().min(1),
    createdAt: z.string().datetime(),
    // Optional linkage fields used by Experiment Lab (agent-in-the-loop).
    sessionId: z.string().min(1).optional(),
    runId: z.string().min(1).optional(),
    experimentId: z.string().min(1).optional(),
    variantId: z.string().min(1).optional(),
    topic: z.string().min(1).optional(),
    videoPath: z.string().min(1).optional(),
    artifactsDir: z.string().min(1).optional(),
    ratings: FeedbackRatingsSchema.optional(),
    notes: z.string().min(1).optional(),
    tags: z.array(z.string().min(1)).optional(),
    // Snapshot of normalized auto-metrics at time of rating (optional).
    autoMetricsSnapshot: z
      .object({
        syncRating: z.number().int().min(0).max(100).nullable().optional(),
        captionOverall: z.number().int().min(0).max(100).nullable().optional(),
        proxyScoreOverall: z.number().int().min(0).max(100).nullable().optional(),
        meanDriftMs: z.number().nullable().optional(),
        maxDriftMs: z.number().nullable().optional(),
        captionCoverageRatio: z.number().nullable().optional(),
        ocrConfidenceMean: z.number().nullable().optional(),
      })
      .strict()
      .optional(),
    // Targeted experiment questions and other structured metadata.
    answers: z.record(z.unknown()).optional(),
    // Extra data captured from artifacts, if present.
    reports: z
      .object({
        syncReportPath: z.string().min(1).optional(),
        captionReportPath: z.string().min(1).optional(),
        scorePath: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    extra: z.record(z.unknown()).optional(),
  })
  .strict();

export type FeedbackEntry = z.infer<typeof FeedbackEntrySchema>;

export const FeedbackExportSchema = z
  .object({
    schemaVersion: z.number().int().min(1).default(FEEDBACK_SCHEMA_VERSION),
    exportedAt: z.string().datetime(),
    count: z.number().int().nonnegative(),
    entries: z.array(FeedbackEntrySchema),
  })
  .strict();

export type FeedbackExport = z.infer<typeof FeedbackExportSchema>;
