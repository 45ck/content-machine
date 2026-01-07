/**
 * Video Template Schema
 *
 * A "template" selects a Remotion composition and provides render defaults
 * (caption preset/config, orientation, fps, etc).
 *
 * Templates are data-only and schema-validated.
 */
import { z } from 'zod';
import { ArchetypeEnum, OrientationEnum } from '../../core/config';
import { CAPTION_STYLE_PRESETS, type CaptionPresetName } from '../captions/presets';
import { CaptionConfigSchema } from '../captions/config';

const CaptionPresetNameSchema = z.enum(
  Object.keys(CAPTION_STYLE_PRESETS) as [CaptionPresetName, ...CaptionPresetName[]]
);

export const VideoTemplateDefaultsSchema = z.object({
  orientation: OrientationEnum.optional(),
  fps: z.number().int().min(1).max(120).optional(),
  captionPreset: CaptionPresetNameSchema.optional(),
  captionConfig: CaptionConfigSchema.deepPartial().optional(),
  archetype: ArchetypeEnum.optional(),
});

export const VideoTemplateSchema = z.object({
  schemaVersion: z.string().default('1.0.0'),
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  compositionId: z.string().min(1),
  defaults: VideoTemplateDefaultsSchema.optional(),
  assets: z.record(z.unknown()).optional(),
  params: z.record(z.unknown()).optional(),
});

export type VideoTemplate = z.infer<typeof VideoTemplateSchema>;

