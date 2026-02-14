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
});
