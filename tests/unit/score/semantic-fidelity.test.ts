import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('ClipSemanticAnalyzer', () => {
  it('parses CLIP similarity results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      clipScore: { mean: 0.28, min: 0.15, p10: 0.19 },
      scenesEvaluated: 5,
      framesAnalyzed: 16,
    });

    const { ClipSemanticAnalyzer } = await import('../../../src/score/semantic-fidelity');
    const analyzer = new ClipSemanticAnalyzer({ scriptPath: '/tmp/semantic.py' });
    const result = await analyzer.analyze('video.mp4', 'script.json');

    expect(result.clipScore.mean).toBe(0.28);
    expect(result.clipScore.min).toBe(0.15);
    expect(result.clipScore.p10).toBe(0.19);
    expect(result.scenesEvaluated).toBe(5);
    expect(result.framesAnalyzed).toBe(16);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--script', 'script.json', '--max-frames', '16'],
      })
    );
  });

  it('rejects invalid semantic fidelity JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { ClipSemanticAnalyzer } = await import('../../../src/score/semantic-fidelity');
    const analyzer = new ClipSemanticAnalyzer({ scriptPath: '/tmp/semantic.py' });

    await expect(analyzer.analyze('video.mp4', 'script.json')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });

  it('rejects when clipScore is missing', async () => {
    runPythonJsonMock.mockResolvedValue({ scenesEvaluated: 5, framesAnalyzed: 16 });
    const { ClipSemanticAnalyzer } = await import('../../../src/score/semantic-fidelity');
    const analyzer = new ClipSemanticAnalyzer({ scriptPath: '/tmp/semantic.py' });

    await expect(analyzer.analyze('video.mp4', 'script.json')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
