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
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--sample-rate', '10'],
      })
    );
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
