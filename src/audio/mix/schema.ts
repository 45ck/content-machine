/**
 * Audio Mix Schemas
 *
 * Defines the mix plan used to layer music/SFX/ambience on top of voice.
 */
import { z } from 'zod';

/** Current schema version for audio mix plans */
export const AUDIO_MIX_SCHEMA_VERSION = '1.0.0';

const MusicLayerSchema = z.object({
  type: z.literal('music'),
  path: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().positive(),
  volumeDb: z.number().optional(),
  duckDb: z.number().optional(),
  fadeInMs: z.number().int().nonnegative().optional(),
  fadeOutMs: z.number().int().nonnegative().optional(),
  loop: z.boolean().optional(),
});

const SfxLayerSchema = z.object({
  type: z.literal('sfx'),
  path: z.string().min(1),
  start: z.number().nonnegative(),
  duration: z.number().positive(),
  volumeDb: z.number().optional(),
  event: z.string().optional(),
  sceneId: z.string().optional(),
});

const AmbienceLayerSchema = z.object({
  type: z.literal('ambience'),
  path: z.string().min(1),
  start: z.number().nonnegative(),
  end: z.number().positive(),
  volumeDb: z.number().optional(),
  fadeInMs: z.number().int().nonnegative().optional(),
  fadeOutMs: z.number().int().nonnegative().optional(),
  loop: z.boolean().optional(),
});

export const AudioMixLayerSchema = z.discriminatedUnion('type', [
  MusicLayerSchema,
  SfxLayerSchema,
  AmbienceLayerSchema,
]);

export type AudioMixLayer = z.infer<typeof AudioMixLayerSchema>;
export type MusicLayer = z.infer<typeof MusicLayerSchema>;
export type SfxLayer = z.infer<typeof SfxLayerSchema>;
export type AmbienceLayer = z.infer<typeof AmbienceLayerSchema>;

export const AudioMixOutputSchema = z.object({
  schemaVersion: z.string().default(AUDIO_MIX_SCHEMA_VERSION),
  voicePath: z.string().min(1),
  totalDuration: z.number().positive(),
  mixPreset: z.string().optional(),
  lufsTarget: z.number().optional(),
  layers: z.array(AudioMixLayerSchema).default([]),
  warnings: z.array(z.string()).default([]),
});

export type AudioMixOutput = z.infer<typeof AudioMixOutputSchema>;
