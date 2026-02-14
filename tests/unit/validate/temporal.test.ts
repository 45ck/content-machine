import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('TemporalAnalyzer', () => {
  it('parses temporal quality results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      flicker: { score: 0.85, variance: 2.5, meanDiff: 4.5 },
      duplicateFrameRatio: 0.05,
      framesAnalyzed: 300,
    });

    const { TemporalAnalyzer } = await import('../../../src/validate/temporal');
    const analyzer = new TemporalAnalyzer({ scriptPath: '/tmp/temporal_quality.py' });
    const summary = await analyzer.analyze('video.mp4', { sampleRate: 2 });

    expect(summary.flicker.score).toBe(0.85);
    expect(summary.duplicateFrameRatio).toBe(0.05);
    expect(summary.framesAnalyzed).toBe(300);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--sample-rate', '2'],
      })
    );
  });

  it('rejects invalid temporal quality JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { TemporalAnalyzer } = await import('../../../src/validate/temporal');
    const analyzer = new TemporalAnalyzer({ scriptPath: '/tmp/temporal_quality.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('runTemporalQualityGate', () => {
  it('passes when flicker and duplicate ratio are within thresholds', async () => {
    const { runTemporalQualityGate } = await import('../../../src/validate/temporal');
    const result = runTemporalQualityGate(
      {
        flicker: { score: 0.9, variance: 1.0, meanDiff: 3.0 },
        duplicateFrameRatio: 0.1,
        framesAnalyzed: 100,
      },
      {
        id: 'portrait',
        width: 1080,
        height: 1920,
        minDurationSeconds: 30,
        maxDurationSeconds: 60,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        flickerMin: 0.5,
        maxDuplicateFrameRatio: 0.3,
      }
    );

    expect(result.passed).toBe(true);
    expect(result.gateId).toBe('temporal-quality');
    expect(result.details.flickerScore).toBe(0.9);
    expect(result.details.duplicateFrameRatio).toBe(0.1);
  });

  it('fails when flicker score is below threshold', async () => {
    const { runTemporalQualityGate } = await import('../../../src/validate/temporal');
    const result = runTemporalQualityGate(
      {
        flicker: { score: 0.3, variance: 50.0, meanDiff: 21.0 },
        duplicateFrameRatio: 0.1,
        framesAnalyzed: 100,
      },
      {
        id: 'portrait',
        width: 1080,
        height: 1920,
        minDurationSeconds: 30,
        maxDurationSeconds: 60,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        flickerMin: 0.5,
        maxDuplicateFrameRatio: 0.3,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain('flicker score');
  });

  it('fails when duplicate frame ratio exceeds threshold', async () => {
    const { runTemporalQualityGate } = await import('../../../src/validate/temporal');
    const result = runTemporalQualityGate(
      {
        flicker: { score: 0.9, variance: 1.0, meanDiff: 3.0 },
        duplicateFrameRatio: 0.5,
        framesAnalyzed: 100,
      },
      {
        id: 'portrait',
        width: 1080,
        height: 1920,
        minDurationSeconds: 30,
        maxDurationSeconds: 60,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        flickerMin: 0.5,
        maxDuplicateFrameRatio: 0.3,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain('duplicate frame ratio');
  });

  it('uses default thresholds when profile has none', async () => {
    const { runTemporalQualityGate } = await import('../../../src/validate/temporal');
    const result = runTemporalQualityGate(
      {
        flicker: { score: 0.9, variance: 1.0, meanDiff: 3.0 },
        duplicateFrameRatio: 0.1,
        framesAnalyzed: 100,
      },
      {
        id: 'portrait',
        width: 1080,
        height: 1920,
        minDurationSeconds: 30,
        maxDurationSeconds: 60,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
      }
    );

    expect(result.passed).toBe(true);
    expect(result.details.flickerMin).toBe(0.5);
    expect(result.details.maxDuplicateFrameRatio).toBe(0.3);
  });
});
