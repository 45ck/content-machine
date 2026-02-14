import { describe, it, expect, vi } from 'vitest';

// Mock all dependencies
vi.mock('../../../src/validate/validate', () => ({
  validateVideoPath: vi.fn().mockResolvedValue({
    passed: true,
    summary: {
      width: 1080,
      height: 1920,
      durationSeconds: 47,
      videoCodec: 'h264',
      audioCodec: 'aac',
      container: 'mp4',
    },
    gates: [],
  }),
}));
vi.mock('../../../src/score/sync-rater', () => ({
  rateSyncQuality: vi.fn().mockResolvedValue({
    rating: 87,
    ratingLabel: 'good',
    passed: true,
    metrics: { meanDriftMs: 142 },
    captionQuality: { overall: 0.82 },
  }),
  rateCaptionQuality: vi.fn().mockResolvedValue({
    captionQuality: { overall: 0.82, subscores: { coverage: { score: 0.89 } } },
  }),
}));
vi.mock('../../../src/score/scorer', () => ({
  scoreScript: vi.fn().mockReturnValue({ passed: true, overall: 0.85 }),
}));
vi.mock('../../../src/validate/temporal', () => ({
  TemporalAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      flicker: { score: 0.9, variance: 1.0, meanDiff: 3.0 },
      duplicateFrameRatio: 0.05,
      framesAnalyzed: 100,
    }),
  })),
  runTemporalQualityGate: vi.fn().mockReturnValue({
    gateId: 'temporal-quality',
    passed: true,
    severity: 'warning',
    fix: 'none',
    message: 'OK',
    details: {
      flickerScore: 0.9,
      flickerVariance: 1.0,
      duplicateFrameRatio: 0.05,
      framesAnalyzed: 100,
      flickerMin: 0.5,
      maxDuplicateFrameRatio: 0.3,
    },
  }),
}));
vi.mock('../../../src/validate/audio-signal', () => ({
  FfmpegAudioAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      loudnessLUFS: -14.2,
      truePeakDBFS: -1.5,
      loudnessRange: 8,
      clippingRatio: 0,
      peakLevelDB: -1.2,
      snrDB: 25,
    }),
  })),
  runAudioSignalGate: vi.fn().mockReturnValue({
    gateId: 'audio-signal',
    passed: true,
    severity: 'warning',
    fix: 'none',
    message: 'OK',
    details: {
      loudnessLUFS: -14.2,
      truePeakDBFS: -1.5,
      loudnessRange: 8,
      clippingRatio: 0,
      snrDB: 25,
      loudnessMinLUFS: -24,
      loudnessMaxLUFS: -8,
      maxClippingRatio: 0.01,
      truePeakMaxDBFS: -1,
    },
  }),
}));

describe('overall score aggregation', () => {
  it('produces a good score when all checks pass', async () => {
    const { evaluateVideo } = await import('../../../src/evaluate/evaluator');
    const report = await evaluateVideo({
      videoPath: '/tmp/test.mp4',
      profile: 'portrait',
      thresholds: {},
      checks: {
        validate: true,
        rate: true,
        captionQuality: true,
        score: false,
        temporalQuality: true,
        audioSignal: true,
      },
    });

    expect(report.overall).toBeDefined();
    expect(report.overall!.score).toBe(1);
    expect(report.overall!.label).toBe('good');
    expect(report.overall!.confidence).toBeGreaterThan(0);
    expect(report.overall!.confidence).toBeLessThanOrEqual(1);
  });

  it('produces a bad score when main checks fail', async () => {
    const { validateVideoPath } = await import('../../../src/validate/validate');
    (validateVideoPath as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      passed: false,
      summary: {
        width: 1080,
        height: 1920,
        durationSeconds: 47,
        videoCodec: 'h264',
        audioCodec: 'aac',
        container: 'mp4',
      },
      gates: [],
    });

    const { evaluateVideo } = await import('../../../src/evaluate/evaluator');
    const report = await evaluateVideo({
      videoPath: '/tmp/test.mp4',
      profile: 'portrait',
      thresholds: { minSyncRating: 99 },
      checks: {
        validate: true,
        rate: true,
        captionQuality: true,
        score: false,
        temporalQuality: false,
        audioSignal: false,
      },
    });

    expect(report.overall).toBeDefined();
    expect(report.overall!.score).toBeLessThan(1);
    expect(report.passed).toBe(false);
  });

  it('has higher confidence with more active checks', async () => {
    const { evaluateVideo } = await import('../../../src/evaluate/evaluator');

    const few = await evaluateVideo({
      videoPath: '/tmp/test.mp4',
      profile: 'portrait',
      thresholds: {},
      checks: {
        validate: true,
        rate: false,
        captionQuality: false,
        score: false,
        temporalQuality: false,
        audioSignal: false,
      },
    });

    const many = await evaluateVideo({
      videoPath: '/tmp/test.mp4',
      profile: 'portrait',
      thresholds: {},
      checks: {
        validate: true,
        rate: true,
        captionQuality: true,
        score: false,
        temporalQuality: true,
        audioSignal: true,
      },
    });

    expect(many.overall!.confidence).toBeGreaterThan(few.overall!.confidence);
  });
});
