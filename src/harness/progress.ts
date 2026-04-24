import { appendFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { z } from 'zod';

export const ProgressEventSchema = z
  .object({
    schemaVersion: z.string().default('1.0.0'),
    tool: z.string().min(1),
    stage: z.string().min(1),
    status: z.enum(['started', 'progress', 'completed', 'failed']),
    progress: z.number().min(0).max(1),
    message: z.string().optional(),
    at: z.string().min(1),
  })
  .strict();

export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

export interface ProgressEmitter {
  emit(event: Omit<ProgressEvent, 'schemaVersion' | 'at'> & { at?: string }): Promise<void>;
}

export function createJsonlProgressEmitter(options: {
  progressPath?: string | null;
  stderr?: boolean;
}): ProgressEmitter {
  return {
    async emit(event) {
      const parsed = ProgressEventSchema.parse({
        schemaVersion: '1.0.0',
        at: event.at ?? new Date().toISOString(),
        ...event,
      });
      const line = `${JSON.stringify(parsed)}\n`;
      if (options.stderr || process.env.CM_PROGRESS === 'jsonl') {
        process.stderr.write(line);
      }
      if (options.progressPath) {
        const outputPath = resolve(options.progressPath);
        await mkdir(dirname(outputPath), { recursive: true });
        await appendFile(outputPath, line, 'utf8');
      }
    },
  };
}
