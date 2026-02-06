import { z } from 'zod';

export const LAB_EXPERIMENT_SCHEMA_VERSION = 1;

export const LabQuestionSchema = z
  .object({
    id: z.string().min(1),
    prompt: z.string().min(1),
    type: z.enum(['yes_no_unsure', 'text']).default('yes_no_unsure'),
  })
  .strict();

export type LabQuestion = z.infer<typeof LabQuestionSchema>;

export const LabExperimentVariantSchema = z
  .object({
    variantId: z.string().min(1),
    label: z.string().min(1),
    runId: z.string().min(1),
  })
  .strict();

export type LabExperimentVariant = z.infer<typeof LabExperimentVariantSchema>;

export const LabExperimentWinnerSchema = z
  .object({
    variantId: z.string().min(1),
    reason: z.string().min(1).optional(),
  })
  .strict();

export type LabExperimentWinner = z.infer<typeof LabExperimentWinnerSchema>;

export const LabExperimentStatusSchema = z
  .enum(['queued', 'running', 'done', 'failed'])
  .default('queued');
export type LabExperimentStatus = z.infer<typeof LabExperimentStatusSchema>;

export const LabExperimentSchema = z
  .object({
    schemaVersion: z.number().int().min(1).default(LAB_EXPERIMENT_SCHEMA_VERSION),
    experimentId: z.string().min(1),
    sessionId: z.string().min(1),
    createdAt: z.string().datetime(),
    name: z.string().min(1),
    hypothesis: z.string().min(1).optional(),
    topic: z.string().min(1).optional(),
    baselineRunId: z.string().min(1),
    variants: z.array(LabExperimentVariantSchema),
    status: LabExperimentStatusSchema,
    winner: LabExperimentWinnerSchema.optional(),
    questions: z.array(LabQuestionSchema).optional(),
    answers: z.record(z.unknown()).optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .strict();

export type LabExperiment = z.infer<typeof LabExperimentSchema>;
