/**
 * VideoSpec v1 (reverse-engineering output) schema.
 *
 * Source: "Integration Spec: Short-Form Video Reverse-Engineering Pipeline (VideoSpec v1)".
 *
 * This is intentionally tolerant:
 * - Many fields are optional/nullable because modules can be skipped/fail.
 * - The pipeline is expected to produce partial outputs with provenance notes.
 */
import { z } from 'zod';

/**
 * Ubiquitous Language: VideoSpec schema version identifier for the reverse-engineering artifact.
 */
export const VIDEOSPEC_V1_VERSION = 'VideoSpec.v1' as const;

const TimeSecondsSchema = z.number().finite().nonnegative();

const TimeRangeSchema = z
  .object({
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
  })
  .refine((v) => v.end >= v.start, { message: 'end must be >= start' });

export const VideoSpecMetaSchema = z.object({
  version: z.literal(VIDEOSPEC_V1_VERSION),
  source: z.string().min(1),
  duration: z.number().finite().nonnegative(),
  frame_rate: z.number().finite().positive(),
  resolution: z.object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  }),
  file_size: z.number().int().nonnegative().optional(),
  language: z.string().min(1).optional(),
  analysis_date: z.string().datetime(),
  notes: z.string().optional(),
});

export type VideoSpecMeta = z.infer<typeof VideoSpecMetaSchema>;

export const VideoSpecShotSchema = z
  .object({
    id: z.number().int().positive(),
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
    /**
     * Transition that leads INTO this shot. For shot 1, this may be omitted.
     * v1 values are typically: cut, fade, other.
     */
    transition_in: z.string().min(1).optional(),
    jump_cut: z.boolean().optional(),
  })
  .refine((v) => v.end >= v.start, { message: 'shot.end must be >= shot.start' });

export type VideoSpecShot = z.infer<typeof VideoSpecShotSchema>;

export const VideoSpecPacingSchema = z.object({
  shot_count: z.number().int().nonnegative(),
  avg_shot_duration: z.number().finite().nonnegative(),
  median_shot_duration: z.number().finite().nonnegative(),
  fastest_shot_duration: z.number().finite().nonnegative(),
  slowest_shot_duration: z.number().finite().nonnegative(),
  classification: z.enum(['very_fast', 'fast', 'moderate', 'slow']).optional(),
});

export type VideoSpecPacing = z.infer<typeof VideoSpecPacingSchema>;

export const VideoSpecTimelineSchema = z.object({
  shots: z.array(VideoSpecShotSchema),
  pacing: VideoSpecPacingSchema,
});

export type VideoSpecTimeline = z.infer<typeof VideoSpecTimelineSchema>;

export const VideoSpecCaptionSchema = z
  .object({
    text: z.string().min(1),
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
    speaker: z.string().min(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .refine((v) => v.end >= v.start, { message: 'caption.end must be >= caption.start' });

export type VideoSpecCaption = z.infer<typeof VideoSpecCaptionSchema>;

export const VideoSpecTextOverlaySchema = z
  .object({
    text: z.string().min(1),
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
    position: z.string().min(1).optional(),
    note: z.string().min(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .refine((v) => v.end >= v.start, { message: 'overlay.end must be >= overlay.start' });

export type VideoSpecTextOverlay = z.infer<typeof VideoSpecTextOverlaySchema>;

export const VideoSpecCameraMotionSchema = z
  .object({
    shot_id: z.number().int().positive(),
    motion: z.enum(['static', 'zoom_in', 'zoom_out', 'pan_left', 'pan_right', 'tilt', 'unknown']),
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
  })
  .refine((v) => v.end >= v.start, { message: 'camera_motion.end must be >= start' });

export type VideoSpecCameraMotion = z.infer<typeof VideoSpecCameraMotionSchema>;

export const VideoSpecOtherEffectsSchema = z.object({
  jump_cuts: z.array(z.number().int().positive()).optional(),
  speed_changes: z
    .array(
      z
        .object({
          start: TimeSecondsSchema,
          end: TimeSecondsSchema,
          speed: z.number().finite().positive(),
        })
        .refine((v) => v.end >= v.start, { message: 'speed_change.end must be >= start' })
    )
    .optional(),
});

export type VideoSpecOtherEffects = z.infer<typeof VideoSpecOtherEffectsSchema>;

export const VideoSpecEditingSchema = z.object({
  captions: z.array(VideoSpecCaptionSchema),
  text_overlays: z.array(VideoSpecTextOverlaySchema),
  camera_motion: z.array(VideoSpecCameraMotionSchema),
  other_effects: VideoSpecOtherEffectsSchema,
});

export type VideoSpecEditing = z.infer<typeof VideoSpecEditingSchema>;

const NormalizedRectSchema = z.object({
  x: z.number().finite().min(0).max(1),
  y: z.number().finite().min(0).max(1),
  w: z.number().finite().min(0).max(1),
  h: z.number().finite().min(0).max(1),
});

export const VideoSpecInsertedContentOcrWordSchema = z.object({
  text: z.string().min(1),
  // Normalized [x, y, w, h] relative to the video frame.
  bbox: z.tuple([
    z.number().finite().min(0).max(1),
    z.number().finite().min(0).max(1),
    z.number().finite().min(0).max(1),
    z.number().finite().min(0).max(1),
  ]),
  confidence: z.number().min(0).max(1).optional(),
});

export type VideoSpecInsertedContentOcrWord = z.infer<typeof VideoSpecInsertedContentOcrWordSchema>;

export const VideoSpecInsertedContentOcrSchema = z.object({
  engine: z.string().min(1),
  text: z.string().min(1).optional(),
  words: z.array(VideoSpecInsertedContentOcrWordSchema).optional(),
  lines: z
    .array(
      z.object({
        text: z.string().min(1),
        bbox: z.tuple([
          z.number().finite().min(0).max(1),
          z.number().finite().min(0).max(1),
          z.number().finite().min(0).max(1),
          z.number().finite().min(0).max(1),
        ]),
      })
    )
    .optional(),
});

export type VideoSpecInsertedContentOcr = z.infer<typeof VideoSpecInsertedContentOcrSchema>;

export const VideoSpecInsertedContentKeyframeSchema = z.object({
  time: TimeSecondsSchema,
  text: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
  /**
   * Optional artifact path to a keyframe image (typically relative to the per-video cache dir).
   * This is best-effort and may be omitted when caching is disabled.
   */
  path: z.string().min(1).optional(),
  /**
   * Optional artifact path to a cropped keyframe image (typically relative to the per-video cache dir).
   */
  crop_path: z.string().min(1).optional(),
});

export type VideoSpecInsertedContentKeyframe = z.infer<
  typeof VideoSpecInsertedContentKeyframeSchema
>;

export const VideoSpecInsertedContentConfidenceSchema = z.object({
  is_inserted_content: z.number().min(0).max(1).optional(),
  type: z.number().min(0).max(1).optional(),
  ocr_quality: z.number().min(0).max(1).optional(),
});

export type VideoSpecInsertedContentConfidence = z.infer<
  typeof VideoSpecInsertedContentConfidenceSchema
>;

export const VideoSpecInsertedContentLayoutSchema = z.object({
  engine: z.string().min(1),
  elements: z
    .array(
      z.object({
        id: z.string().min(1).optional(),
        role: z.enum(['title', 'body', 'comment', 'message', 'ui_header', 'ui_footer']).optional(),
        bbox: z
          .tuple([
            z.number().finite().min(0).max(1),
            z.number().finite().min(0).max(1),
            z.number().finite().min(0).max(1),
            z.number().finite().min(0).max(1),
          ])
          .optional(),
        text: z.string().min(1).optional(),
      })
    )
    .optional(),
  reading_order: z.array(z.string().min(1)).optional(),
});

export type VideoSpecInsertedContentLayout = z.infer<typeof VideoSpecInsertedContentLayoutSchema>;

export const VideoSpecInsertedContentStructuredSchema = z.object({
  schema_version: z.string().min(1),
  data: z.record(z.unknown()).optional(),
});

export type VideoSpecInsertedContentStructured = z.infer<
  typeof VideoSpecInsertedContentStructuredSchema
>;

export const VideoSpecInsertedContentBlockSchema = z
  .object({
    id: z.string().min(1),
    type: z.enum([
      'reddit_screenshot',
      'chat_screenshot',
      'browser_page',
      'slide',
      'generic_screenshot',
    ]),
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
    presentation: z.enum(['full_screen', 'picture_in_picture', 'split_screen']).optional(),
    region: NormalizedRectSchema.optional(),
    keyframes: z.array(VideoSpecInsertedContentKeyframeSchema).optional(),
    extraction: z
      .object({
        ocr: VideoSpecInsertedContentOcrSchema.optional(),
        layout: VideoSpecInsertedContentLayoutSchema.optional(),
        structured: VideoSpecInsertedContentStructuredSchema.optional(),
      })
      .optional(),
    confidence: VideoSpecInsertedContentConfidenceSchema.optional(),
  })
  .refine((v) => v.end >= v.start, { message: 'inserted content block end must be >= start' });

export type VideoSpecInsertedContentBlock = z.infer<typeof VideoSpecInsertedContentBlockSchema>;

export const VideoSpecTranscriptSegmentSchema = z
  .object({
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
    speaker: z.string().min(1).optional(),
    text: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
  })
  .refine((v) => v.end >= v.start, { message: 'transcript.end must be >= start' });

export type VideoSpecTranscriptSegment = z.infer<typeof VideoSpecTranscriptSegmentSchema>;

export const VideoSpecMusicSegmentSchema = z
  .object({
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
    track: z.string().min(1).optional().nullable(),
    background: z.boolean().optional(),
    description: z.string().min(1).optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .refine((v) => v.end >= v.start, { message: 'music_segment.end must be >= start' });

export type VideoSpecMusicSegment = z.infer<typeof VideoSpecMusicSegmentSchema>;

export const VideoSpecSoundEffectSchema = z.object({
  time: TimeSecondsSchema,
  type: z.string().min(1),
  description: z.string().min(1).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type VideoSpecSoundEffect = z.infer<typeof VideoSpecSoundEffectSchema>;

export const VideoSpecBeatGridSchema = z.object({
  bpm: z.number().finite().positive().optional().nullable(),
  beats: z.array(TimeSecondsSchema),
});

export type VideoSpecBeatGrid = z.infer<typeof VideoSpecBeatGridSchema>;

export const VideoSpecAudioSchema = z.object({
  transcript: z.array(VideoSpecTranscriptSegmentSchema),
  music_segments: z.array(VideoSpecMusicSegmentSchema),
  sound_effects: z.array(VideoSpecSoundEffectSchema),
  beat_grid: VideoSpecBeatGridSchema,
});

export type VideoSpecAudio = z.infer<typeof VideoSpecAudioSchema>;

export const VideoSpecCharacterSchema = z.object({
  id: z.string().min(1),
  appearances: z.array(TimeRangeSchema),
  speaker_label: z.string().min(1).optional(),
  speaking_segments: z.array(TimeRangeSchema).optional(),
});

export type VideoSpecCharacter = z.infer<typeof VideoSpecCharacterSchema>;

export const VideoSpecObjectSchema = z.object({
  label: z.string().min(1),
  appearances: z.array(TimeRangeSchema),
  confidence: z.number().min(0).max(1).optional(),
});

export type VideoSpecObject = z.infer<typeof VideoSpecObjectSchema>;

export const VideoSpecEntitiesSchema = z.object({
  characters: z.array(VideoSpecCharacterSchema),
  objects: z.array(VideoSpecObjectSchema),
});

export type VideoSpecEntities = z.infer<typeof VideoSpecEntitiesSchema>;

export const VideoSpecNarrativePhaseSchema = z
  .object({
    start: TimeSecondsSchema,
    end: TimeSecondsSchema,
    description: z.string().min(1),
  })
  .refine((v) => v.end >= v.start, { message: 'narrative phase end must be >= start' });

export type VideoSpecNarrativePhase = z.infer<typeof VideoSpecNarrativePhaseSchema>;

export const VideoSpecNarrativeSchema = z.object({
  arc: z.object({
    hook: VideoSpecNarrativePhaseSchema,
    escalation: VideoSpecNarrativePhaseSchema,
    payoff: VideoSpecNarrativePhaseSchema,
  }),
  format: z.string().min(1).optional(),
  cta: z.string().min(1).optional(),
  themes: z.array(z.string().min(1)).optional(),
  tone: z.string().min(1).optional(),
});

export type VideoSpecNarrative = z.infer<typeof VideoSpecNarrativeSchema>;

export const VideoSpecProvenanceSchema = z.object({
  modules: z.record(z.string().min(1)),
  notes: z.array(z.string().min(1)).optional(),
});

export type VideoSpecProvenance = z.infer<typeof VideoSpecProvenanceSchema>;

/**
 * Ubiquitous Language: Zod schema for VideoSpec v1.
 *
 * @cmTerm videospec-v1
 */
export const VideoSpecV1Schema = z.object({
  meta: VideoSpecMetaSchema,
  timeline: VideoSpecTimelineSchema,
  editing: VideoSpecEditingSchema,
  audio: VideoSpecAudioSchema,
  entities: VideoSpecEntitiesSchema,
  narrative: VideoSpecNarrativeSchema,
  inserted_content_blocks: z.array(VideoSpecInsertedContentBlockSchema).optional(),
  provenance: VideoSpecProvenanceSchema,
});

/**
 * Ubiquitous Language: VideoSpec v1 (reverse-engineering artifact).
 *
 * This is the JSON contract written by `cm videospec`.
 *
 * @cmTerm videospec-v1
 */
export type VideoSpecV1 = z.infer<typeof VideoSpecV1Schema>;
