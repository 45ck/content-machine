import { z } from 'zod';

export const MEDIA_MANIFEST_SCHEMA_VERSION = '1.0.0';

export const MediaSceneStatusEnum = z.enum([
  'passthrough',
  'keyframe-extracted',
  'video-synthesized',
  'skipped-motion-strategy',
  'skipped-remote-video',
  'skipped-non-video',
  'failed',
]);

export const MediaSceneSchema = z.object({
  sceneId: z.string(),
  assetPath: z.string(),
  assetType: z.enum(['video', 'image']),
  motionStrategy: z.enum(['none', 'kenburns', 'depthflow', 'veo']).optional(),
  keyframePath: z.string().optional(),
  synthesizedVideoPath: z.string().optional(),
  synthesisAdapter: z.string().optional(),
  synthesisJobId: z.string().optional(),
  status: MediaSceneStatusEnum,
  error: z.string().optional(),
});

export type MediaScene = z.infer<typeof MediaSceneSchema>;

export const MediaManifestSchema = z.object({
  schemaVersion: z.string().default(MEDIA_MANIFEST_SCHEMA_VERSION),
  generatedAt: z.string(),
  totalScenes: z.number().int().nonnegative(),
  keyframesExtracted: z.number().int().nonnegative(),
  videosSynthesized: z.number().int().nonnegative(),
  scenes: z.array(MediaSceneSchema),
});

export type MediaManifest = z.infer<typeof MediaManifestSchema>;
