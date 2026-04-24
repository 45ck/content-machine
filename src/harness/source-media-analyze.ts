import { resolve } from 'node:path';
import { z } from 'zod';
import { SourceMediaAnalysisOutputSchema } from '../domain';
import { analyzeSourceMedia } from '../highlights';
import { writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import { createJsonlProgressEmitter } from './progress';

export const SourceMediaAnalyzeRequestSchema = z
  .object({
    mediaPath: z.string().min(1),
    outputPath: z
      .string()
      .min(1)
      .default('output/content-machine/highlights/source-media-analysis.v1.json'),
    ffprobePath: z.string().min(1).optional(),
    progressPath: z.string().min(1).optional(),
  })
  .strict();

export type SourceMediaAnalyzeRequest = z.input<typeof SourceMediaAnalyzeRequestSchema>;

export async function runSourceMediaAnalyze(request: SourceMediaAnalyzeRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    durationSeconds: number | null;
    orientation: string;
    hasAudio: boolean;
    hasVideo: boolean;
  }>
> {
  const normalized = SourceMediaAnalyzeRequestSchema.parse(request);
  const mediaPath = resolve(normalized.mediaPath);
  const outputPath = resolve(normalized.outputPath);
  const progress = createJsonlProgressEmitter({ progressPath: normalized.progressPath });

  await progress.emit({
    tool: 'content-machine/source-media-analyze',
    stage: 'probe-media',
    status: 'started',
    progress: 0.25,
  });
  const analysis = SourceMediaAnalysisOutputSchema.parse(
    await analyzeSourceMedia(mediaPath, { ffprobePath: normalized.ffprobePath })
  );

  await writeJsonArtifact(outputPath, analysis);
  await progress.emit({
    tool: 'content-machine/source-media-analyze',
    stage: 'write-output',
    status: 'completed',
    progress: 1,
    message: outputPath,
  });

  return {
    result: {
      outputPath,
      durationSeconds: analysis.probe.durationSeconds,
      orientation: analysis.probe.orientation,
      hasAudio: analysis.probe.hasAudio,
      hasVideo: analysis.probe.hasVideo,
    },
    artifacts: [artifactFile(outputPath, 'Source media analysis artifact')],
    warnings: analysis.warnings,
  };
}
