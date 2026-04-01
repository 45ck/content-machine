/**
 * Video Intelligence schemas: VideoTheme.v1 and VideoBlueprint.v1
 *
 * These artifacts bridge the reverse-engineering pipeline (cm videospec → VideoSpec.v1)
 * with the forward pipeline (cm script → cm audio → cm visuals → cm render).
 *
 * @module videointel
 */
import { z } from 'zod';
import { ArchetypeIdSchema } from '../domain/ids';

/* ------------------------------------------------------------------ */
/*  Version constants                                                  */
/* ------------------------------------------------------------------ */

export const VIDEOTHEME_V1_VERSION = 'VideoTheme.v1' as const;
export const VIDEOBLUEPRINT_V1_VERSION = 'VideoBlueprint.v1' as const;

/* ------------------------------------------------------------------ */
/*  VideoTheme.v1                                                      */
/* ------------------------------------------------------------------ */

export const VideoPurposeSchema = z.enum([
  'educate',
  'persuade',
  'entertain',
  'convert',
  'build_trust',
  'provoke_curiosity',
]);
export type VideoPurpose = z.infer<typeof VideoPurposeSchema>;

export const VideoFormatSchema = z.enum([
  'talking_head',
  'listicle',
  'versus',
  'story',
  'hot_take',
  'tutorial',
  'montage',
  'reaction',
  'compilation',
]);
export type VideoFormat = z.infer<typeof VideoFormatSchema>;

export const EnergyLevelSchema = z.enum(['low', 'medium', 'high']);
export type EnergyLevel = z.infer<typeof EnergyLevelSchema>;

export const EditingDensitySchema = z.enum(['minimal', 'moderate', 'dense', 'hyper']);
export type EditingDensity = z.infer<typeof EditingDensitySchema>;

export const CaptionStyleClassSchema = z.enum(['none', 'burned_in', 'animated_word', 'karaoke']);
export type CaptionStyleClass = z.infer<typeof CaptionStyleClassSchema>;

export const DominantMotionSchema = z.enum(['static', 'zoom_in', 'pan', 'mixed']);
export type DominantMotion = z.infer<typeof DominantMotionSchema>;

export const ClassificationMethodSchema = z.enum(['heuristic', 'llm']);
export type ClassificationMethod = z.infer<typeof ClassificationMethodSchema>;

const StyleSchema = z.object({
  tone: z.string().min(1).optional(),
  energy: EnergyLevelSchema,
  editing_density: EditingDensitySchema,
});

const EditSignatureSchema = z.object({
  caption_style: CaptionStyleClassSchema,
  has_inserted_content: z.boolean(),
  has_music: z.boolean(),
  jump_cut_ratio: z.number().finite().min(0).max(1),
  dominant_motion: DominantMotionSchema,
});

const ThemeProvenanceSchema = z.object({
  method: ClassificationMethodSchema,
  model: z.string().min(1).optional(),
  classified_at: z.string().datetime(),
  notes: z.string().min(1).optional(),
});

/**
 * Ubiquitous Language: Zod schema for VideoTheme v1.
 *
 * @cmTerm video-theme
 */
export const VideoThemeV1Schema = z.object({
  version: z.literal(VIDEOTHEME_V1_VERSION),
  source_videospec: z.string().min(1),

  archetype: ArchetypeIdSchema,
  archetype_confidence: z.number().finite().min(0).max(1),

  purpose: VideoPurposeSchema,
  format: VideoFormatSchema,

  style: StyleSchema,
  edit_signature: EditSignatureSchema,

  theme_labels: z.array(z.string().min(1)),
  confidence: z.number().finite().min(0).max(1),

  provenance: ThemeProvenanceSchema,
});

/**
 * Ubiquitous Language: VideoTheme v1 (classification artifact).
 *
 * @cmTerm video-theme
 */
export type VideoThemeV1 = z.infer<typeof VideoThemeV1Schema>;

/* ------------------------------------------------------------------ */
/*  VideoBlueprint.v1                                                  */
/* ------------------------------------------------------------------ */

export const SceneRoleSchema = z.enum(['hook', 'point', 'escalation', 'climax', 'cta', 'outro']);
export type SceneRole = z.infer<typeof SceneRoleSchema>;

export const SceneVisualTypeSchema = z.enum([
  'talking_head',
  'b_roll',
  'inserted_content',
  'stock_footage',
  'text_overlay',
  'montage',
]);
export type SceneVisualType = z.infer<typeof SceneVisualTypeSchema>;

const DurationRangeSchema = z.object({
  min: z.number().finite().nonnegative(),
  max: z.number().finite().nonnegative(),
});

const SceneSlotSchema = z.object({
  index: z.number().int().nonnegative(),
  role: SceneRoleSchema,
  duration_range: DurationRangeSchema,
  visual_type: SceneVisualTypeSchema,
  has_captions: z.boolean(),
  camera_motion: DominantMotionSchema.optional(),
});

export type SceneSlot = z.infer<typeof SceneSlotSchema>;

const PacingProfileSchema = z.object({
  target_duration: z.number().finite().positive(),
  avg_shot_duration: z.number().finite().positive(),
  shot_count_range: z.object({
    min: z.number().int().nonnegative(),
    max: z.number().int().nonnegative(),
  }),
  classification: z.enum(['very_fast', 'fast', 'moderate', 'slow']).optional(),
});

const CaptionProfileSchema = z.object({
  present: z.boolean(),
  style: CaptionStyleClassSchema.optional(),
  position: z.string().min(1).optional(),
  density: z.number().finite().min(0).max(1).optional(),
});

const AudioProfileSchema = z.object({
  has_voiceover: z.boolean(),
  has_music: z.boolean(),
  bpm: z.number().finite().positive().optional().nullable(),
  speaker_count: z.number().int().nonnegative().optional(),
});

const NarrativeStructureSchema = z.object({
  hook_duration: z.number().finite().nonnegative(),
  has_cta: z.boolean(),
  arc_type: z.string().min(1).optional(),
});

const InsertedContentPatternSchema = z.object({
  present: z.boolean(),
  count: z.number().int().nonnegative().optional(),
  types: z.array(z.string().min(1)).optional(),
});

const BlueprintProvenanceSchema = z.object({
  extracted_at: z.string().datetime(),
  source_videospecs: z.array(z.string().min(1)),
  method: z.string().min(1),
});

/**
 * Ubiquitous Language: Zod schema for VideoBlueprint v1.
 *
 * @cmTerm video-blueprint
 */
export const VideoBlueprintV1Schema = z.object({
  version: z.literal(VIDEOBLUEPRINT_V1_VERSION),
  source_videospec: z.string().min(1),
  source_theme: z.string().min(1),
  archetype: ArchetypeIdSchema,

  scene_slots: z.array(SceneSlotSchema),

  pacing_profile: PacingProfileSchema,
  caption_profile: CaptionProfileSchema,
  audio_profile: AudioProfileSchema,
  narrative_structure: NarrativeStructureSchema,
  inserted_content_pattern: InsertedContentPatternSchema,

  provenance: BlueprintProvenanceSchema,
});

/**
 * Ubiquitous Language: VideoBlueprint v1 (reusable structure extraction artifact).
 *
 * @cmTerm video-blueprint
 */
export type VideoBlueprintV1 = z.infer<typeof VideoBlueprintV1Schema>;
