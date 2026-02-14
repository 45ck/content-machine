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
    metadata: { durationS: 45.5 },
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
    expect(result.modelVersion).toBe('heuristic-v1');
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
    expect(['bad', 'below_average']).toContain(bad.label);
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
        metadata: { durationS: 30 },
      },
      heuristic: true,
    });

    expect(result.score).toBe(50); // default when no metrics available
    expect(result.method).toBe('heuristic');
  });
});
