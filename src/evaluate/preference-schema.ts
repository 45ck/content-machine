import { z } from 'zod';

export const PreferenceRecordSchema = z.object({
  videoA: z.string(),
  videoB: z.string(),
  winner: z.enum(['A', 'B', 'tie']),
  dimensions: z.array(z.string()),
  annotator: z.string(),
  timestamp: z.string(),
});

export type PreferenceRecord = z.infer<typeof PreferenceRecordSchema>;
