/**
 * VideoBlueprint extraction logic.
 *
 * Extracts a reusable VideoBlueprint.v1 from a VideoSpec.v1 + VideoTheme.v1.
 * The blueprint captures the structural "recipe" of a video without its content.
 *
 * @module videointel
 */
import type { VideoSpecV1 } from '../domain';
import {
  VIDEOBLUEPRINT_V1_VERSION,
  VideoBlueprintV1Schema,
  type CaptionStyleClass,
  type DominantMotion,
  type SceneRole,
  type SceneSlot,
  type SceneVisualType,
  type VideoBlueprintV1,
  type VideoThemeV1,
} from '../domain';

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface ExtractBlueprintOptions {
  sourceVideospecPath?: string;
  sourceThemePath?: string;
}

/**
 * Extract a VideoBlueprint from a VideoSpec + VideoTheme pair.
 *
 * @internal
 */
export function extractBlueprint(
  spec: VideoSpecV1,
  theme: VideoThemeV1,
  options: ExtractBlueprintOptions = {}
): VideoBlueprintV1 {
  const sceneSlots = extractSceneSlots(spec, theme);
  const pacingProfile = extractPacingProfile(spec);
  const captionProfile = extractCaptionProfile(spec, theme);
  const audioProfile = extractAudioProfile(spec);
  const narrativeStructure = extractNarrativeStructure(spec);
  const insertedContentPattern = extractInsertedContentPattern(spec);

  return VideoBlueprintV1Schema.parse({
    version: VIDEOBLUEPRINT_V1_VERSION,
    source_videospec: options.sourceVideospecPath ?? 'unknown',
    source_theme: options.sourceThemePath ?? 'unknown',
    archetype: theme.archetype,

    scene_slots: sceneSlots,
    pacing_profile: pacingProfile,
    caption_profile: captionProfile,
    audio_profile: audioProfile,
    narrative_structure: narrativeStructure,
    inserted_content_pattern: insertedContentPattern,

    provenance: {
      extracted_at: new Date().toISOString(),
      source_videospecs: [options.sourceVideospecPath ?? 'unknown'],
      method: 'deterministic',
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Scene slot extraction                                              */
/* ------------------------------------------------------------------ */

/** @internal */
export function extractSceneSlots(spec: VideoSpecV1, theme: VideoThemeV1): SceneSlot[] {
  const arc = spec.narrative.arc;
  const shots = spec.timeline.shots;
  const insertedBlocks = spec.inserted_content_blocks ?? [];

  if (shots.length === 0) {
    return [buildFallbackSlot(spec, 0, 'hook')];
  }

  const slots: SceneSlot[] = [];
  let slotIndex = 0;

  for (const shot of shots) {
    const role = inferSceneRole(shot.start, shot.end, arc, spec, slotIndex === shots.length - 1);
    const visualType = inferVisualType(shot, insertedBlocks, theme);
    const hasCaptions = shotHasCaptions(spec, shot.start, shot.end);
    const motionEntry = spec.editing.camera_motion.find((m) => m.shot_id === shot.id);

    slots.push({
      index: slotIndex,
      role,
      duration_range: {
        min: Math.max(0.5, (shot.end - shot.start) * 0.7),
        max: (shot.end - shot.start) * 1.3,
      },
      visual_type: visualType,
      has_captions: hasCaptions,
      camera_motion: motionEntry ? mapMotion(motionEntry.motion) : undefined,
    });

    slotIndex++;
  }

  return slots;
}

function inferSceneRole(
  start: number,
  end: number,
  arc: VideoSpecV1['narrative']['arc'],
  spec: VideoSpecV1,
  isLast: boolean
): SceneRole {
  // Check if this shot overlaps with the hook phase
  if (start < arc.hook.end && end <= arc.hook.end + 1) return 'hook';

  // CTA detection: last shot with CTA text
  if (isLast && spec.narrative.cta) return 'cta';

  // Payoff phase
  if (start >= arc.payoff.start - 1) return isLast ? 'outro' : 'climax';

  // Escalation phase
  if (start >= arc.escalation.start) return 'escalation';

  return 'point';
}

function inferVisualType(
  shot: VideoSpecV1['timeline']['shots'][0],
  insertedBlocks: NonNullable<VideoSpecV1['inserted_content_blocks']>,
  theme: VideoThemeV1
): SceneVisualType {
  // Check if this shot overlaps with an inserted content block
  for (const block of insertedBlocks) {
    if (shot.start < block.end && shot.end > block.start) {
      return 'inserted_content';
    }
  }

  if (theme.format === 'talking_head') return 'talking_head';
  if (theme.format === 'compilation' || theme.format === 'montage') return 'stock_footage';

  return 'b_roll';
}

function shotHasCaptions(spec: VideoSpecV1, start: number, end: number): boolean {
  return spec.editing.captions.some((c) => c.start < end && c.end > start);
}

function mapMotion(motion: string): DominantMotion {
  if (motion === 'static') return 'static';
  if (motion === 'zoom_in' || motion === 'zoom_out') return 'zoom_in';
  if (motion === 'pan_left' || motion === 'pan_right') return 'pan';
  return 'mixed';
}

function buildFallbackSlot(spec: VideoSpecV1, index: number, role: SceneRole): SceneSlot {
  return {
    index,
    role,
    duration_range: { min: 1, max: spec.meta.duration },
    visual_type: 'talking_head',
    has_captions: spec.editing.captions.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Profile extraction                                                 */
/* ------------------------------------------------------------------ */

/** @internal */
export function extractPacingProfile(spec: VideoSpecV1) {
  const pacing = spec.timeline.pacing;
  return {
    target_duration: spec.meta.duration,
    avg_shot_duration: pacing.avg_shot_duration || spec.meta.duration,
    shot_count_range: {
      min: Math.max(1, Math.floor(pacing.shot_count * 0.7)),
      max: Math.ceil(pacing.shot_count * 1.3) || 1,
    },
    classification: pacing.classification,
  };
}

/** @internal */
export function extractCaptionProfile(spec: VideoSpecV1, theme: VideoThemeV1) {
  const present = spec.editing.captions.length > 0;
  const captionCoverage = spec.editing.captions.reduce((sum, c) => sum + (c.end - c.start), 0);
  const density = present ? captionCoverage / Math.max(1, spec.meta.duration) : undefined;

  return {
    present,
    style: theme.edit_signature.caption_style as CaptionStyleClass | undefined,
    density: density !== undefined ? Math.min(1, Math.round(density * 100) / 100) : undefined,
  };
}

/** @internal */
export function extractAudioProfile(spec: VideoSpecV1) {
  const speakers = new Set(spec.audio.transcript.map((s) => s.speaker).filter(Boolean));
  return {
    has_voiceover: spec.audio.transcript.length > 0,
    has_music: spec.audio.music_segments.length > 0,
    bpm: spec.audio.beat_grid.bpm ?? undefined,
    speaker_count: speakers.size || undefined,
  };
}

/** @internal */
export function extractNarrativeStructure(spec: VideoSpecV1) {
  const hookDuration = spec.narrative.arc.hook.end - spec.narrative.arc.hook.start;
  return {
    hook_duration: hookDuration,
    has_cta: Boolean(spec.narrative.cta),
    arc_type: spec.narrative.format,
  };
}

/** @internal */
export function extractInsertedContentPattern(spec: VideoSpecV1) {
  const blocks = spec.inserted_content_blocks ?? [];
  const present = blocks.length > 0;
  const types = present ? [...new Set(blocks.map((b) => b.type))] : undefined;

  return {
    present,
    count: present ? blocks.length : undefined,
    types,
  };
}
