import { z } from 'zod';

export const LabTaskSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('compare'), experimentId: z.string().min(1) }).strict(),
  z.object({ type: z.literal('review'), runId: z.string().min(1) }).strict(),
]);

export type LabTask = z.infer<typeof LabTaskSchema>;
