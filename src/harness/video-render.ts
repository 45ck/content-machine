import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  AudioMixOutputSchema,
  RenderOutputSchema,
  TimestampsOutputSchema,
  VisualsOutputSchema,
  type RenderOutput,
} from '../domain';
import { OrientationEnum } from '../core/config';
import {
  createCaptionExport,
  formatAssCaptions,
  formatSrtCaptions,
  getCaptionPreset,
} from '../render/captions';
import { CAPTION_STYLE_PRESETS } from '../render/captions/presets';
import { AssCaptionStyle } from '../render/captions/export';
import { renderVideo } from '../render/service';
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

export const VideoRenderRequestSchema = z
  .object({
    visualsPath: z.string().min(1),
    timestampsPath: z.string().min(1),
    audioPath: z.string().min(1),
    audioMixPath: z.string().min(1).optional(),
    outputPath: z.string().min(1).default('output/content-machine/render/render.mp4'),
    outputMetadataPath: z.string().min(1).optional(),
    exportCaptions: z.boolean().default(true),
    captionExportPath: z.string().min(1).optional(),
    captionSrtPath: z.string().min(1).optional(),
    captionAssPath: z.string().min(1).optional(),
    orientation: OrientationEnum.default('portrait'),
    fps: z.number().int().positive().default(30),
    downloadAssets: z.boolean().default(true),
    mock: z.boolean().default(false),
    mockRenderMode: z.enum(['placeholder', 'real']).default('placeholder'),
    browserExecutable: z.string().min(1).optional(),
    chromeMode: z.enum(['headless-shell', 'chrome-for-testing']).optional(),
    compositionId: z.string().min(1).optional(),
    splitScreenRatio: z.number().min(0.3).max(0.7).optional(),
    gameplayPosition: z.enum(['top', 'bottom', 'full']).optional(),
    contentPosition: z.enum(['top', 'bottom', 'full']).optional(),
    captionPreset: CaptionPresetEnum.optional(),
    captionMode: z.enum(['page', 'single', 'buildup', 'chunk']).optional(),
    captionTimingOffsetMs: z.number().int().min(-2000).max(2000).optional(),
    captionAssStyle: AssCaptionStyleSchema.optional(),
    captionFontFamily: z.string().min(1).optional(),
    captionFontWeight: z
      .union([z.number().int().positive(), z.enum(['normal', 'bold', 'black'])])
      .optional(),
    captionFontFile: z.string().min(1).optional(),
  })
  .strict();

export type VideoRenderRequest = z.input<typeof VideoRenderRequestSchema>;

/** Render a video artifact from existing visuals, timestamps, and audio artifacts. */
export async function runVideoRender(request: VideoRenderRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    outputMetadataPath: string;
    captionExportPath: string | null;
    captionSrtPath: string | null;
    captionAssPath: string | null;
    captionQualityPassed: boolean | null;
    captionQualityScore: number | null;
    duration: number;
    width: number;
    height: number;
    fps: number;
    fileSize: number;
  }>
> {
  const normalized = VideoRenderRequestSchema.parse(request);
  const visuals = await readJsonArtifact(
    normalized.visualsPath,
    VisualsOutputSchema,
    'visuals artifact'
  );
  const timestamps = await readJsonArtifact(
    normalized.timestampsPath,
    TimestampsOutputSchema,
    'timestamps artifact'
  );
  const audioMix = normalized.audioMixPath
    ? await readJsonArtifact(normalized.audioMixPath, AudioMixOutputSchema, 'audio mix artifact')
    : undefined;

  const outputPath = resolve(normalized.outputPath);
  const outputMetadataPath = resolve(
    normalized.outputMetadataPath ?? join(dirname(outputPath), 'render.json')
  );
  const captionExportPath = resolve(
    normalized.captionExportPath ?? join(dirname(outputPath), 'captions.remotion.json')
  );
  const captionSrtPath = resolve(
    normalized.captionSrtPath ?? join(dirname(outputPath), 'captions.srt')
  );
  const captionAssPath = resolve(
    normalized.captionAssPath ?? join(dirname(outputPath), 'captions.ass')
  );

  const renderOutput: RenderOutput = RenderOutputSchema.parse(
    await renderVideo({
      visuals,
      timestamps,
      audioPath: resolve(normalized.audioPath),
      audioMix,
      outputPath,
      orientation: normalized.orientation,
      fps: normalized.fps,
      downloadAssets: normalized.downloadAssets,
      mock: normalized.mock,
      mockRenderMode: normalized.mockRenderMode,
      browserExecutable: normalized.browserExecutable
        ? resolve(normalized.browserExecutable)
        : undefined,
      chromeMode: normalized.chromeMode,
      compositionId: normalized.compositionId,
      splitScreenRatio: normalized.splitScreenRatio,
      gameplayPosition: normalized.gameplayPosition,
      contentPosition: normalized.contentPosition,
      captionPreset: normalized.captionPreset,
      captionMode: normalized.captionMode,
      captionFontFamily: normalized.captionFontFamily,
      captionFontWeight: normalized.captionFontWeight,
      captionFontFile: normalized.captionFontFile ? resolve(normalized.captionFontFile) : undefined,
    })
  );

  await writeJsonArtifact(outputMetadataPath, renderOutput);

  const artifacts = [
    artifactFile(renderOutput.outputPath, 'Rendered video artifact'),
    artifactFile(outputMetadataPath, 'Render metadata artifact'),
  ];
  let exportedCaptionJsonPath: string | null = null;
  let exportedCaptionSrtPath: string | null = null;
  let exportedCaptionAssPath: string | null = null;
  let captionQualityPassed: boolean | null = null;
  let captionQualityScore: number | null = null;

  if (normalized.exportCaptions) {
    const resolvedCaptionPreset = getCaptionPreset(normalized.captionPreset ?? 'capcut');
    const captionTimingOffsetMs =
      normalized.captionTimingOffsetMs ??
      (normalized.captionPreset
        ? (CAPTION_STYLE_PRESETS[normalized.captionPreset]?.timingOffsetMs ?? 0)
        : resolvedCaptionPreset.timingOffsetMs ?? 0);
    const captionMode =
      normalized.captionMode ??
      (resolvedCaptionPreset.displayMode === 'single' || resolvedCaptionPreset.displayMode === 'buildup'
        ? 'page'
        : resolvedCaptionPreset.displayMode ?? 'page');
    const captionExport = createCaptionExport(timestamps.allWords, {
      mode: captionMode === 'chunk' ? 'chunk' : 'page',
      layout: resolvedCaptionPreset.layout,
      timingOffsetMs: captionTimingOffsetMs,
    });
    captionQualityPassed = captionExport.quality.passed;
    captionQualityScore = captionExport.quality.score;
    await mkdir(dirname(captionExportPath), { recursive: true });
    await writeJsonArtifact(captionExportPath, captionExport);
    await writeFile(captionSrtPath, formatSrtCaptions(captionExport.segments), 'utf8');
    await writeFile(
      captionAssPath,
      formatAssCaptions(captionExport.segments, normalized.captionAssStyle as AssCaptionStyle),
      'utf8'
    );
    exportedCaptionJsonPath = captionExportPath;
    exportedCaptionSrtPath = captionSrtPath;
    exportedCaptionAssPath = captionAssPath;
    artifacts.push(
      artifactFile(captionExportPath, 'Remotion-compatible caption JSON artifact'),
      artifactFile(captionSrtPath, 'SRT caption artifact'),
      artifactFile(captionAssPath, 'ASS caption artifact')
    );
  }

  return {
    result: {
      outputPath: renderOutput.outputPath,
      outputMetadataPath,
      captionExportPath: exportedCaptionJsonPath,
      captionSrtPath: exportedCaptionSrtPath,
      captionAssPath: exportedCaptionAssPath,
      captionQualityPassed,
      captionQualityScore,
      duration: renderOutput.duration,
      width: renderOutput.width,
      height: renderOutput.height,
      fps: renderOutput.fps,
      fileSize: renderOutput.fileSize,
    },
    artifacts,
  };
}
