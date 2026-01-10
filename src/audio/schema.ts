/**
 * Audio Schemas
 *
 * Zod schemas for audio generation output validation.
 * Based on SYSTEM-DESIGN §6.4 TimestampsSchema
 */
import { z } from 'zod';
import { AudioMixOutputSchema } from './mix/schema';

/** Current schema version for migrations */
export const AUDIO_SCHEMA_VERSION = '1.0.0';

/**
 * A single word with timestamp (matches SYSTEM-DESIGN §6.4 WordTimestampSchema)
 */
export const WordTimestampSchema = z.object({
  word: z.string().min(1),
  start: z.number().nonnegative().describe('Start time in seconds'),
  end: z.number().nonnegative().describe('End time in seconds'),
  confidence: z.number().min(0).max(1).optional(),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

/**
 * Scene-level timestamps (matches SYSTEM-DESIGN §6.4)
 */
export const SceneTimestampSchema = z.object({
  sceneId: z.string(),
  audioStart: z.number().nonnegative(),
  audioEnd: z.number().nonnegative(),
  words: z.array(WordTimestampSchema),
});

export type SceneTimestamp = z.infer<typeof SceneTimestampSchema>;

/**
 * @deprecated Use SceneTimestampSchema instead - kept for backward compatibility
 */
export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  words: z.array(WordTimestampSchema),
  sectionId: z.string().optional().describe('Reference to script scene (legacy field name)'),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

/**
 * Full timestamps output (matches SYSTEM-DESIGN §6.4 TimestampsSchema)
 */
export const TimestampsOutputSchema = z.object({
  schemaVersion: z.string().default(AUDIO_SCHEMA_VERSION),
  scenes: z.array(SceneTimestampSchema).optional().describe('Per-scene timestamps'),
  allWords: z.array(WordTimestampSchema).describe('All words in sequence'),
  totalDuration: z.number().positive(),
  ttsEngine: z.string().describe('TTS engine used (e.g., kokoro, edge-tts)'),
  asrEngine: z.string().describe('ASR engine used (e.g., whisper-cpp)'),

  // Legacy fields for backward compatibility
  segments: z.array(TranscriptSegmentSchema).optional().describe('@deprecated Use scenes'),
  words: z.array(WordTimestampSchema).optional().describe('@deprecated Use allWords'),
  duration: z.number().positive().optional().describe('@deprecated Use totalDuration'),
  wordCount: z.number().int().nonnegative().optional(),
});

export type TimestampsOutput = z.infer<typeof TimestampsOutputSchema>;

/**
 * Audio generation output
 */
export const AudioOutputSchema = z.object({
  schemaVersion: z.string().default(AUDIO_SCHEMA_VERSION),
  audioPath: z.string(),
  timestampsPath: z.string(),
  timestamps: TimestampsOutputSchema,
  duration: z.number().positive(),
  wordCount: z.number().int().nonnegative(),
  voice: z.string(),
  sampleRate: z.number().int().positive(),
  ttsCost: z.number().nonnegative().optional(),
  audioMixPath: z.string().optional(),
  audioMix: AudioMixOutputSchema.optional(),
});

export type AudioOutput = z.infer<typeof AudioOutputSchema>;
