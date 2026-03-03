import { describe, it, expect } from 'vitest';
import { scoreQuality } from '../../../src/quality-score/scorer';
import type { FeatureVector } from '../../../src/quality-score/feature-schema';

function makeFeatures(overrides: Partial<FeatureVector['repoMetrics']> = {}): FeatureVector {
  return {
    videoId: 'test-video',
    extractedAt: '2026-01-15T10:00:00.000Z',
    version: '1.0.0',
    repoMetrics: {
      syncRating: 80,
      captionOverall: 0.75,
      pacingScore: 0.7,
      audioScore: 72,
      engagementScore: 85,
      scriptScore: 0.68,
      syncMatchRatio: 0.82,
      hookTiming: 90,
      ...overrides,
    },
    metadata: { durationS: 45.5, width: 1080, height: 1920 },
  };
}

describe('scoreQuality', () => {
  it('should return a heuristic score when forced', async () => {
    const result = await scoreQuality({
      features: makeFeatures(),
      heuristic: true,
    });

    expect(result.method).toBe('heuristic');
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.label).toBeDefined();
    expect(result.modelVersion).toBe('heuristic-v2');
  });

  it('should produce higher scores for better metrics', async () => {
    const good = await scoreQuality({
      features: makeFeatures({
        syncRating: 95,
        captionOverall: 0.95,
        engagementScore: 95,
        audioScore: 95,
      }),
      heuristic: true,
    });

    const bad = await scoreQuality({
      features: makeFeatures({
        syncRating: 20,
        captionOverall: 0.2,
        engagementScore: 20,
        audioScore: 20,
      }),
      heuristic: true,
    });

    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('should include top factors when explain is true', async () => {
    const result = await scoreQuality({
      features: makeFeatures(),
      heuristic: true,
      explain: true,
    });

    expect(result.topFactors.length).toBeGreaterThan(0);
    expect(result.topFactors[0]).toHaveProperty('feature');
    expect(result.topFactors[0]).toHaveProperty('impact');
    expect(result.topFactors[0]).toHaveProperty('direction');
  });

  it('should return label matching score range', async () => {
    const excellent = await scoreQuality({
      features: makeFeatures({
        syncRating: 100,
        captionOverall: 1,
        pacingScore: 1,
        audioScore: 100,
        engagementScore: 100,
        scriptScore: 1,
        syncMatchRatio: 1,
        hookTiming: 100,
      }),
      heuristic: true,
    });
    expect(excellent.label).toBe('excellent');

    const bad = await scoreQuality({
      features: makeFeatures({
        syncRating: 5,
        captionOverall: 0.05,
        pacingScore: 0.05,
        audioScore: 5,
        engagementScore: 5,
        scriptScore: 0.05,
        syncMatchRatio: 0.05,
        hookTiming: 5,
      }),
      heuristic: true,
    });
    expect(['bad', 'below_average', 'average']).toContain(bad.label);
  });

  it('should fall back to heuristic when no model exists', async () => {
    const result = await scoreQuality({
      features: makeFeatures(),
      modelPath: '/nonexistent/model.onnx',
    });

    expect(result.method).toBe('heuristic');
  });

  it('should handle features with all metrics missing', async () => {
    const result = await scoreQuality({
      features: {
        videoId: 'empty',
        extractedAt: '2026-01-15T10:00:00.000Z',
        version: '1.0.0',
        repoMetrics: {},
        metadata: { durationS: 30, width: 1080, height: 1920 },
      },
      heuristic: true,
    });

    // With no repo metrics, score is purely intrinsic (portrait, 1080w, good duration)
    expect(result.score).toBeGreaterThanOrEqual(30);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.method).toBe('heuristic');
    // Confidence should be low since no repo metrics
    expect(result.confidence).toBeLessThan(0.6);
  });

  it('should include confidence in result', async () => {
    const result = await scoreQuality({
      features: makeFeatures(),
      heuristic: true,
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('should include defects array in result', async () => {
    const result = await scoreQuality({
      features: makeFeatures(),
      heuristic: true,
    });

    expect(Array.isArray(result.defects)).toBe(true);
  });

  it('should detect low_sync_rating defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ syncRating: 20 }),
      heuristic: true,
    });

    expect(result.defects).toContain('low_sync_rating');
  });

  it('should detect audio_quality_poor defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ audioScore: 15 }),
      heuristic: true,
    });

    expect(result.defects).toContain('audio_quality_poor');
  });

  it('should detect audio_overlap_detected defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ audioOverlapCount: 3 }),
      heuristic: true,
    });

    expect(result.defects).toContain('audio_overlap_detected');
  });

  it('should detect caption_quality_poor defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ captionOverall: 0.1 }),
      heuristic: true,
    });

    expect(result.defects).toContain('caption_quality_poor');
  });

  it('should detect pacing_poor defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ pacingScore: 0.1 }),
      heuristic: true,
    });

    expect(result.defects).toContain('pacing_poor');
  });

  it('should detect low_engagement defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ engagementScore: 10 }),
      heuristic: true,
    });

    expect(result.defects).toContain('low_engagement');
  });

  it('should detect weak_hook defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ hookTiming: 5 }),
      heuristic: true,
    });

    expect(result.defects).toContain('weak_hook');
  });

  it('should detect multiple simultaneous defects', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ syncRating: 10, audioScore: 10, hookTiming: 5 }),
      heuristic: true,
    });

    expect(result.defects).toContain('low_sync_rating');
    expect(result.defects).toContain('audio_quality_poor');
    expect(result.defects).toContain('weak_hook');
    expect(result.defects.length).toBeGreaterThanOrEqual(3);
  });

  it('should have low confidence when no repo metrics available', async () => {
    const result = await scoreQuality({
      features: {
        videoId: 'boundary',
        extractedAt: '2026-01-15T10:00:00.000Z',
        version: '1.0.0',
        repoMetrics: {},
        metadata: { durationS: 30, width: 1080, height: 1920 },
      },
      heuristic: true,
    });

    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it('should penalize high duplicate frame ratio (inverted metric)', async () => {
    const good = await scoreQuality({
      features: makeFeatures({ temporalDuplicateRatio: 0.05 }),
      heuristic: true,
    });
    const bad = await scoreQuality({
      features: makeFeatures({ temporalDuplicateRatio: 0.91 }),
      heuristic: true,
    });
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('should penalize high freeze ratio (inverted metric)', async () => {
    const good = await scoreQuality({
      features: makeFeatures({ freezeRatio: 0.0 }),
      heuristic: true,
    });
    const bad = await scoreQuality({
      features: makeFeatures({ freezeRatio: 0.83 }),
      heuristic: true,
    });
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('should detect high_duplicate_frames defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ temporalDuplicateRatio: 0.7 }),
      heuristic: true,
    });
    expect(result.defects).toContain('high_duplicate_frames');
  });

  it('should detect excessive_freeze defect', async () => {
    const result = await scoreQuality({
      features: makeFeatures({ freezeRatio: 0.5 }),
      heuristic: true,
    });
    expect(result.defects).toContain('excessive_freeze');
  });

  it('should score LUFS near -14 as good', async () => {
    const good = await scoreQuality({
      features: makeFeatures({ audioLoudnessLUFS: -14 }),
      heuristic: true,
    });
    const bad = await scoreQuality({
      features: makeFeatures({ audioLoudnessLUFS: -40 }),
      heuristic: true,
    });
    expect(good.score).toBeGreaterThan(bad.score);
  });

  it('should report no defects for good metrics', async () => {
    const result = await scoreQuality({
      features: makeFeatures({
        syncRating: 90,
        audioScore: 85,
        audioOverlapCount: 0,
        captionOverall: 0.8,
        pacingScore: 0.7,
        engagementScore: 80,
        hookTiming: 70,
      }),
      heuristic: true,
    });

    expect(result.defects).toEqual([]);
  });
});
