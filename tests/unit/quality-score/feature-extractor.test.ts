import { describe, it, expect, vi } from 'vitest';

// Mock heavy dependencies to avoid needing actual video files
vi.mock('../../../src/score/sync-rater', () => ({
  rateSyncQuality: vi.fn().mockResolvedValue({
    rating: 75,
    ratingLabel: 'good',
    metrics: { meanDriftMs: 120, matchRatio: 0.8 },
  }),
}));

vi.mock('../../../src/validate/ffprobe', () => ({
  probeVideoWithFfprobe: vi.fn().mockResolvedValue({
    durationSeconds: 45.5,
    width: 1080,
    height: 1920,
    fps: 30,
  }),
}));

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: vi.fn().mockResolvedValue({ embedding: new Array(512).fill(0.1) }),
}));

vi.mock('../../../src/score/pacing-quality', () => ({
  analyzePacingQuality: vi.fn().mockReturnValue({
    overallScore: 0.82,
    aggregate: { avgWpm: 150, coefficientOfVariation: 0.15 },
    scenes: [],
    issues: [],
  }),
}));

vi.mock('../../../src/score/audio-quality', () => ({
  analyzeAudioQuality: vi.fn().mockReturnValue({
    overallScore: 0.9,
    details: { pausesFound: 1, overlapsFound: 0 },
    issues: [],
  }),
}));

vi.mock('../../../src/score/engagement-quality', () => ({
  analyzeEngagementQuality: vi.fn().mockReturnValue({
    overallScore: 0.75,
    metrics: { hookTiming: 0.9, ctaPresence: 0.8, sceneProgression: 0.7 },
    issues: [],
  }),
}));

vi.mock('../../../src/validate/temporal', () => ({
  TemporalAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      flicker: { score: 0.9, variance: 0.01, meanDiff: 5 },
      duplicateFrameRatio: 0.03,
      framesAnalyzed: 100,
    }),
  })),
}));

vi.mock('../../../src/validate/freeze', () => ({
  FreezeAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      freezeRatio: 0.01,
      blackRatio: 0.0,
      freezeEvents: 0,
      blackFrames: 0,
      totalFrames: 900,
    }),
  })),
}));

vi.mock('../../../src/validate/audio-signal', () => ({
  FfmpegAudioAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      loudnessLUFS: -14.2,
      truePeakDBFS: -1.5,
      loudnessRange: 8,
      clippingRatio: 0.0,
      peakLevelDB: -2,
      snrDB: 30,
    }),
  })),
}));

vi.mock('../../../src/validate/flow-consistency', () => ({
  FlowConsistencyAnalyzer: vi.fn().mockImplementation(() => ({
    analyze: vi.fn().mockResolvedValue({
      meanWarpError: 0.08,
      maxWarpError: 0.25,
      frameErrors: [0.05, 0.08, 0.12],
      framesAnalyzed: 50,
    }),
  })),
}));

// Must mock node:fs at module level for existsSync/readFileSync used in loadTimestamps
const { mockExistsSync, mockReadFileSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn().mockReturnValue(false),
  mockReadFileSync: vi.fn().mockReturnValue('{}'),
}));
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, existsSync: mockExistsSync, readFileSync: mockReadFileSync };
});

import { extractFeatures } from '../../../src/quality-score/feature-extractor';

describe('extractFeatures', () => {
  it('should extract basic features from a video', async () => {
    const features = await extractFeatures({
      videoPath: '/tmp/test-video.mp4',
    });

    expect(features.videoId).toBe('test-video');
    expect(features.version).toBe('1.0.0');
    expect(features.extractedAt).toBeDefined();
    expect(features.metadata.durationS).toBe(45.5);
    expect(features.repoMetrics.syncRating).toBe(75);
  });

  it('should include CLIP embedding when requested', async () => {
    const features = await extractFeatures({
      videoPath: '/tmp/test-video.mp4',
      includeClip: true,
    });

    expect(features.clipEmbedding).toBeDefined();
    expect(features.clipEmbedding).toHaveLength(512);
  });

  it('should not include embeddings by default', async () => {
    const features = await extractFeatures({
      videoPath: '/tmp/test-video.mp4',
    });

    expect(features.clipEmbedding).toBeUndefined();
    expect(features.textEmbedding).toBeUndefined();
  });

  it('should load timestamps.json and populate pacing/audio metrics', async () => {
    const fakeTimestamps = {
      schemaVersion: '1.0.0',
      totalDuration: 1.0,
      ttsEngine: 'test',
      asrEngine: 'test',
      allWords: [
        { word: 'hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.6, end: 1.0 },
      ],
      scenes: [
        {
          sceneId: 'scene-0',
          audioStart: 0,
          audioEnd: 1.0,
          words: [
            { word: 'hello', start: 0, end: 0.5 },
            { word: 'world', start: 0.6, end: 1.0 },
          ],
        },
      ],
    };

    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(JSON.stringify(fakeTimestamps));

    const features = await extractFeatures({
      videoPath: '/tmp/test-video.mp4',
      timestampsPath: '/tmp/timestamps.json',
    });

    expect(features.repoMetrics.pacingScore).toBe(0.82);
    expect(features.repoMetrics.pacingAvgWpm).toBe(150);
    expect(features.repoMetrics.audioScore).toBe(0.9);
    expect(features.repoMetrics.audioGapCount).toBe(1);
  });

  it('should extract video-intrinsic metrics from analyzers', async () => {
    const features = await extractFeatures({
      videoPath: '/tmp/test-video.mp4',
    });

    expect(features.repoMetrics.temporalFlickerScore).toBe(0.9);
    expect(features.repoMetrics.temporalDuplicateRatio).toBe(0.03);
    expect(features.repoMetrics.freezeRatio).toBe(0.01);
    expect(features.repoMetrics.blackRatio).toBe(0.0);
    expect(features.repoMetrics.audioLoudnessLUFS).toBe(-14.2);
    expect(features.repoMetrics.audioClippingRatio).toBe(0.0);
    expect(features.repoMetrics.flowMeanWarpError).toBe(0.08);
  });

  it('should gracefully handle missing timestamps', async () => {
    mockExistsSync.mockReturnValue(false);

    const features = await extractFeatures({
      videoPath: '/tmp/test-video.mp4',
    });

    // Pacing/audio metrics should not be set
    expect(features.repoMetrics.pacingScore).toBeUndefined();
    expect(features.repoMetrics.audioScore).toBeUndefined();
  });
});
