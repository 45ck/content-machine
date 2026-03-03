import { describe, it, expect } from 'vitest';
import { FeatureVectorSchema } from '../../../src/quality-score/feature-schema';

describe('FeatureVectorSchema', () => {
  const validFeatures = {
    videoId: 'test-video-001',
    extractedAt: '2026-01-15T10:00:00.000Z',
    version: '1.0.0',
    repoMetrics: {
      syncRating: 85,
      captionOverall: 0.78,
      pacingScore: 0.65,
      audioScore: 72,
      engagementScore: 80,
    },
    metadata: {
      durationS: 45.5,
      width: 1080,
      height: 1920,
      fps: 30,
    },
  };

  it('should accept valid feature vectors', () => {
    const result = FeatureVectorSchema.parse(validFeatures);
    expect(result.videoId).toBe('test-video-001');
    expect(result.repoMetrics.syncRating).toBe(85);
  });

  it('should accept optional CLIP and text embeddings', () => {
    const withEmbeddings = {
      ...validFeatures,
      clipEmbedding: new Array(512).fill(0.1),
      textEmbedding: new Array(768).fill(-0.05),
    };
    const result = FeatureVectorSchema.parse(withEmbeddings);
    expect(result.clipEmbedding).toHaveLength(512);
    expect(result.textEmbedding).toHaveLength(768);
  });

  it('should allow all repo metrics to be optional', () => {
    const minimal = {
      videoId: 'minimal',
      extractedAt: '2026-01-15T10:00:00.000Z',
      repoMetrics: {},
      metadata: { durationS: 30 },
    };
    const result = FeatureVectorSchema.parse(minimal);
    expect(result.repoMetrics.syncRating).toBeUndefined();
  });

  it('should reject sync rating outside 0-100', () => {
    expect(() =>
      FeatureVectorSchema.parse({
        ...validFeatures,
        repoMetrics: { ...validFeatures.repoMetrics, syncRating: 150 },
      })
    ).toThrow();
  });

  it('should accept video-intrinsic metric fields', () => {
    const withIntrinsic = {
      ...validFeatures,
      repoMetrics: {
        ...validFeatures.repoMetrics,
        temporalFlickerScore: 0.85,
        temporalDuplicateRatio: 0.05,
        freezeRatio: 0.0,
        blackRatio: 0.02,
        audioLoudnessLUFS: -14,
        audioClippingRatio: 0.01,
        flowMeanWarpError: 0.12,
      },
    };
    const result = FeatureVectorSchema.parse(withIntrinsic);
    expect(result.repoMetrics.temporalDuplicateRatio).toBe(0.05);
    expect(result.repoMetrics.audioLoudnessLUFS).toBe(-14);
    expect(result.repoMetrics.flowMeanWarpError).toBe(0.12);
  });

  it('should reject freezeRatio outside 0-1', () => {
    expect(() =>
      FeatureVectorSchema.parse({
        ...validFeatures,
        repoMetrics: { ...validFeatures.repoMetrics, freezeRatio: 1.5 },
      })
    ).toThrow();
  });

  it('should reject negative duration', () => {
    expect(() =>
      FeatureVectorSchema.parse({
        ...validFeatures,
        metadata: { ...validFeatures.metadata, durationS: -5 },
      })
    ).toThrow();
  });
});
