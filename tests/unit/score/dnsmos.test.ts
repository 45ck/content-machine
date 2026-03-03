import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('DnsmosAnalyzer', () => {
  it('parses DNSMOS results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      ovrl_mos: 3.85,
      sig_mos: 4.12,
      bak_mos: 3.95,
    });

    const { DnsmosAnalyzer } = await import('../../../src/score/dnsmos');
    const analyzer = new DnsmosAnalyzer({ scriptPath: '/tmp/dnsmos_score.py' });
    const result = await analyzer.analyze('video.mp4');

    expect(result.ovrlMos).toBe(3.85);
    expect(result.sigMos).toBe(4.12);
    expect(result.bakMos).toBe(3.95);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4'],
      })
    );
  });

  it('rejects invalid DNSMOS JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { DnsmosAnalyzer } = await import('../../../src/score/dnsmos');
    const analyzer = new DnsmosAnalyzer({ scriptPath: '/tmp/dnsmos_score.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects when ovrl_mos is missing', async () => {
    runPythonJsonMock.mockResolvedValue({
      sig_mos: 4.12,
      bak_mos: 3.95,
    });
    const { DnsmosAnalyzer } = await import('../../../src/score/dnsmos');
    const analyzer = new DnsmosAnalyzer({ scriptPath: '/tmp/dnsmos_score.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects when sig_mos is missing', async () => {
    runPythonJsonMock.mockResolvedValue({
      ovrl_mos: 3.85,
      bak_mos: 3.95,
    });
    const { DnsmosAnalyzer } = await import('../../../src/score/dnsmos');
    const analyzer = new DnsmosAnalyzer({ scriptPath: '/tmp/dnsmos_score.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects when bak_mos is missing', async () => {
    runPythonJsonMock.mockResolvedValue({
      ovrl_mos: 3.85,
      sig_mos: 4.12,
    });
    const { DnsmosAnalyzer } = await import('../../../src/score/dnsmos');
    const analyzer = new DnsmosAnalyzer({ scriptPath: '/tmp/dnsmos_score.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
