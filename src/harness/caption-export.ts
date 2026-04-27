import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import { TimestampsOutputSchema } from '../domain';
import {
  createCaptionExport,
  formatAssCaptions,
  formatSrtCaptions,
  getCaptionPreset,
} from '../render/captions';
import { CAPTION_STYLE_PRESETS } from '../render/captions/presets';
import type { AssCaptionStyle } from '../render/captions/export';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';

const captionPresetNames = Object.keys(CAPTION_STYLE_PRESETS);

if (captionPresetNames.length === 0) {
  throw new Error('Caption preset registry is empty');
}

const CaptionPresetEnum = z.enum(
  captionPresetNames as [
    keyof typeof CAPTION_STYLE_PRESETS,
    ...Array<keyof typeof CAPTION_STYLE_PRESETS>,
  ]
);

const AssCaptionStyleSchema = z
  .object({
    fontName: z.string().min(1).optional(),
    fontSize: z.number().int().positive().optional(),
    primaryColor: z.string().min(1).optional(),
    secondaryColor: z.string().min(1).optional(),
    outlineColor: z.string().min(1).optional(),
    backColor: z.string().min(1).optional(),
    alignment: z.number().int().min(1).max(9).optional(),
    marginL: z.number().int().nonnegative().optional(),
    marginR: z.number().int().nonnegative().optional(),
    marginV: z.number().int().nonnegative().optional(),
    karaoke: z.boolean().optional(),
    positionX: z.number().int().positive().optional(),
    positionY: z.number().int().positive().optional(),
  })
  .strict();

export const CaptionExportRequestSchema = z
  .object({
    timestampsPath: z.string().min(1),
    outputDir: z.string().min(1).optional(),
    captionExportPath: z.string().min(1).optional(),
    captionSrtPath: z.string().min(1).optional(),
    captionAssPath: z.string().min(1).optional(),
    captionPreset: CaptionPresetEnum.optional(),
    captionMode: z.enum(['page', 'single', 'buildup', 'chunk']).optional(),
    captionTimingOffsetMs: z.number().int().min(-2000).max(2000).optional(),
    captionAssStyle: AssCaptionStyleSchema.optional(),
  })
  .strict();

export type CaptionExportRequest = z.input<typeof CaptionExportRequestSchema>;

/** Export caption sidecars from word timestamps without running the full video render stack. */
export async function runCaptionExport(request: CaptionExportRequest): Promise<
  HarnessToolResult<{
    captionExportPath: string;
    captionSrtPath: string;
    captionAssPath: string;
    captionQualityPassed: boolean;
    captionQualityScore: number;
    segmentCount: number;
  }>
> {
  const normalized = CaptionExportRequestSchema.parse(request);
  const timestamps = await readJsonArtifact(
    normalized.timestampsPath,
    TimestampsOutputSchema,
    'timestamps artifact'
  );

  const baseDir = resolve(
    normalized.outputDir ??
      dirname(resolve(normalized.captionExportPath ?? normalized.timestampsPath))
  );
  const captionExportPath = resolve(
    normalized.captionExportPath ?? join(baseDir, 'captions.remotion.json')
  );
  const captionSrtPath = resolve(normalized.captionSrtPath ?? join(baseDir, 'captions.srt'));
  const captionAssPath = resolve(normalized.captionAssPath ?? join(baseDir, 'captions.ass'));

  const resolvedCaptionPreset = getCaptionPreset(normalized.captionPreset ?? 'capcut');
  const captionTimingOffsetMs =
    normalized.captionTimingOffsetMs ??
    (normalized.captionPreset
      ? (CAPTION_STYLE_PRESETS[normalized.captionPreset]?.timingOffsetMs ?? 0)
      : (resolvedCaptionPreset.timingOffsetMs ?? 0));
  const captionMode =
    normalized.captionMode ??
    (resolvedCaptionPreset.displayMode === 'single' ||
    resolvedCaptionPreset.displayMode === 'buildup'
      ? 'page'
      : (resolvedCaptionPreset.displayMode ?? 'page'));

  const captionExport = createCaptionExport(timestamps.allWords, {
    mode: captionMode === 'chunk' ? 'chunk' : 'page',
    layout: resolvedCaptionPreset.layout,
    timingOffsetMs: captionTimingOffsetMs,
  });

  await mkdir(dirname(captionExportPath), { recursive: true });
  await mkdir(dirname(captionSrtPath), { recursive: true });
  await mkdir(dirname(captionAssPath), { recursive: true });

  await writeJsonArtifact(captionExportPath, captionExport);
  await writeFile(captionSrtPath, formatSrtCaptions(captionExport.segments), 'utf8');
  await writeFile(
    captionAssPath,
    formatAssCaptions(captionExport.segments, normalized.captionAssStyle as AssCaptionStyle),
    'utf8'
  );

  return {
    result: {
      captionExportPath,
      captionSrtPath,
      captionAssPath,
      captionQualityPassed: captionExport.quality.passed,
      captionQualityScore: captionExport.quality.score,
      segmentCount: captionExport.segments.length,
    },
    artifacts: [
      artifactFile(captionExportPath, 'Remotion-compatible caption JSON artifact'),
      artifactFile(captionSrtPath, 'SRT caption artifact'),
      artifactFile(captionAssPath, 'ASS caption artifact'),
    ],
  };
}
