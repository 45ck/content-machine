#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { TimestampsOutputSchema } from '../../../../src/domain/index.ts';
import { readJsonArtifact, writeJsonArtifact } from '../../../../src/harness/artifacts.ts';
import { createCaptionExport, formatAssCaptions, formatSrtCaptions } from '../../../../src/render/captions/index.ts';

const RequestSchema = z
  .object({
    timestampsPath: z.string().min(1),
    captionExportPath: z.string().min(1),
    captionSrtPath: z.string().min(1),
    captionAssPath: z.string().min(1),
    mode: z.enum(['page', 'chunk']).default('chunk')
  })
  .strict();

async function main(): Promise<void> {
  const requestPath = process.argv[2];
  if (!requestPath) {
    throw new Error('Usage: node --import tsx tools/export-captions.ts <request.json>');
  }

  const request = await readJsonArtifact(requestPath, RequestSchema, 'caption export request');
  const timestamps = await readJsonArtifact(
    request.timestampsPath,
    TimestampsOutputSchema,
    'timestamps artifact'
  );
  const captionExport = createCaptionExport(timestamps.allWords, { mode: request.mode });
  const captionExportPath = resolve(request.captionExportPath);
  const captionSrtPath = resolve(request.captionSrtPath);
  const captionAssPath = resolve(request.captionAssPath);

  await Promise.all([
    writeJsonArtifact(captionExportPath, captionExport),
    mkdir(dirname(captionSrtPath), { recursive: true }),
    mkdir(dirname(captionAssPath), { recursive: true }),
  ]);

  await Promise.all([
    writeFile(captionSrtPath, formatSrtCaptions(captionExport.segments), 'utf8'),
    writeFile(captionAssPath, formatAssCaptions(captionExport.segments), 'utf8'),
  ]);

  process.stdout.write(
    JSON.stringify(
      {
        ok: true,
        captionExportPath,
        captionSrtPath,
        captionAssPath,
        captionQualityPassed: captionExport.quality.passed,
        captionQualityScore: captionExport.quality.score,
        segmentCount: captionExport.segments.length,
      },
      null,
      2
    )
  );
}

await main();
