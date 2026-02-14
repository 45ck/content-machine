import { describe, it, expect } from 'vitest';
import type { EvaluationReport } from '../../../src/evaluate/schema';

describe('rankByUncertainty', () => {
  it('ranks borderline scores higher', async () => {
    const { rankByUncertainty } = await import('../../../src/evaluate/active-learning');

    const reports: EvaluationReport[] = [
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/clear_pass.mp4',
        passed: true,
        checks: [
          {
            checkId: 'validate',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 100,
          },
          {
            checkId: 'rate',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 200,
          },
        ],
        thresholds: { validateProfile: 'portrait' },
        overall: { score: 0.95, label: 'good', confidence: 0.9 },
        totalDurationMs: 300,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/borderline.mp4',
        passed: true,
        checks: [
          {
            checkId: 'validate',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 100,
          },
          {
            checkId: 'rate',
            passed: false,
            skipped: false,
            summary: 'Failed',
            durationMs: 200,
          },
        ],
        thresholds: { validateProfile: 'portrait' },
        overall: { score: 0.48, label: 'borderline', confidence: 0.5 },
        totalDurationMs: 300,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const rankings = rankByUncertainty(reports);

    expect(rankings).toHaveLength(2);
    expect(rankings[0].videoPath).toBe('/tmp/borderline.mp4');
    expect(rankings[0].uncertaintyScore).toBeGreaterThan(rankings[1].uncertaintyScore);
    expect(rankings[0].reason).toContain('borderline');
  });

  it('ranks mixed check results higher', async () => {
    const { rankByUncertainty } = await import('../../../src/evaluate/active-learning');

    const reports: EvaluationReport[] = [
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/all_pass.mp4',
        passed: true,
        checks: [
          {
            checkId: 'validate',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 100,
          },
          {
            checkId: 'rate',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 200,
          },
          {
            checkId: 'captionQuality',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 150,
          },
        ],
        thresholds: { validateProfile: 'portrait' },
        overall: { score: 0.95, label: 'good', confidence: 0.9 },
        totalDurationMs: 450,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/mixed.mp4',
        passed: false,
        checks: [
          {
            checkId: 'validate',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 100,
          },
          {
            checkId: 'rate',
            passed: false,
            skipped: false,
            summary: 'Failed',
            durationMs: 200,
          },
          {
            checkId: 'captionQuality',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 150,
          },
        ],
        thresholds: { validateProfile: 'portrait' },
        overall: { score: 0.65, label: 'borderline', confidence: 0.6 },
        totalDurationMs: 450,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const rankings = rankByUncertainty(reports);

    expect(rankings).toHaveLength(2);
    expect(rankings[0].videoPath).toBe('/tmp/mixed.mp4');
    expect(rankings[0].uncertaintyScore).toBeGreaterThan(rankings[1].uncertaintyScore);
  });

  it('handles reports without overall scores', async () => {
    const { rankByUncertainty } = await import('../../../src/evaluate/active-learning');

    const reports: EvaluationReport[] = [
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/no_overall.mp4',
        passed: true,
        checks: [
          {
            checkId: 'validate',
            passed: true,
            skipped: false,
            summary: 'OK',
            durationMs: 100,
          },
        ],
        thresholds: { validateProfile: 'portrait' },
        totalDurationMs: 100,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const rankings = rankByUncertainty(reports);

    expect(rankings).toHaveLength(1);
    expect(rankings[0].uncertaintyScore).toBeGreaterThanOrEqual(0);
  });

  it('returns sorted rankings in descending order', async () => {
    const { rankByUncertainty } = await import('../../../src/evaluate/active-learning');

    const reports: EvaluationReport[] = [
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/video1.mp4',
        passed: true,
        checks: [
          { checkId: 'validate', passed: true, skipped: false, summary: 'OK', durationMs: 100 },
        ],
        thresholds: { validateProfile: 'portrait' },
        overall: { score: 0.9, label: 'good', confidence: 0.9 },
        totalDurationMs: 100,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/video2.mp4',
        passed: true,
        checks: [
          { checkId: 'validate', passed: true, skipped: false, summary: 'OK', durationMs: 100 },
        ],
        thresholds: { validateProfile: 'portrait' },
        overall: { score: 0.5, label: 'borderline', confidence: 0.5 },
        totalDurationMs: 100,
        createdAt: '2024-01-01T00:00:00Z',
      },
      {
        schemaVersion: '1.0.0',
        videoPath: '/tmp/video3.mp4',
        passed: true,
        checks: [
          { checkId: 'validate', passed: true, skipped: false, summary: 'OK', durationMs: 100 },
        ],
        thresholds: { validateProfile: 'portrait' },
        overall: { score: 0.7, label: 'good', confidence: 0.7 },
        totalDurationMs: 100,
        createdAt: '2024-01-01T00:00:00Z',
      },
    ];

    const rankings = rankByUncertainty(reports);

    expect(rankings).toHaveLength(3);
    // Verify descending order
    for (let i = 0; i < rankings.length - 1; i++) {
      expect(rankings[i].uncertaintyScore).toBeGreaterThanOrEqual(rankings[i + 1].uncertaintyScore);
    }
  });
});

describe('rankByQualityUncertainty', () => {
  it('ranks scores near decision boundary higher', async () => {
    const { rankByQualityUncertainty } = await import('../../../src/evaluate/active-learning');

    const features = [
      {
        videoId: 'clear-good',
        extractedAt: '2026-01-01T00:00:00.000Z',
        version: '1.0.0',
        repoMetrics: { syncRating: 90, audioScore: 90, engagementScore: 90 },
        metadata: { durationS: 30 },
      },
      {
        videoId: 'borderline',
        extractedAt: '2026-01-01T00:00:00.000Z',
        version: '1.0.0',
        repoMetrics: { syncRating: 50, audioScore: 50, engagementScore: 50 },
        metadata: { durationS: 30 },
      },
    ];

    const mockScorer = {
      async scoreQuality({ features: f }: any) {
        const avg = ((f.repoMetrics.syncRating ?? 50) + (f.repoMetrics.audioScore ?? 50)) / 2;
        return {
          score: avg,
          confidence: 0.5,
          label: 'average' as const,
          subscores: {},
          defects: [],
          topFactors: [],
          modelVersion: 'test',
          method: 'heuristic' as const,
        };
      },
    };

    const rankings = await rankByQualityUncertainty(features as any, mockScorer);

    expect(rankings).toHaveLength(2);
    expect(rankings[0].videoId).toBe('borderline');
    expect(rankings[0].uncertaintyScore).toBeGreaterThan(rankings[1].uncertaintyScore);
  });

  it('incorporates CLIP diversity when embeddings present', async () => {
    const { rankByQualityUncertainty } = await import('../../../src/evaluate/active-learning');

    const features = [
      {
        videoId: 'close-to-labeled',
        extractedAt: '2026-01-01T00:00:00.000Z',
        version: '1.0.0',
        repoMetrics: { syncRating: 50 },
        metadata: { durationS: 30 },
        clipEmbedding: [1, 0, 0],
      },
      {
        videoId: 'far-from-labeled',
        extractedAt: '2026-01-01T00:00:00.000Z',
        version: '1.0.0',
        repoMetrics: { syncRating: 50 },
        metadata: { durationS: 30 },
        clipEmbedding: [10, 10, 10],
      },
    ];

    const mockScorer = {
      async scoreQuality() {
        return {
          score: 50,
          confidence: 0.5,
          label: 'average' as const,
          subscores: {},
          defects: [],
          topFactors: [],
          modelVersion: 'test',
          method: 'heuristic' as const,
        };
      },
    };

    const labeledEmbeddings = [[1, 0, 0]]; // close to first feature

    const rankings = await rankByQualityUncertainty(features as any, mockScorer, labeledEmbeddings);

    expect(rankings).toHaveLength(2);
    // Both have same uncertainty (score=50), but "far-from-labeled" has higher diversity
    expect(rankings[0].videoId).toBe('far-from-labeled');
    expect(rankings[0].diversityScore).toBeGreaterThan(rankings[1].diversityScore);
  });
});
