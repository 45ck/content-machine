/**
 * Audio Mix Planner
 *
 * Builds a mix plan that layers music, SFX, and ambience on top of voice.
 */
import {
  AUDIO_MIX_SCHEMA_VERSION,
  type AudioMixLayer,
  type AudioMixOutput,
  type ScriptOutput,
  type TimestampsOutput,
} from '../../domain';

import {
  AUDIO_MIX_PRESETS,
  SFX_PACKS,
  type AudioMixPresetDefaults,
  type SfxPlacement,
  isBuiltinAudioMixPresetId,
  isBuiltinSfxPackId,
} from './presets';

/**
 * Ubiquitous Language: Audio mix plan options.
 *
 * These options control how music/SFX/ambience are layered over the voice track.
 */
export interface AudioMixPlanOptions {
  music?: string | null;
  musicVolumeDb?: number;
  musicDuckDb?: number;
  musicLoop?: boolean;
  musicFadeInMs?: number;
  musicFadeOutMs?: number;
  sfx?: string[] | null;
  // Note: allow arbitrary strings so users can refer to custom packs; only known packs
  // in `SFX_PACKS` will resolve to bundled file lists.
  sfxPack?: string | null;
  sfxAt?: SfxPlacement;
  sfxVolumeDb?: number;
  sfxMinGapMs?: number;
  sfxDurationSeconds?: number;
  ambience?: string | null;
  ambienceVolumeDb?: number;
  ambienceLoop?: boolean;
  ambienceFadeInMs?: number;
  ambienceFadeOutMs?: number;
  // Note: allow arbitrary strings so users can refer to custom presets; only known presets
  // in `AUDIO_MIX_PRESETS` will resolve to bundled defaults.
  mixPreset?: string;
  lufsTarget?: number;
  noMusic?: boolean;
  noSfx?: boolean;
  noAmbience?: boolean;
}

export interface BuildAudioMixPlanParams {
  script: ScriptOutput;
  timestamps: TimestampsOutput;
  voicePath: string;
  options: AudioMixPlanOptions;
}

const DEFAULT_MUSIC_FADE_IN_MS = 400;
const DEFAULT_MUSIC_FADE_OUT_MS = 600;
const DEFAULT_SFX_DURATION_SECONDS = 0.4;
const DEFAULT_SFX_MIN_GAP_MS = 800;
const DEFAULT_AMBIENCE_FADE_IN_MS = 200;
const DEFAULT_AMBIENCE_FADE_OUT_MS = 400;

const SPECIAL_SCENE_IDS = new Set(['hook', 'cta']);

interface SfxEvent {
  time: number;
  event: SfxPlacement;
  sceneId?: string;
}

function resolvePresetDefaults(name?: string): {
  preset: AudioMixPresetDefaults;
  presetName: string;
  warning?: string;
} {
  const normalized = (name ?? 'clean').trim().toLowerCase();
  if (isBuiltinAudioMixPresetId(normalized)) {
    return { preset: AUDIO_MIX_PRESETS[normalized], presetName: normalized };
  }
  return {
    preset: AUDIO_MIX_PRESETS.clean,
    presetName: 'clean',
    warning: normalized ? `Unknown mix preset: ${normalized}` : undefined,
  };
}

function hasPathSeparator(value: string): boolean {
  return value.includes('/') || value.includes('\\');
}

function hasFileExtension(value: string): boolean {
  return /\.[a-z0-9]+$/i.test(value.trim());
}

function resolvePresetPath(value: string, kind: 'music' | 'sfx' | 'ambience'): string {
  if (hasPathSeparator(value) || hasFileExtension(value)) {
    return value;
  }
  const extension = kind === 'music' ? 'mp3' : 'wav';
  if (kind === 'ambience') {
    return `assets/audio/ambience/${value}.${extension}`;
  }
  if (kind === 'music') {
    return `assets/audio/music/${value}.${extension}`;
  }
  return `assets/audio/sfx/${value}.${extension}`;
}

function resolveSfxPackSources(pack?: string | null): string[] {
  if (!pack) return [];
  const normalized = pack.trim().toLowerCase();
  const entries = isBuiltinSfxPackId(normalized) ? SFX_PACKS[normalized] : [];
  return entries.map((file) => `assets/audio/sfx/${normalized}/${file}`);
}

/**
 * Returns true if the provided mix options would result in any non-voice audio layers.
 */
export function hasAudioMixSources(options: AudioMixPlanOptions): boolean {
  if (options.noMusic !== true && options.music) return true;
  if (options.noAmbience !== true && options.ambience) return true;
  if (options.noSfx !== true) {
    if (options.sfx && options.sfx.length > 0) return true;
    if (options.sfxPack) return true;
  }
  return false;
}

function resolveSfxSources(options: AudioMixPlanOptions): string[] {
  const explicit = (options.sfx ?? []).flatMap((entry) =>
    entry ? [resolvePresetPath(entry, 'sfx')] : []
  );
  const packed = resolveSfxPackSources(options.sfxPack);
  const combined = [...explicit, ...packed];
  return combined;
}

function getSceneStart(timestamps: TimestampsOutput, sceneId: string): number | null {
  const scenes = timestamps.scenes ?? [];
  const scene = scenes.find((entry) => entry.sceneId === sceneId);
  if (scene) return scene.audioStart;
  return null;
}

function getFirstWordStart(timestamps: TimestampsOutput): number {
  return timestamps.allWords.length > 0 ? timestamps.allWords[0].start : 0;
}

function getLastWordStart(timestamps: TimestampsOutput): number {
  if (timestamps.allWords.length === 0) return 0;
  return timestamps.allWords[timestamps.allWords.length - 1].start;
}

function buildSceneEvents(timestamps: TimestampsOutput, placement: SfxPlacement): SfxEvent[] {
  const scenes = timestamps.scenes ?? [];
  if (placement === 'hook') {
    const hookStart = getSceneStart(timestamps, 'hook');
    return [
      {
        time: hookStart ?? getFirstWordStart(timestamps),
        event: 'hook',
        sceneId: hookStart !== null ? 'hook' : undefined,
      },
    ];
  }

  if (placement === 'cta') {
    const ctaStart = getSceneStart(timestamps, 'cta');
    const fallback =
      scenes.length > 0 ? scenes[scenes.length - 1].audioStart : getLastWordStart(timestamps);
    return [
      {
        time: ctaStart ?? fallback,
        event: 'cta',
        sceneId: ctaStart !== null ? 'cta' : undefined,
      },
    ];
  }

  const filtered = scenes.filter((scene) => !SPECIAL_SCENE_IDS.has(scene.sceneId));
  if (filtered.length === 0) {
    return [
      {
        time: getFirstWordStart(timestamps),
        event: placement,
      },
    ];
  }

  return filtered.map((scene) => ({
    time: scene.audioStart,
    event: placement,
    sceneId: scene.sceneId,
  }));
}

function applyMinGap(events: SfxEvent[], minGapSeconds: number): SfxEvent[] {
  if (events.length === 0) return events;
  const sorted = [...events].sort((a, b) => a.time - b.time);
  const result: SfxEvent[] = [];
  let lastTime = -Infinity;
  for (const event of sorted) {
    if (event.time - lastTime >= minGapSeconds) {
      result.push(event);
      lastTime = event.time;
    }
  }
  return result;
}

function clampDuration(value: number, totalDuration: number): number {
  if (!Number.isFinite(value)) return totalDuration;
  if (value < 0) return 0;
  if (value > totalDuration) return totalDuration;
  return value;
}

function buildMusicLayer(params: {
  totalDuration: number;
  options: AudioMixPlanOptions;
  preset: AudioMixPresetDefaults;
}): AudioMixLayer | null {
  const { totalDuration, options, preset } = params;
  if (options.noMusic || !options.music) return null;

  const musicPath = resolvePresetPath(options.music, 'music');
  const musicVolumeDb = options.musicVolumeDb ?? preset.musicVolumeDb;
  const musicDuckDb = options.musicDuckDb ?? preset.musicDuckDb;
  const fadeInMs = options.musicFadeInMs ?? DEFAULT_MUSIC_FADE_IN_MS;
  const fadeOutMs = options.musicFadeOutMs ?? DEFAULT_MUSIC_FADE_OUT_MS;
  const loop = options.musicLoop ?? true;

  return {
    type: 'music',
    path: musicPath,
    start: 0,
    end: totalDuration,
    volumeDb: musicVolumeDb,
    duckDb: musicDuckDb,
    fadeInMs,
    fadeOutMs,
    loop,
  };
}

function buildAmbienceLayer(params: {
  totalDuration: number;
  options: AudioMixPlanOptions;
  preset: AudioMixPresetDefaults;
}): AudioMixLayer | null {
  const { totalDuration, options, preset } = params;
  if (options.noAmbience || !options.ambience) return null;

  const ambiencePath = resolvePresetPath(options.ambience, 'ambience');
  const ambienceVolumeDb = options.ambienceVolumeDb ?? preset.ambienceVolumeDb;
  const fadeInMs = options.ambienceFadeInMs ?? DEFAULT_AMBIENCE_FADE_IN_MS;
  const fadeOutMs = options.ambienceFadeOutMs ?? DEFAULT_AMBIENCE_FADE_OUT_MS;
  const loop = options.ambienceLoop ?? true;

  return {
    type: 'ambience',
    path: ambiencePath,
    start: 0,
    end: totalDuration,
    volumeDb: ambienceVolumeDb,
    fadeInMs,
    fadeOutMs,
    loop,
  };
}

function buildSfxLayers(params: {
  timestamps: TimestampsOutput;
  totalDuration: number;
  options: AudioMixPlanOptions;
  preset: AudioMixPresetDefaults;
  warnings: string[];
}): AudioMixLayer[] {
  const { timestamps, totalDuration, options, preset, warnings } = params;
  if (options.noSfx) return [];

  const sfxSources = resolveSfxSources(options);
  const placement: SfxPlacement = options.sfxAt ?? 'scene';
  const sfxEvents = buildSceneEvents(timestamps, placement);
  const minGapMs = options.sfxMinGapMs ?? DEFAULT_SFX_MIN_GAP_MS;
  const minGapSeconds = minGapMs / 1000;
  const spacedEvents = applyMinGap(sfxEvents, minGapSeconds);
  const durationSeconds = options.sfxDurationSeconds ?? DEFAULT_SFX_DURATION_SECONDS;
  const sfxVolumeDb = options.sfxVolumeDb ?? preset.sfxVolumeDb;

  if (sfxSources.length === 0 && spacedEvents.length > 0) {
    warnings.push('SFX requested but no SFX sources provided');
  }

  return spacedEvents.flatMap((event, index) => {
    const source = sfxSources[index % sfxSources.length];
    if (!source) return [];
    const start = clampDuration(event.time, totalDuration);
    const end = clampDuration(start + durationSeconds, totalDuration);
    if (end <= start) return [];
    return [
      {
        type: 'sfx',
        path: source,
        start,
        duration: end - start,
        volumeDb: sfxVolumeDb,
        event: event.event,
        sceneId: event.sceneId,
      },
    ];
  });
}

/**
 * Build an `audio.mix.json` plan from timestamps + CLI options.
 *
 * This returns mix layers (voice/music/ambience/sfx) and warnings that can be
 * surfaced to the user.
 */
export function buildAudioMixPlan(params: BuildAudioMixPlanParams): AudioMixOutput {
  const { script: _script, timestamps, voicePath, options } = params;
  const warnings: string[] = [];
  const { preset, presetName, warning } = resolvePresetDefaults(options.mixPreset);
  if (warning) warnings.push(warning);

  const totalDuration = clampDuration(timestamps.totalDuration, timestamps.totalDuration);
  const layers: AudioMixLayer[] = [];

  const mixPresetName = presetName;
  const lufsTarget = options.lufsTarget ?? preset.lufsTarget;

  const musicLayer = buildMusicLayer({ totalDuration, options, preset });
  if (musicLayer) layers.push(musicLayer);

  const ambienceLayer = buildAmbienceLayer({ totalDuration, options, preset });
  if (ambienceLayer) layers.push(ambienceLayer);

  layers.push(
    ...buildSfxLayers({
      timestamps,
      totalDuration,
      options,
      preset,
      warnings,
    })
  );

  return {
    schemaVersion: AUDIO_MIX_SCHEMA_VERSION,
    voicePath,
    totalDuration,
    mixPreset: mixPresetName,
    lufsTarget,
    layers,
    warnings,
  };
}
