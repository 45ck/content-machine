import { z } from 'zod';
import { FeedbackEntrySchema } from '../../feedback/schema';
import { LabExperimentSchema } from './experiment';
import { LabRunSchema } from './run';

export const LAB_EXPORT_SCHEMA_VERSION = 1;

export const LabExportSchema = z
  .object({
    schemaVersion: z.number().int().min(1).default(LAB_EXPORT_SCHEMA_VERSION),
    exportedAt: z.string().datetime(),
    sessionId: z.string().min(1),
    runs: z.array(LabRunSchema),
    experiments: z.array(LabExperimentSchema),
    feedback: z.array(FeedbackEntrySchema),
  })
  .strict();

export type LabExport = z.infer<typeof LabExportSchema>;
