import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('FreezeAnalyzer', () => {
  it('parses freeze detection results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      freezeEvents: 3,
      blackFrames: 10,
      freezeRatio: 0.05,
      blackRatio: 0.02,
      totalFrames: 500,
    });

    const { FreezeAnalyzer } = await import('../../../src/validate/freeze');
    const analyzer = new FreezeAnalyzer({ scriptPath: '/tmp/freeze_detect.py' });
    const summary = await analyzer.analyze('video.mp4');

    expect(summary.freezeEvents).toBe(3);
    expect(summary.blackFrames).toBe(10);
    expect(summary.freezeRatio).toBe(0.05);
    expect(summary.blackRatio).toBe(0.02);
    expect(summary.totalFrames).toBe(500);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4'],
      })
    );
  });

  it('rejects invalid freeze detection JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { FreezeAnalyzer } = await import('../../../src/validate/freeze');
    const analyzer = new FreezeAnalyzer({ scriptPath: '/tmp/freeze_detect.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});

describe('runFreezeGate', () => {
  it('passes when ratios are within thresholds', async () => {
    const { runFreezeGate } = await import('../../../src/validate/freeze');
    const result = runFreezeGate({
      freezeEvents: 2,
      blackFrames: 5,
      freezeRatio: 0.05,
      blackRatio: 0.01,
      totalFrames: 500,
    });

    expect(result.passed).toBe(true);
    expect(result.gateId).toBe('freeze');
    expect(result.severity).toBe('warning');
    expect(result.details.freezeRatio).toBe(0.05);
    expect(result.details.blackRatio).toBe(0.01);
  });

  it('fails when freeze ratio is too high', async () => {
    const { runFreezeGate } = await import('../../../src/validate/freeze');
    const result = runFreezeGate({
      freezeEvents: 100,
      blackFrames: 5,
      freezeRatio: 0.25,
      blackRatio: 0.01,
      totalFrames: 500,
    });

    expect(result.passed).toBe(false);
    expect(result.message).toContain('freeze ratio');
    expect(result.message).toContain('25.0%');
  });

  it('fails when black ratio is too high', async () => {
    const { runFreezeGate } = await import('../../../src/validate/freeze');
    const result = runFreezeGate({
      freezeEvents: 2,
      blackFrames: 50,
      freezeRatio: 0.05,
      blackRatio: 0.1,
      totalFrames: 500,
    });

    expect(result.passed).toBe(false);
    expect(result.message).toContain('black ratio');
    expect(result.message).toContain('10.0%');
  });

  it('uses default thresholds when not provided', async () => {
    const { runFreezeGate } = await import('../../../src/validate/freeze');
    const result = runFreezeGate({
      freezeEvents: 2,
      blackFrames: 5,
      freezeRatio: 0.05,
      blackRatio: 0.01,
      totalFrames: 500,
    });

    expect(result.passed).toBe(true);
    expect(result.details.maxFreezeRatio).toBe(0.15);
    expect(result.details.maxBlackRatio).toBe(0.05);
  });

  it('respects custom thresholds', async () => {
    const { runFreezeGate } = await import('../../../src/validate/freeze');
    const result = runFreezeGate(
      {
        freezeEvents: 2,
        blackFrames: 5,
        freezeRatio: 0.08,
        blackRatio: 0.01,
        totalFrames: 500,
      },
      {
        maxFreezeRatio: 0.05,
        maxBlackRatio: 0.02,
      }
    );

    expect(result.passed).toBe(false);
    expect(result.details.maxFreezeRatio).toBe(0.05);
    expect(result.message).toContain('freeze ratio');
  });
});
