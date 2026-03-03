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
    niqe: z
      .object({
        mean: z.number().nonnegative(),
        min: z.number().nonnegative(),
        max: z.number().nonnegative(),
      })
      .optional(),
    cambi: z
      .object({
        mean: z.number().nonnegative(),
        max: z.number().nonnegative(),
      })
      .optional(),
  }),
});

export type VisualQualityGateResult = z.infer<typeof VisualQualityGateResultSchema>;

export const CadenceGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('cadence'),
  details: z.object({
    cutCount: z.number().int().nonnegative(),
    medianCutIntervalSeconds: z.number().nonnegative(),
    maxMedianCutIntervalSeconds: z.number().positive(),
  }),
});

export type CadenceGateResult = z.infer<typeof CadenceGateResultSchema>;

export const SafetyGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('safety'),
  details: z.object({
    visualPassed: z.boolean(),
    textPassed: z.boolean(),
    visualFlags: z.array(z.string()),
    textFlags: z.array(z.string()),
    method: z.string(),
  }),
});

export type SafetyGateResult = z.infer<typeof SafetyGateResultSchema>;

export const AudioSignalGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('audio-signal'),
  details: z.object({
    loudnessLUFS: z.number(),
    truePeakDBFS: z.number(),
    loudnessRange: z.number().nonnegative(),
    clippingRatio: z.number().min(0).max(1),
    snrDB: z.number(),
    loudnessMinLUFS: z.number(),
    loudnessMaxLUFS: z.number(),
    maxClippingRatio: z.number().min(0).max(1),
    truePeakMaxDBFS: z.number(),
  }),
});

export type AudioSignalGateResult = z.infer<typeof AudioSignalGateResultSchema>;

export const TemporalQualityGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('temporal-quality'),
  details: z.object({
    flickerScore: z.number().min(0).max(1),
    flickerVariance: z.number().nonnegative(),
    duplicateFrameRatio: z.number().min(0).max(1),
    framesAnalyzed: z.number().int().positive(),
    flickerMin: z.number().min(0).max(1),
    maxDuplicateFrameRatio: z.number().min(0).max(1),
  }),
});

export type TemporalQualityGateResult = z.infer<typeof TemporalQualityGateResultSchema>;

export const FreezeGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('freeze'),
  details: z.object({
    freezeRatio: z.number().min(0).max(1),
    blackRatio: z.number().min(0).max(1),
    freezeEvents: z.number().int().nonnegative(),
    blackFrames: z.number().int().nonnegative(),
    totalFrames: z.number().int().positive(),
    maxFreezeRatio: z.number().min(0).max(1),
    maxBlackRatio: z.number().min(0).max(1),
  }),
});

export type FreezeGateResult = z.infer<typeof FreezeGateResultSchema>;

export const FlowConsistencyGateResultSchema = GateBaseSchema.extend({
  gateId: z.literal('flow-consistency'),
  details: z.object({
    meanWarpError: z.number().nonnegative(),
    maxWarpError: z.number().nonnegative(),
    framesAnalyzed: z.number().int().positive(),
    maxMeanWarpError: z.number().positive(),
  }),
});

export type FlowConsistencyGateResult = z.infer<typeof FlowConsistencyGateResultSchema>;

export const GateResultSchema = z.discriminatedUnion('gateId', [
  ResolutionGateResultSchema,
  DurationGateResultSchema,
  FormatGateResultSchema,
  VisualQualityGateResultSchema,
  CadenceGateResultSchema,
  TemporalQualityGateResultSchema,
  AudioSignalGateResultSchema,
  SafetyGateResultSchema,
  FreezeGateResultSchema,
  FlowConsistencyGateResultSchema,
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
