import { z } from 'zod';
import type { VideoClip, VisualAsset, VisualsOutput } from '../domain';

export const VisualQualityIssueSchema = z.object({
  type: z.enum([
    'no-assets',
    'fallback-rate',
    'duration-coverage',
    'low-confidence',
    'static-image-without-motion',
    'non-portrait-clip',
  ]),
  severity: z.enum(['error', 'warning']),
  sceneId: z.string().optional(),
  message: z.string(),
  details: z.record(z.number()).optional(),
});

export type VisualQualityIssue = z.infer<typeof VisualQualityIssueSchema>;

export const VisualQualityReportSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(1),
  thresholds: z.object({
    maxFallbackRate: z.number().min(0).max(1),
    minDurationCoverage: z.number().min(0).max(1),
    minMatchConfidence: z.number().min(0).max(1),
  }),
  summary: z.object({
    sceneCount: z.number().int().nonnegative(),
    assetCount: z.number().int().nonnegative(),
    fallbackRate: z.number().min(0).max(1),
    durationCoverage: z.number().min(0).max(1),
    lowConfidenceCount: z.number().int().nonnegative(),
    staticImageWithoutMotionCount: z.number().int().nonnegative(),
    nonPortraitClipCount: z.number().int().nonnegative(),
  }),
  issues: z.array(VisualQualityIssueSchema),
});

export type VisualQualityReport = z.infer<typeof VisualQualityReportSchema>;

export interface VisualQualityOptions {
  targetDurationSeconds?: number;
  maxFallbackRate?: number;
  minDurationCoverage?: number;
  minMatchConfidence?: number;
}

const DEFAULT_VISUAL_QUALITY_THRESHOLDS = {
  maxFallbackRate: 0.25,
  minDurationCoverage: 0.95,
  minMatchConfidence: 0.55,
} as const;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function scoreLimit(value: number, limit: number): number {
  if (limit <= 0) return value <= 0 ? 1 : 0;
  if (value <= limit) return 1;
  return clamp01(1 - (value - limit) / Math.max(1 - limit, 0.001));
}

function scoreMinimum(value: number, minimum: number): number {
  if (minimum <= 0) return 1;
  if (value >= minimum) return 1;
  return clamp01(value / minimum);
}

function countFallbacks(visuals: VisualsOutput): number {
  return visuals.scenes.filter(
    (scene) => scene.source === 'fallback-color' || scene.source === 'mock'
  ).length;
}

function getMatchConfidence(asset: VisualAsset): number | null {
  const values = [asset.llmConfidence, asset.embeddingSimilarity].filter(
    (value): value is number => typeof value === 'number'
  );
  if (values.length === 0) return null;
  return Math.max(...values);
}

function isStaticImageWithoutMotion(asset: VisualAsset): boolean {
  return asset.assetType === 'image' && asset.motionStrategy === 'none';
}

function isNonPortraitClip(clip: VideoClip): boolean {
  return clip.width >= clip.height;
}

/**
 * Metadata-only visual preflight for generated shorts.
 *
 * This intentionally complements frame-level validation. It catches quality
 * risks before render: fallback-heavy plans, weak matching, missing motion for
 * stills, and known non-portrait legacy clip metadata.
 */
export function analyzeVisualsQuality(
  visuals: VisualsOutput,
  options: VisualQualityOptions = {}
): VisualQualityReport {
  const thresholds = {
    maxFallbackRate: options.maxFallbackRate ?? DEFAULT_VISUAL_QUALITY_THRESHOLDS.maxFallbackRate,
    minDurationCoverage:
      options.minDurationCoverage ?? DEFAULT_VISUAL_QUALITY_THRESHOLDS.minDurationCoverage,
    minMatchConfidence:
      options.minMatchConfidence ?? DEFAULT_VISUAL_QUALITY_THRESHOLDS.minMatchConfidence,
  };
  const issues: VisualQualityIssue[] = [];
  const sceneCount = visuals.scenes.length;
  const assetCount = visuals.totalAssets || sceneCount;

  if (assetCount === 0 || sceneCount === 0) {
    issues.push({
      type: 'no-assets',
      severity: 'error',
      message: 'Visual plan has no scene assets.',
    });
  }

  const fallbackCount = Math.max(visuals.fallbacks, countFallbacks(visuals));
  const fallbackRate = assetCount > 0 ? fallbackCount / assetCount : 1;
  if (fallbackRate > thresholds.maxFallbackRate) {
    issues.push({
      type: 'fallback-rate',
      severity: fallbackRate > 0.5 ? 'error' : 'warning',
      message: `Fallback visual rate is ${(fallbackRate * 100).toFixed(0)}%.`,
      details: { fallbackRate, maxFallbackRate: thresholds.maxFallbackRate },
    });
  }

  const targetDuration = options.targetDurationSeconds ?? visuals.totalDuration;
  const sceneDuration = visuals.scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const durationCoverage =
    typeof targetDuration === 'number' && targetDuration > 0
      ? clamp01(sceneDuration / targetDuration)
      : 1;
  if (
    typeof targetDuration === 'number' &&
    targetDuration > 0 &&
    durationCoverage < thresholds.minDurationCoverage
  ) {
    issues.push({
      type: 'duration-coverage',
      severity: 'error',
      message: `Visual plan covers only ${(durationCoverage * 100).toFixed(0)}% of target duration.`,
      details: {
        durationCoverage,
        minDurationCoverage: thresholds.minDurationCoverage,
        sceneDuration,
        targetDuration,
      },
    });
  }

  let lowConfidenceCount = 0;
  let staticImageWithoutMotionCount = 0;
  for (const asset of visuals.scenes) {
    const confidence = getMatchConfidence(asset);
    if (confidence !== null && confidence < thresholds.minMatchConfidence) {
      lowConfidenceCount += 1;
      issues.push({
        type: 'low-confidence',
        severity: 'warning',
        sceneId: asset.sceneId,
        message: `Visual match confidence is ${(confidence * 100).toFixed(0)}%.`,
        details: { confidence, minMatchConfidence: thresholds.minMatchConfidence },
      });
    }

    if (isStaticImageWithoutMotion(asset)) {
      staticImageWithoutMotionCount += 1;
      issues.push({
        type: 'static-image-without-motion',
        severity: 'warning',
        sceneId: asset.sceneId,
        message: 'Static image scene has no motion strategy.',
      });
    }
  }

  let nonPortraitClipCount = 0;
  for (const clip of visuals.clips ?? []) {
    if (isNonPortraitClip(clip)) {
      nonPortraitClipCount += 1;
      issues.push({
        type: 'non-portrait-clip',
        severity: 'warning',
        sceneId: clip.sectionId,
        message: `Legacy clip metadata is not portrait (${clip.width}x${clip.height}).`,
        details: { width: clip.width, height: clip.height },
      });
    }
  }

  const fallbackScore = scoreLimit(fallbackRate, thresholds.maxFallbackRate);
  const coverageScore = scoreMinimum(durationCoverage, thresholds.minDurationCoverage);
  const confidenceScore = sceneCount > 0 ? 1 - lowConfidenceCount / sceneCount : 0;
  const motionScore = sceneCount > 0 ? 1 - staticImageWithoutMotionCount / sceneCount : 0;
  const portraitScore =
    visuals.clips && visuals.clips.length > 0 ? 1 - nonPortraitClipCount / visuals.clips.length : 1;
  const score =
    Math.round(
      (fallbackScore * 0.3 +
        coverageScore * 0.25 +
        confidenceScore * 0.2 +
        portraitScore * 0.15 +
        motionScore * 0.1) *
        1000
    ) / 1000;
  const hasErrors = issues.some((issue) => issue.severity === 'error');

  return VisualQualityReportSchema.parse({
    passed: !hasErrors && score >= 0.85,
    score,
    thresholds,
    summary: {
      sceneCount,
      assetCount,
      fallbackRate,
      durationCoverage,
      lowConfidenceCount,
      staticImageWithoutMotionCount,
      nonPortraitClipCount,
    },
    issues,
  });
}
