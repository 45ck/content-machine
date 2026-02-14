import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('HuggingFaceInternVideoAnalyzer', () => {
  it('parses InternVideo results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      similarity: 0.85,
      method: 'internvideo2',
    });

    const { HuggingFaceInternVideoAnalyzer } = await import('../../../src/score/intern-video');
    const analyzer = new HuggingFaceInternVideoAnalyzer({ scriptPath: '/tmp/intern_video.py' });
    const result = await analyzer.analyze('video.mp4', 'a beautiful sunset');

    expect(result.similarity).toBe(0.85);
    expect(result.method).toBe('internvideo2');
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--text', 'a beautiful sunset'],
      })
    );
  });

  it('handles fallback results', async () => {
    runPythonJsonMock.mockResolvedValue({
      similarity: 0.5,
      method: 'fallback',
      reason: 'model_unavailable',
    });

    const { HuggingFaceInternVideoAnalyzer } = await import('../../../src/score/intern-video');
    const analyzer = new HuggingFaceInternVideoAnalyzer({ scriptPath: '/tmp/intern_video.py' });
    const result = await analyzer.analyze('video.mp4');

    expect(result.similarity).toBe(0.5);
    expect(result.method).toBe('fallback');
    expect(result.reason).toBe('model_unavailable');
  });

  it('rejects invalid InternVideo JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { HuggingFaceInternVideoAnalyzer } = await import('../../../src/score/intern-video');
    const analyzer = new HuggingFaceInternVideoAnalyzer({ scriptPath: '/tmp/intern_video.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
