import { z } from 'zod';

export const LAB_IDEMPOTENCY_SCHEMA_VERSION = 1;

export const LabIdempotencyRecordSchema = z
  .object({
    schemaVersion: z.number().int().min(1).default(LAB_IDEMPOTENCY_SCHEMA_VERSION),
    requestId: z.string().min(1),
    type: z.enum(['feedback', 'experiment_submit']),
    // Snapshot of the response payload so retries can be answered without reprocessing.
    response: z.record(z.unknown()),
    createdAt: z.string().datetime(),
  })
  .strict();

export type LabIdempotencyRecord = z.infer<typeof LabIdempotencyRecordSchema>;
