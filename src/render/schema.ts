/**
 * Render Schemas
 * 
 * Zod schemas for video rendering.
 */
import { z } from 'zod';
import { VideoClipSchema } from '../visuals/schema';
import { WordTimestampSchema } from '../audio/schema';

/**
 * Caption style configuration
 */
export const CaptionStyleSchema = z.object({
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().int().positive().default(48),
  fontWeight: z.enum(['normal', 'bold', '900']).default('bold'),
  color: z.string().default('#FFFFFF'),
  highlightColor: z.string().default('#FFE135'),
  strokeColor: z.string().default('#000000'),
  strokeWidth: z.number().int().nonnegative().default(3),
  position: z.enum(['bottom', 'center', 'top']).default('center'),
  animation: z.enum(['none', 'pop', 'bounce']).default('pop'),
});

export type CaptionStyle = z.infer<typeof CaptionStyleSchema>;

/**
 * Render input props
 */
export const RenderPropsSchema = z.object({
  clips: z.array(VideoClipSchema),
  words: z.array(WordTimestampSchema),
  audioPath: z.string(),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive().default(30),
  captionStyle: CaptionStyleSchema.optional(),
});

export type RenderProps = z.infer<typeof RenderPropsSchema>;

/**
 * Render output
 */
export const RenderOutputSchema = z.object({
  outputPath: z.string(),
  duration: z.number().positive(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().int().positive(),
  fileSize: z.number().int().nonnegative(),
  codec: z.string(),
});

export type RenderOutput = z.infer<typeof RenderOutputSchema>;
