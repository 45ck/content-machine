import { describe, expect, it, vi } from 'vitest';
import { evaluateBatch } from '../../../src/evaluate/batch';

const makeReport = (videoPath: string, passed: boolean) => ({
  schemaVersion: '1.0.0' as const,
  videoPath,
  passed,
  checks: [],
  thresholds: { validateProfile: 'portrait' as const },
  totalDurationMs: 100,
  createdAt: '2024-01-01T00:00:00Z',
});

vi.mock('../../../src/evaluate/evaluator', () => ({
  evaluateVideo: vi.fn().mockImplementation((opts: { videoPath: string }) => {
    if (opts.videoPath === '/tmp/fail.mp4') {
      return Promise.resolve(makeReport(opts.videoPath, false));
    }
    if (opts.videoPath === '/tmp/error.mp4') {
      return Promise.reject(new Error('ffprobe failed'));
    }
    return Promise.resolve(makeReport(opts.videoPath, true));
  }),
}));

const baseConfig = {
  profile: 'portrait' as const,
  thresholds: { validateProfile: 'portrait' as const },
  checks: { validate: true, score: true },
  fps: 1,
};

describe('evaluateBatch', () => {
  it('returns 0 passed/failed for empty videos array', async () => {
    const result = await evaluateBatch({ ...baseConfig, videos: [] });
    expect(result.totalPassed).toBe(0);
    expect(result.totalFailed).toBe(0);
    expect(result.reports).toHaveLength(0);
    expect(result.schemaVersion).toBe('1.0.0');
  });

  it('returns correct counts for a single passing video', async () => {
    const result = await evaluateBatch({
      ...baseConfig,
      videos: [{ videoPath: '/tmp/test.mp4' }],
    });
    expect(result.totalPassed).toBe(1);
    expect(result.totalFailed).toBe(0);
    expect(result.reports).toHaveLength(1);
  });

  it('returns correct counts for mixed pass/fail results', async () => {
    const result = await evaluateBatch({
      ...baseConfig,
      videos: [
        { videoPath: '/tmp/test.mp4' },
        { videoPath: '/tmp/fail.mp4' },
        { videoPath: '/tmp/test2.mp4' },
      ],
    });
    expect(result.totalPassed).toBe(2);
    expect(result.totalFailed).toBe(1);
    expect(result.reports).toHaveLength(3);
  });

  it('error in one video does not abort the batch', async () => {
    const result = await evaluateBatch({
      ...baseConfig,
      videos: [
        { videoPath: '/tmp/test.mp4' },
        { videoPath: '/tmp/error.mp4' },
        { videoPath: '/tmp/test2.mp4' },
      ],
    });
    expect(result.reports).toHaveLength(3);
    expect(result.totalPassed).toBe(2);
    expect(result.totalFailed).toBe(1);
    // The errored video should be marked as failed
    expect(result.reports[1].passed).toBe(false);
    expect(result.reports[1].videoPath).toBe('/tmp/error.mp4');
  });

  it('includes timing info', async () => {
    const result = await evaluateBatch({
      ...baseConfig,
      videos: [{ videoPath: '/tmp/test.mp4' }],
    });
    expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    expect(result.createdAt).toBeTruthy();
    expect(typeof result.createdAt).toBe('string');
  });
});
