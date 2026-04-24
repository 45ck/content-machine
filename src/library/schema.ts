import { z } from 'zod';

export const MEDIA_INDEX_SCHEMA_VERSION = '1.0.0';
export const STYLE_PROFILE_LIBRARY_SCHEMA_VERSION = '1.0.0';

export const MediaIndexItemSchema = z
  .object({
    path: z.string().min(1),
    type: z.enum(['video', 'audio', 'image', 'unknown']),
    category: z.string().nullable().default(null),
    durationSeconds: z.number().positive().nullable().default(null),
    width: z.number().int().positive().nullable().default(null),
    height: z.number().int().positive().nullable().default(null),
    fps: z.number().positive().nullable().default(null),
    orientation: z.enum(['portrait', 'landscape', 'square', 'unknown']).default('unknown'),
    hasAudio: z.boolean().default(false),
    hasVideo: z.boolean().default(false),
    tags: z.array(z.string().min(1)).default([]),
    transcriptPath: z.string().min(1).nullable().default(null),
    metadata: z.record(z.unknown()).default({}),
    indexedAt: z.string().min(1),
  })
  .strict();

export const MediaIndexSchema = z
  .object({
    schemaVersion: z.string().default(MEDIA_INDEX_SCHEMA_VERSION),
    items: z.array(MediaIndexItemSchema),
    warnings: z.array(z.string()),
  })
  .strict();

export const StyleProfileSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().default(null),
    captionStyle: z.string().min(1).default('karaoke-ass'),
    pacing: z.enum(['calm', 'balanced', 'fast']).default('balanced'),
    visualRules: z.array(z.string().min(1)).default([]),
    renderDefaults: z.record(z.unknown()).default({}),
    references: z.array(z.string().min(1)).default([]),
    updatedAt: z.string().min(1),
  })
  .strict();

export const StyleProfileLibrarySchema = z
  .object({
    schemaVersion: z.string().default(STYLE_PROFILE_LIBRARY_SCHEMA_VERSION),
    profiles: z.array(StyleProfileSchema),
    warnings: z.array(z.string()),
  })
  .strict();

export type MediaIndexItem = z.infer<typeof MediaIndexItemSchema>;
export type MediaIndex = z.infer<typeof MediaIndexSchema>;
export type StyleProfile = z.infer<typeof StyleProfileSchema>;
export type StyleProfileLibrary = z.infer<typeof StyleProfileLibrarySchema>;
