import { z } from 'zod';

export const VALIDATE_SCHEMA_VERSION = '1.0.0';

export const GateSeveritySchema = z.enum(['error', 'warning', 'info']);
export type GateSeverity = z.infer<typeof GateSeveritySchema>;

export const GateBaseSchema = z.object({
  gateId: z.string(),
  passed: z.boolean(),
  severity: GateSeveritySchema.default('error'),
  fix: z.string(),
  message: z.string(),
});

export const ResolutionGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('resolution'),
  details: z.object({
    expectedWidth: z.number().int().positive(),
    expectedHeight: z.number().int().positive(),
    actualWidth: z.number().int().positive(),
    actualHeight: z.number().int().positive(),
  }),
});

export type ResolutionGateResult = z.infer<typeof ResolutionGateResultSchema>;

export const DurationGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('duration'),
  details: z.object({
    minSeconds: z.number().positive(),
    maxSeconds: z.number().positive(),
    actualSeconds: z.number().nonnegative(),
  }),
});

export type DurationGateResult = z.infer<typeof DurationGateResultSchema>;

export const FormatGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('format'),
  details: z.object({
    expected: z.object({
      container: z.string(),
      videoCodec: z.string(),
      audioCodec: z.string(),
    }),
    actual: z.object({
      container: z.string(),
      videoCodec: z.string(),
      audioCodec: z.string(),
    }),
  }),
});

export type FormatGateResult = z.infer<typeof FormatGateResultSchema>;

export const VisualQualityGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('visual-quality'),
  details: z.object({
    brisqueMax: z.number().positive(),
    mean: z.number().nonnegative(),
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    framesAnalyzed: z.number().int().positive(),
  }),
});

export type VisualQualityGateResult = z.infer<typeof VisualQualityGateResultSchema>;

export const GateResultSchema = z.discriminatedUnion('gateId', [
  ResolutionGateResultSchema,
  DurationGateResultSchema,
  FormatGateResultSchema,
  VisualQualityGateResultSchema,
]);

export type GateResult = z.infer<typeof GateResultSchema>;

export const ValidateSummarySchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  durationSeconds: z.number().nonnegative(),
  container: z.string(),
  videoCodec: z.string(),
  audioCodec: z.string(),
});

export type ValidateSummary = z.infer<typeof ValidateSummarySchema>;

export const ValidateReportSchema = z.object({
  schemaVersion: z.string().default(VALIDATE_SCHEMA_VERSION),
  videoPath: z.string(),
  profile: z.string(),
  passed: z.boolean(),
  summary: ValidateSummarySchema,
  gates: z.array(GateResultSchema),
  createdAt: z.string(),
  runtimeMs: z.number().int().nonnegative(),
});

export type ValidateReport = z.infer<typeof ValidateReportSchema>;
