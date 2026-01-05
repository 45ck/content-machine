/**
 * Audio Schemas
 * 
 * Zod schemas for audio generation output validation.
 */
import { z } from 'zod';

/**
 * A single word with timestamp
 */
export const WordTimestampSchema = z.object({
  word: z.string(),
  start: z.number().nonnegative().describe('Start time in seconds'),
  end: z.number().nonnegative().describe('End time in seconds'),
  confidence: z.number().min(0).max(1).optional(),
});

export type WordTimestamp = z.infer<typeof WordTimestampSchema>;

/**
 * A segment of transcription (sentence/phrase level)
 */
export const TranscriptSegmentSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  words: z.array(WordTimestampSchema),
  sectionId: z.string().optional().describe('Reference to script section'),
});

export type TranscriptSegment = z.infer<typeof TranscriptSegmentSchema>;

/**
 * Full timestamps output
 */
export const TimestampsOutputSchema = z.object({
  segments: z.array(TranscriptSegmentSchema),
  words: z.array(WordTimestampSchema),
  duration: z.number().positive(),
  wordCount: z.number().int().nonnegative(),
});

export type TimestampsOutput = z.infer<typeof TimestampsOutputSchema>;

/**
 * Audio generation output
 */
export const AudioOutputSchema = z.object({
  audioPath: z.string(),
  timestampsPath: z.string(),
  timestamps: TimestampsOutputSchema,
  duration: z.number().positive(),
  wordCount: z.number().int().nonnegative(),
  voice: z.string(),
  sampleRate: z.number().int().positive(),
  ttsCost: z.number().nonnegative().optional(),
});

export type AudioOutput = z.infer<typeof AudioOutputSchema>;
