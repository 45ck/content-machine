/**
 * Score Schemas
 *
 * Zod schemas for the optional scoring stage (`cm score`).
 * This is a proxy scoring system (quality/risk checks), not a virality predictor.
 */
import { z } from 'zod';

export const SCORE_SCHEMA_VERSION = '1.0.0';

export const ScoreSeveritySchema = z.enum(['error', 'warning', 'info']);
export type ScoreSeverity = z.infer<typeof ScoreSeveritySchema>;

export const ScoreCheckSchema = z.object({
  checkId: z.string(),
  passed: z.boolean(),
  severity: ScoreSeveritySchema.default('warning'),
  message: z.string(),
  fix: z.string().optional(),
  details: z.record(z.unknown()).optional(),
});
export type ScoreCheck = z.infer<typeof ScoreCheckSchema>;

export const ScoreOutputSchema = z.object({
  schemaVersion: z.string().default(SCORE_SCHEMA_VERSION),
  input: z.object({
    scriptPath: z.string(),
    packagePath: z.string().optional(),
  }),
  passed: z.boolean(),
  overall: z.number().min(0).max(1),
  dimensions: z.record(z.number().min(0).max(1)),
  checks: z.array(ScoreCheckSchema),
  createdAt: z.string().datetime(),
});

export type ScoreOutput = z.infer<typeof ScoreOutputSchema>;

