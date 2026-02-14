/**
 * Feature Vector Schema
 *
 * Zod schema for the extracted feature vector produced per video.
 * Used as input to the quality scorer (both heuristic and learned).
 */
import { z } from 'zod';

/** Repo-level metric features extracted from existing scoring modules. */
export const RepoMetricFeaturesSchema = z.object({
  // Sync rating
  syncRating: z.number().min(0).max(100).optional(),
  syncMeanDriftMs: z.number().optional(),
  syncMatchRatio: z.number().min(0).max(1).optional(),

  // Caption quality
  captionOverall: z.number().min(0).max(1).optional(),
  captionCoverage: z.number().min(0).max(1).optional(),
  captionRhythm: z.number().min(0).max(1).optional(),
  captionJitter: z.number().min(0).max(1).optional(),
  captionSafeArea: z.number().min(0).max(1).optional(),

  // Pacing
  pacingScore: z.number().min(0).max(1).optional(),
  pacingAvgWpm: z.number().optional(),
  pacingCv: z.number().optional(),

  // Audio quality
  audioScore: z.number().min(0).max(100).optional(),
  audioGapCount: z.number().int().optional(),
  audioOverlapCount: z.number().int().optional(),

  // Engagement
  engagementScore: z.number().min(0).max(100).optional(),
  hookTiming: z.number().min(0).max(100).optional(),
  ctaPresence: z.number().min(0).max(100).optional(),
  sceneProgression: z.number().min(0).max(100).optional(),

  // Script score (if script available)
  scriptScore: z.number().min(0).max(1).optional(),
});

/** Metadata features derived from video properties. */
export const MetadataFeaturesSchema = z.object({
  durationS: z.number().positive(),
  frameCount: z.number().int().positive().optional(),
  sceneCount: z.number().int().optional(),
  captionCoverageRatio: z.number().min(0).max(1).optional(),
  ocrConfidenceMean: z.number().min(0).max(1).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fps: z.number().positive().optional(),
});

/** Full feature vector for a single video. */
export const FeatureVectorSchema = z.object({
  videoId: z.string().min(1),
  extractedAt: z.string().datetime(),
  version: z.string().default('1.0.0'),
  repoMetrics: RepoMetricFeaturesSchema,
  metadata: MetadataFeaturesSchema,
  clipEmbedding: z.array(z.number()).optional().describe('CLIP frame embedding (512-dim avg pool)'),
  textEmbedding: z.array(z.number()).optional().describe('DistilBERT text embedding (768-dim)'),
});

export type RepoMetricFeatures = z.infer<typeof RepoMetricFeaturesSchema>;
export type MetadataFeatures = z.infer<typeof MetadataFeaturesSchema>;
export type FeatureVector = z.infer<typeof FeatureVectorSchema>;
