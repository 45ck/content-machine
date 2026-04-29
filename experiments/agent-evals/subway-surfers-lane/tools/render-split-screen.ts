#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import {
  TimestampsOutputSchema,
  VisualsOutputSchema,
  RenderOutputSchema,
} from '../../../../src/domain/index.ts';
import { readJsonArtifact, writeJsonArtifact } from '../../../../src/harness/artifacts.ts';
import { createCaptionExport, formatAssCaptions, formatSrtCaptions } from '../../../../src/render/captions/index.ts';
import { renderVideo } from '../../../../src/render/service.ts';

const RequestSchema = z
  .object({
    visualsPath: z.string().min(1),
    timestampsPath: z.string().min(1),
    audioPath: z.string().min(1),
    outputPath: z.string().min(1),
    outputMetadataPath: z.string().min(1),
    captionExportPath: z.string().min(1),
    captionSrtPath: z.string().min(1),
    captionAssPath: z.string().min(1),
    orientation: z.enum(['portrait', 'landscape', 'square']).default('portrait'),
    fps: z.number().int().positive().default(30),
    downloadAssets: z.boolean().default(true),
    captionPreset: z.string().min(1).default('capcut'),
    compositionId: z.string().min(1).default('SplitScreenGameplay'),
    splitScreenRatio: z.number().min(0.3).max(0.7).default(0.55),
    gameplayPosition: z.enum(['top', 'bottom', 'full']).default('top'),
    contentPosition: z.enum(['top', 'bottom', 'full']).default('bottom')
  })
  .strict();

async function main(): Promise<void> {
  const requestPath = process.argv[2];
  if (!requestPath) {
    throw new Error('Usage: node --import tsx tools/render-split-screen.ts <request.json>');
  }

  const request = await readJsonArtifact(requestPath, RequestSchema, 'split-screen render request');
  const visuals = await readJsonArtifact(request.visualsPath, VisualsOutputSchema, 'visuals artifact');
  const timestamps = await readJsonArtifact(
    request.timestampsPath,
    TimestampsOutputSchema,
    'timestamps artifact'
  );

  const outputPath = resolve(request.outputPath);
  const outputMetadataPath = resolve(request.outputMetadataPath);
  const captionExportPath = resolve(request.captionExportPath);
  const captionSrtPath = resolve(request.captionSrtPath);
  const captionAssPath = resolve(request.captionAssPath);

  const renderOutput = RenderOutputSchema.parse(
    await renderVideo({
      visuals,
      timestamps,
      audioPath: resolve(request.audioPath),
      outputPath,
      orientation: request.orientation,
      fps: request.fps,
      downloadAssets: request.downloadAssets,
      captionPreset: request.captionPreset as never,
      compositionId: request.compositionId,
      splitScreenRatio: request.splitScreenRatio,
      gameplayPosition: request.gameplayPosition,
      contentPosition: request.contentPosition,
    })
  );

  const captionExport = createCaptionExport(timestamps.allWords, { mode: 'chunk' });

  await Promise.all([
    writeJsonArtifact(outputMetadataPath, renderOutput),
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
        outputPath: renderOutput.outputPath,
        outputMetadataPath,
        captionExportPath,
        captionSrtPath,
        captionAssPath,
        duration: renderOutput.duration,
        width: renderOutput.width,
        height: renderOutput.height,
        fps: renderOutput.fps,
        fileSize: renderOutput.fileSize,
        captionQualityPassed: captionExport.quality.passed,
        captionQualityScore: captionExport.quality.score,
      },
      null,
      2
    )
  );
}

await main();
