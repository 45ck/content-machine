import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('PiqBrisqueAnalyzer', () => {
  it('parses BRISQUE results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      brisque: { mean: 32.5, min: 20, max: 45 },
      framesAnalyzed: 120,
    });

    const { PiqBrisqueAnalyzer } = await import('../../../src/validate/quality');
    const analyzer = new PiqBrisqueAnalyzer({ scriptPath: '/tmp/quality.py' });
    const summary = await analyzer.analyze('video.mp4', { sampleRate: 10 });

    expect(summary.brisque.mean).toBe(32.5);
    expect(summary.framesAnalyzed).toBe(120);
    expect(summary.niqe).toBeUndefined();
    expect(summary.cambi).toBeUndefined();
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--sample-rate', '10'],
      })
    );
  });

  it('parses BRISQUE + NIQE + CAMBI from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      brisque: { mean: 32.5, min: 20, max: 45 },
      niqe: { mean: 5.2, min: 3.1, max: 7.8 },
      cambi: { mean: 2.1, max: 4.5 },
      framesAnalyzed: 120,
    });

    const { PiqBrisqueAnalyzer } = await import('../../../src/validate/quality');
    const analyzer = new PiqBrisqueAnalyzer({ scriptPath: '/tmp/quality.py' });
    const summary = await analyzer.analyze('video.mp4', { sampleRate: 10 });

    expect(summary.brisque.mean).toBe(32.5);
    expect(summary.niqe).toEqual({ mean: 5.2, min: 3.1, max: 7.8 });
    expect(summary.cambi).toEqual({ mean: 2.1, max: 4.5 });
    expect(summary.framesAnalyzed).toBe(120);
  });

  it('rejects invalid quality JSON payloads', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { PiqBrisqueAnalyzer } = await import('../../../src/validate/quality');
    const analyzer = new PiqBrisqueAnalyzer({ scriptPath: '/tmp/quality.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('runVisualQualityGate', () => {
  it('includes NIQE/CAMBI in gate details when present', async () => {
    const { runVisualQualityGate } = await import('../../../src/validate/quality');
    const result = runVisualQualityGate(
      {
        brisque: { mean: 30, min: 20, max: 40 },
        niqe: { mean: 5.0, min: 3.0, max: 7.0 },
        cambi: { mean: 2.0, max: 3.5 },
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
        brisqueMax: 40,
        niqeMax: 8,
        cambiMax: 5,
      }
    );

    expect(result.passed).toBe(true);
    expect(result.details.niqe).toEqual({ mean: 5.0, min: 3.0, max: 7.0 });
    expect(result.details.cambi).toEqual({ mean: 2.0, max: 3.5 });
  });

  it('fails when NIQE exceeds threshold', async () => {
    const { runVisualQualityGate } = await import('../../../src/validate/quality');
    const result = runVisualQualityGate(
      {
        brisque: { mean: 30, min: 20, max: 40 },
        niqe: { mean: 9.5, min: 7.0, max: 12.0 },
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
        brisqueMax: 40,
        niqeMax: 8,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain('NIQE mean');
  });

  it('fails when CAMBI exceeds threshold', async () => {
    const { runVisualQualityGate } = await import('../../../src/validate/quality');
    const result = runVisualQualityGate(
      {
        brisque: { mean: 30, min: 20, max: 40 },
        cambi: { mean: 6.0, max: 8.0 },
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
        brisqueMax: 40,
        cambiMax: 5,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.message).toContain('CAMBI mean');
  });

  it('passes when NIQE/CAMBI data absent even with thresholds set', async () => {
    const { runVisualQualityGate } = await import('../../../src/validate/quality');
    const result = runVisualQualityGate(
      {
        brisque: { mean: 30, min: 20, max: 40 },
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
        brisqueMax: 40,
        niqeMax: 8,
        cambiMax: 5,
      }
    );

    expect(result.passed).toBe(true);
  });
});
