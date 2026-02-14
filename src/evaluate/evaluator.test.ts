import { describe, expect, it, vi } from 'vitest';
import { evaluateVideo } from './evaluator';

// Mock all scoring modules
vi.mock('../validate/validate', () => ({
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

vi.mock('../score/sync-rater', () => ({
  rateSyncQuality: vi.fn().mockResolvedValue({
    rating: 87,
    ratingLabel: 'good',
    passed: true,
    metrics: { meanDriftMs: 142 },
    captionQuality: { overall: 0.82 },
  }),
  rateCaptionQuality: vi.fn().mockResolvedValue({
    captionQuality: {
      overall: 0.82,
      subscores: { coverage: { score: 0.89 } },
    },
  }),
}));

vi.mock('../score/scorer', () => ({
  scoreScript: vi.fn().mockReturnValue({
    passed: true,
    overall: 0.85,
  }),
}));

vi.mock('../validate/temporal', () => ({
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
    message: 'Temporal quality OK',
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

vi.mock('../validate/freeze', () => ({
  FreezeAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      freezeEvents: 0,
      blackFrames: 0,
      freezeRatio: 0.0,
      blackRatio: 0.0,
      totalFrames: 100,
    }),
  })),
  runFreezeGate: vi.fn().mockReturnValue({
    gateId: 'freeze',
    passed: true,
    severity: 'warning',
    fix: 'none',
    message: 'Freeze detection OK',
    details: {
      freezeRatio: 0.0,
      blackRatio: 0.0,
      freezeEvents: 0,
      blackFrames: 0,
      totalFrames: 100,
      maxFreezeRatio: 0.15,
      maxBlackRatio: 0.05,
    },
  }),
}));

vi.mock('../validate/flow-consistency', () => ({
  FlowConsistencyAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      meanWarpError: 0.05,
      maxWarpError: 0.12,
      frameErrors: [],
      framesAnalyzed: 30,
    }),
  })),
  runFlowConsistencyGate: vi.fn().mockReturnValue({
    gateId: 'flow-consistency',
    passed: true,
    severity: 'warning',
    fix: 'none',
    message: 'Flow consistency OK',
    details: {
      meanWarpError: 0.05,
      maxWarpError: 0.12,
      framesAnalyzed: 30,
      maxMeanWarpError: 0.15,
    },
  }),
}));

vi.mock('../score/dnsmos', () => ({
  DnsmosAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      ovrlMos: 3.8,
      sigMos: 3.9,
      bakMos: 4.1,
    }),
  })),
}));

vi.mock('../validate/audio-signal', () => ({
  FfmpegAudioAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      loudnessLUFS: -14.2,
      truePeakDBFS: -1.5,
      loudnessRange: 8.0,
      clippingRatio: 0.0,
      peakLevelDB: -1.2,
      snrDB: 25,
    }),
  })),
  runAudioSignalGate: vi.fn().mockReturnValue({
    gateId: 'audio-signal',
    passed: true,
    severity: 'warning',
    fix: 'none',
    message: 'Audio signal OK',
    details: {
      loudnessLUFS: -14.2,
      truePeakDBFS: -1.5,
      loudnessRange: 8.0,
      clippingRatio: 0.0,
      snrDB: 25,
      loudnessMinLUFS: -24,
      loudnessMaxLUFS: -8,
      maxClippingRatio: 0.01,
      truePeakMaxDBFS: -1,
    },
  }),
}));

const baseOptions = {
  videoPath: '/tmp/test.mp4',
  profile: 'portrait' as const,
  thresholds: { validateProfile: 'portrait' as const },
  checks: { validate: true, rate: true, captionQuality: true, score: true },
};

describe('evaluateVideo', () => {
  it('runs all checks and returns PASS', async () => {
    const report = await evaluateVideo(baseOptions);
    expect(report.passed).toBe(true);
    expect(report.schemaVersion).toBe('1.0.0');
    expect(report.checks.length).toBe(11);
  });

  it('skips score when no script provided', async () => {
    const report = await evaluateVideo(baseOptions);
    const scoreCheck = report.checks.find((c) => c.checkId === 'score');
    expect(scoreCheck?.skipped).toBe(true);
    expect(scoreCheck?.summary).toContain('no script');
  });

  it('skips captionQuality when rate is enabled (rate includes it)', async () => {
    const report = await evaluateVideo(baseOptions);
    const cqCheck = report.checks.find((c) => c.checkId === 'captionQuality');
    expect(cqCheck?.skipped).toBe(true);
    expect(cqCheck?.summary).toContain('included in rate');
  });

  it('runs standalone captionQuality when rate is disabled', async () => {
    const report = await evaluateVideo({
      ...baseOptions,
      checks: { validate: true, rate: false, captionQuality: true, score: false },
    });
    const cqCheck = report.checks.find((c) => c.checkId === 'captionQuality');
    expect(cqCheck?.skipped).toBe(false);
  });

  it('enforces minSyncRating threshold', async () => {
    const report = await evaluateVideo({
      ...baseOptions,
      thresholds: { validateProfile: 'portrait', minSyncRating: 99 },
    });
    const rateCheck = report.checks.find((c) => c.checkId === 'rate');
    expect(rateCheck?.passed).toBe(false);
    expect(report.passed).toBe(false);
  });

  it('passes when sync rating meets threshold', async () => {
    const report = await evaluateVideo({
      ...baseOptions,
      thresholds: { validateProfile: 'portrait', minSyncRating: 80 },
    });
    const rateCheck = report.checks.find((c) => c.checkId === 'rate');
    expect(rateCheck?.passed).toBe(true);
  });

  it('marks disabled checks as skipped', async () => {
    const report = await evaluateVideo({
      ...baseOptions,
      checks: {
        validate: false,
        rate: false,
        captionQuality: false,
        score: false,
        temporalQuality: false,
        audioSignal: false,
      },
    });
    expect(report.checks.every((c) => c.skipped)).toBe(true);
    expect(report.passed).toBe(true);
  });

  it('continues after check error', async () => {
    const { validateVideoPath } = await import('../validate/validate');
    (validateVideoPath as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('ffprobe not found')
    );

    const report = await evaluateVideo({
      ...baseOptions,
      checks: { validate: true, rate: true, captionQuality: false, score: false },
    });

    const validateCheck = report.checks.find((c) => c.checkId === 'validate');
    expect(validateCheck?.passed).toBe(false);
    expect(validateCheck?.error).toContain('ffprobe not found');

    // rate should still have run
    const rateCheck = report.checks.find((c) => c.checkId === 'rate');
    expect(rateCheck?.skipped).toBe(false);
  });

  it('includes timing info', async () => {
    const report = await evaluateVideo(baseOptions);
    expect(report.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(report.createdAt).toBeTruthy();
    for (const c of report.checks) {
      expect(c.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
