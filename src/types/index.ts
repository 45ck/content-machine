import { z } from 'zod';

// ─────────────────────────────────────────────────────────────
// Step 1A: Trend Ingest
// ─────────────────────────────────────────────────────────────

export const TrendItemSchema = z.object({
  id: z.string(),
  source: z.enum(['reddit', 'twitter', 'manual', 'weekly-research']),
  title: z.string(),
  url: z.string(),
  score: z.number(),
  fetchedAt: z.coerce.date(),
  contentHash: z.string(), // SHA-256 for dedup
});

export type TrendItem = z.infer<typeof TrendItemSchema>;

// ─────────────────────────────────────────────────────────────
// Step 1B: Planner Output
// ─────────────────────────────────────────────────────────────

export const ContentObjectSchema = z.object({
  id: z.string().uuid(),
  trendItemId: z.string(),
  hook: z.string().max(100),
  targetAudience: z.string(),
  callToAction: z.string(),
  estimatedDuration: z.number().min(15).max(90),
  style: z.enum(['educational', 'entertaining', 'tutorial', 'news']),
  viralityScore: z.number().min(0).max(100).optional(), // Advisory only, never a gate
  createdAt: z.coerce.date(),
});

export type ContentObject = z.infer<typeof ContentObjectSchema>;

// ─────────────────────────────────────────────────────────────
// Step 2: Script
// ─────────────────────────────────────────────────────────────

export const SceneSchema = z.object({
  number: z.number(),
  duration: z.number(), // seconds
  voiceover: z.string(),
  visualDescription: z.string(),
  assetHints: z.array(z.string()).optional(), // e.g., ["product-ui", "pexels:coding"]
});

export const ScriptSchema = z.object({
  id: z.string().uuid(),
  contentObjectId: z.string().uuid(),
  title: z.string(),
  scenes: z.array(SceneSchema),
  totalDuration: z.number(),
  createdAt: z.coerce.date(),
});

export type Scene = z.infer<typeof SceneSchema>;
export type Script = z.infer<typeof ScriptSchema>;

// ─────────────────────────────────────────────────────────────
// Step 3: Assets
// ─────────────────────────────────────────────────────────────

export const AssetSchema = z.object({
  id: z.string().uuid(), // Asset registry ID
  type: z.enum(['voiceover', 'product-capture', 'pexels-video', 'pexels-image', 'generated']),
  path: z.string(), // Local path after download
  duration: z.number().optional(), // For video/audio
  source: z.string(), // e.g., "pexels:12345" or "playwright:bot-dashboard"
  license: z.enum(['pexels', 'proprietary', 'generated']),
  attributionRequired: z.boolean(),
  createdAt: z.coerce.date(),
});

export type Asset = z.infer<typeof AssetSchema>;

// ─────────────────────────────────────────────────────────────
// Step 4: Scene JSON (Remotion input)
// ─────────────────────────────────────────────────────────────

/**
 * Scene JSON Limits (security hardening)
 * - Max 20 scenes per video
 * - Max 120 seconds total
 * - Asset references by UUID only (no path injection)
 */
export const SCENE_JSON_LIMITS = {
  maxScenes: 20,
  maxDuration: 120,
  maxAssetRefs: 50,
} as const;

export const SceneJSONLayerSchema = z.object({
  type: z.enum(['video', 'image', 'text', 'voiceover']),
  assetRef: z.string().uuid(), // References Asset.id, NOT a path
  startFrame: z.number(),
  durationFrames: z.number(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }).optional(),
  style: z.record(z.string()).optional(),
});

export const SceneJSONSchema = z.object({
  id: z.string().uuid(),
  scriptId: z.string().uuid(),
  fps: z.number().default(30),
  width: z.number().default(1080),
  height: z.number().default(1920), // 9:16 for shorts
  scenes: z.array(z.object({
    number: z.number(),
    startFrame: z.number(),
    durationFrames: z.number(),
    layers: z.array(SceneJSONLayerSchema),
  })),
  captions: z.array(z.object({
    text: z.string(),
    startFrame: z.number(),
    endFrame: z.number(),
  })).optional(),
  createdAt: z.coerce.date(),
});

export type SceneJSONLayer = z.infer<typeof SceneJSONLayerSchema>;
export type SceneJSON = z.infer<typeof SceneJSONSchema>;

// ─────────────────────────────────────────────────────────────
// Step 6: Export Package
// ─────────────────────────────────────────────────────────────

export const ExportPackageSchema = z.object({
  id: z.string().uuid(),
  sceneJsonId: z.string().uuid(),
  outputDir: z.string(),
  files: z.object({
    video: z.string(),
    cover: z.string(),
    metadata: z.string(),
    checklist: z.string(),
  }),
  platforms: z.array(z.enum(['tiktok', 'reels', 'shorts'])),
  createdAt: z.coerce.date(),
});

export type ExportPackage = z.infer<typeof ExportPackageSchema>;

// ─────────────────────────────────────────────────────────────
// Pipeline Job (state machine)
// ─────────────────────────────────────────────────────────────

export const PipelineJobSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    'pending',
    'step-1a-ingest',
    'step-1b-planning',
    'step-2-scripting',
    'step-3-assets',
    'step-4-rendering',
    'step-5-review',
    'step-6-export',
    'step-7-analytics',
    'completed',
    'failed',
    'rejected', // Human rejected at step 5
  ]),
  trendItemId: z.string().optional(),
  contentObjectId: z.string().uuid().optional(),
  scriptId: z.string().uuid().optional(),
  sceneJsonId: z.string().uuid().optional(),
  exportPackageId: z.string().uuid().optional(),
  error: z.string().optional(),
  retryCount: z.number().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type PipelineJob = z.infer<typeof PipelineJobSchema>;
