/**
 * Visuals Schemas
 * 
 * Zod schemas for visual matching output validation.
 */
import { z } from 'zod';

/**
 * A single video clip
 */
export const VideoClipSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  startTime: z.number().nonnegative().describe('When this clip starts in the video'),
  endTime: z.number().positive().describe('When this clip ends in the video'),
  source: z.enum(['pexels', 'pixabay', 'local']),
  sourceId: z.string(),
  searchQuery: z.string().describe('Query used to find this clip'),
  sectionId: z.string().optional().describe('Reference to script section'),
});

export type VideoClip = z.infer<typeof VideoClipSchema>;

/**
 * Keyword extraction result
 */
export const KeywordSchema = z.object({
  keyword: z.string(),
  sectionId: z.string(),
  startTime: z.number().nonnegative(),
  endTime: z.number().positive(),
  visualHint: z.string().optional(),
});

export type Keyword = z.infer<typeof KeywordSchema>;

/**
 * Full visuals output
 */
export const VisualsOutputSchema = z.object({
  clips: z.array(VideoClipSchema),
  keywords: z.array(KeywordSchema),
  totalDuration: z.number().positive(),
  provider: z.string(),
  fallbacksUsed: z.number().int().nonnegative(),
});

export type VisualsOutput = z.infer<typeof VisualsOutputSchema>;
