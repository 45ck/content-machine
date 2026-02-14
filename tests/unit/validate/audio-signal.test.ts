import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('FfmpegAudioAnalyzer', () => {
  it('parses audio signal results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      loudnessLUFS: -14.2,
      truePeakDBFS: -1.5,
      loudnessRange: 8.0,
      clippingRatio: 0.001,
      peakLevelDB: -1.2,
      snrDB: 25,
    });

    const { FfmpegAudioAnalyzer } = await import('../../../src/validate/audio-signal');
    const analyzer = new FfmpegAudioAnalyzer({ scriptPath: '/tmp/audio_quality.py' });
    const summary = await analyzer.analyze('video.mp4');

    expect(summary.loudnessLUFS).toBe(-14.2);
    expect(summary.truePeakDBFS).toBe(-1.5);
    expect(summary.clippingRatio).toBe(0.001);
    expect(summary.snrDB).toBe(25);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--media', 'video.mp4'],
      })
    );
  });

  it('rejects invalid audio signal JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { FfmpegAudioAnalyzer } = await import('../../../src/validate/audio-signal');
    const analyzer = new FfmpegAudioAnalyzer({ scriptPath: '/tmp/audio_quality.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('runAudioSignalGate', () => {
  it('passes when all audio metrics are within thresholds', async () => {
    const { runAudioSignalGate } = await import('../../../src/validate/audio-signal');
    const result = runAudioSignalGate(
      {
        loudnessLUFS: -14.2,
        truePeakDBFS: -1.5,
        loudnessRange: 8.0,
        clippingRatio: 0.0,
        peakLevelDB: -1.2,
        snrDB: 25,
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
        loudnessMinLUFS: -24,
        loudnessMaxLUFS: -8,
        maxClippingRatio: 0.01,
        truePeakMaxDBFS: -1,
      }
    );

    expect(result.passed).toBe(true);
    expect(result.gateId).toBe('audio-signal');
  });

  it('fails when audio is too quiet', async () => {
    const { runAudioSignalGate } = await import('../../../src/validate/audio-signal');
    const result = runAudioSignalGate(
      {
        loudnessLUFS: -30,
        truePeakDBFS: -10,
        loudnessRange: 8.0,
        clippingRatio: 0.0,
        peakLevelDB: -10,
        snrDB: 25,
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
        loudnessMinLUFS: -24,
        loudnessMaxLUFS: -8,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain('too quiet');
  });

  it('fails when audio is too loud', async () => {
    const { runAudioSignalGate } = await import('../../../src/validate/audio-signal');
    const result = runAudioSignalGate(
      {
        loudnessLUFS: -5,
        truePeakDBFS: 0,
        loudnessRange: 8.0,
        clippingRatio: 0.0,
        peakLevelDB: 0,
        snrDB: 25,
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
        loudnessMinLUFS: -24,
        loudnessMaxLUFS: -8,
        truePeakMaxDBFS: -1,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain('too loud');
  });

  it('fails when clipping ratio exceeds threshold', async () => {
    const { runAudioSignalGate } = await import('../../../src/validate/audio-signal');
    const result = runAudioSignalGate(
      {
        loudnessLUFS: -14,
        truePeakDBFS: -1.5,
        loudnessRange: 8.0,
        clippingRatio: 0.05,
        peakLevelDB: -1.2,
        snrDB: 25,
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
        maxClippingRatio: 0.01,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain('clipping ratio');
  });

  it('uses default thresholds when profile has none', async () => {
    const { runAudioSignalGate } = await import('../../../src/validate/audio-signal');
    const result = runAudioSignalGate(
      {
        loudnessLUFS: -14,
        truePeakDBFS: -2,
        loudnessRange: 8.0,
        clippingRatio: 0.0,
        peakLevelDB: -2,
        snrDB: 25,
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
    expect(result.details.loudnessMinLUFS).toBe(-24);
    expect(result.details.loudnessMaxLUFS).toBe(-8);
  });
});
