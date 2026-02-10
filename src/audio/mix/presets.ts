/**
 * Audio Mix Presets and Enumerations
 *
 * Ubiquitous Language:
 * - Audio mix preset: named defaults for music/SFX/ambience levels (clean/punchy/cinematic/viral).
 * - SFX pack: named bundle of SFX file ids (pops/whoosh/etc).
 * - SFX placement: when SFX events are scheduled (hook/scene/list-item/cta).
 */
import { z } from 'zod';

export interface AudioMixPresetDefaults {
  musicVolumeDb: number;
  musicDuckDb: number;
  sfxVolumeDb: number;
  ambienceVolumeDb: number;
  lufsTarget: number;
}

/**
 * Ubiquitous Language: Audio mix preset defaults (built-in).
 *
 * Audio mix presets are data-defined. This map contains the built-in presets that ship with
 * Content Machine. Custom presets can be layered on via packs/installs without changing `src/`.
 */
export const AUDIO_MIX_PRESETS: Record<string, AudioMixPresetDefaults> = Object.freeze({
  clean: {
    musicVolumeDb: -18,
    musicDuckDb: -8,
    sfxVolumeDb: -12,
    ambienceVolumeDb: -26,
    lufsTarget: -16,
  },
  punchy: {
    musicVolumeDb: -16,
    musicDuckDb: -10,
    sfxVolumeDb: -10,
    ambienceVolumeDb: -24,
    lufsTarget: -14,
  },
  cinematic: {
    musicVolumeDb: -20,
    musicDuckDb: -6,
    sfxVolumeDb: -14,
    ambienceVolumeDb: -28,
    lufsTarget: -18,
  },
  viral: {
    musicVolumeDb: -15,
    musicDuckDb: -12,
    sfxVolumeDb: -9,
    ambienceVolumeDb: -24,
    lufsTarget: -14,
  },
});

/**
 * Ubiquitous Language: Audio mix preset id schema.
 *
 * Note: We intentionally do NOT hardcode an enum here; custom presets are expected to exist.
 */
export const AudioMixPresetIdSchema = z.string().min(1);

/**
 * Ubiquitous Language: Audio mix preset id.
 */
export type AudioMixPresetId = z.infer<typeof AudioMixPresetIdSchema>;

export type BuiltinAudioMixPresetId = keyof typeof AUDIO_MIX_PRESETS;

/**
 * Type guard for builtin audio mix preset ids.
 */
export function isBuiltinAudioMixPresetId(value: string): value is BuiltinAudioMixPresetId {
  return Object.prototype.hasOwnProperty.call(AUDIO_MIX_PRESETS, value);
}

/**
 * Ubiquitous Language: SFX placement enum.
 */
export const SfxPlacementEnum = z.enum(['hook', 'scene', 'list-item', 'cta']);

/**
 * Ubiquitous Language: SFX placement.
 */
export type SfxPlacement = z.infer<typeof SfxPlacementEnum>;

/**
 * Type guard for `SfxPlacement`.
 */
export function isSfxPlacement(value: string): value is SfxPlacement {
  return Object.prototype.hasOwnProperty.call(
    { hook: true, scene: true, 'list-item': true, cta: true } as const,
    value
  );
}

/**
 * Ubiquitous Language: SFX packs.
 *
 * Each pack maps to a set of file ids under `assets/audio/sfx/<pack>/...`.
 */
export const SFX_PACKS = Object.freeze({
  pops: ['pop-01.wav', 'pop-02.wav', 'pop-03.wav'],
  whoosh: ['whoosh-01.wav', 'whoosh-02.wav'],
  glitch: ['glitch-01.wav'],
  clicks: ['click-01.wav', 'click-02.wav'],
} as const);

/**
 * Ubiquitous Language: SFX pack id schema.
 *
 * Note: We intentionally do NOT hardcode an enum here; custom packs are expected to exist.
 */
export const SfxPackIdSchema = z.string().min(1);

/**
 * Ubiquitous Language: SFX pack id.
 */
export type SfxPackId = z.infer<typeof SfxPackIdSchema>;

export type BuiltinSfxPackId = keyof typeof SFX_PACKS;

/**
 * Type guard for builtin SFX pack ids.
 */
export function isBuiltinSfxPackId(value: string): value is BuiltinSfxPackId {
  return Object.prototype.hasOwnProperty.call(SFX_PACKS, value);
}
