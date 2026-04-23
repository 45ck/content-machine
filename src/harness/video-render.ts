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
import { CAPTION_STYLE_PRESETS } from '../render/captions/presets';
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

export const VideoRenderRequestSchema = z
  .object({
    visualsPath: z.string().min(1),
    timestampsPath: z.string().min(1),
    audioPath: z.string().min(1),
    audioMixPath: z.string().min(1).optional(),
    outputPath: z.string().min(1).default('output/harness/render/render.mp4'),
    outputMetadataPath: z.string().min(1).optional(),
    orientation: OrientationEnum.default('portrait'),
    fps: z.number().int().positive().default(30),
    downloadAssets: z.boolean().default(true),
    mock: z.boolean().default(false),
    mockRenderMode: z.enum(['placeholder', 'real']).default('placeholder'),
    captionPreset: CaptionPresetEnum.optional(),
    captionMode: z.enum(['page', 'single', 'buildup', 'chunk']).optional(),
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
      captionPreset: normalized.captionPreset,
      captionMode: normalized.captionMode,
      captionFontFamily: normalized.captionFontFamily,
      captionFontWeight: normalized.captionFontWeight,
      captionFontFile: normalized.captionFontFile ? resolve(normalized.captionFontFile) : undefined,
    })
  );

  await writeJsonArtifact(outputMetadataPath, renderOutput);

  return {
    result: {
      outputPath: renderOutput.outputPath,
      outputMetadataPath,
      duration: renderOutput.duration,
      width: renderOutput.width,
      height: renderOutput.height,
      fps: renderOutput.fps,
      fileSize: renderOutput.fileSize,
    },
    artifacts: [
      artifactFile(renderOutput.outputPath, 'Rendered video artifact'),
      artifactFile(outputMetadataPath, 'Render metadata artifact'),
    ],
  };
}
