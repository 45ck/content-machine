import { z } from 'zod';

export const LAB_RUN_SCHEMA_VERSION = 1;

export const LabFileFingerprintSchema = z
  .object({
    path: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    mtimeMs: z.number().nonnegative(),
  })
  .strict();

export type LabFileFingerprint = z.infer<typeof LabFileFingerprintSchema>;

export const LabRunFingerprintSchema = z
  .object({
    video: LabFileFingerprintSchema.optional(),
    script: LabFileFingerprintSchema.optional(),
  })
  .strict();

export type LabRunFingerprint = z.infer<typeof LabRunFingerprintSchema>;

export const LabAutoMetricsSummarySchema = z
  .object({
    syncRating: z.number().int().min(0).max(100).nullable(),
    syncLabel: z.string().min(1).nullable().optional(),
    meanDriftMs: z.number().nullable().optional(),
    maxDriftMs: z.number().nullable().optional(),
    captionOverall: z.number().int().min(0).max(100).nullable(),
    captionCoverageRatio: z.number().nullable().optional(),
    ocrConfidenceMean: z.number().nullable().optional(),
    proxyScoreOverall: z.number().int().min(0).max(100).nullable(),
  })
  .strict();

export type LabAutoMetricsSummary = z.infer<typeof LabAutoMetricsSummarySchema>;

export const LabRunSchema = z
  .object({
    schemaVersion: z.number().int().min(1).default(LAB_RUN_SCHEMA_VERSION),
    runId: z.string().min(1),
    sessionId: z.string().min(1),
    createdAt: z.string().datetime(),
    topic: z.string().min(1).optional(),
    artifactsDir: z.string().min(1),
    artifactsDirRealpath: z.string().min(1),
    fingerprint: LabRunFingerprintSchema.optional(),
    supersedesRunId: z.string().min(1).optional(),
    videoPath: z.string().min(1).optional(),
    reports: z
      .object({
        syncReportPath: z.string().min(1).optional(),
        captionReportPath: z.string().min(1).optional(),
        scorePath: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
    autoMetricsSummary: LabAutoMetricsSummarySchema.optional(),
  })
  .strict();

export type LabRun = z.infer<typeof LabRunSchema>;
