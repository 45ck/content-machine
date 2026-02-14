import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('HuggingFaceImageRewardAnalyzer', () => {
  it('parses ImageReward results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      meanScore: 0.78,
      minScore: 0.65,
      maxScore: 0.91,
      framesScored: 8,
      method: 'imagereward',
    });

    const { HuggingFaceImageRewardAnalyzer } = await import('../../../src/score/image-reward');
    const analyzer = new HuggingFaceImageRewardAnalyzer({ scriptPath: '/tmp/image_reward.py' });
    const result = await analyzer.analyze('video.mp4', 'high quality image');

    expect(result.meanScore).toBe(0.78);
    expect(result.minScore).toBe(0.65);
    expect(result.maxScore).toBe(0.91);
    expect(result.framesScored).toBe(8);
    expect(result.method).toBe('imagereward');
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--num-frames', '8', '--prompt', 'high quality image'],
      })
    );
  });

  it('handles fallback results', async () => {
    runPythonJsonMock.mockResolvedValue({
      meanScore: 0.5,
      minScore: 0.5,
      maxScore: 0.5,
      framesScored: 8,
      method: 'fallback',
      reason: 'model_unavailable',
    });

    const { HuggingFaceImageRewardAnalyzer } = await import('../../../src/score/image-reward');
    const analyzer = new HuggingFaceImageRewardAnalyzer({ scriptPath: '/tmp/image_reward.py' });
    const result = await analyzer.analyze('video.mp4');

    expect(result.meanScore).toBe(0.5);
    expect(result.method).toBe('fallback');
    expect(result.reason).toBe('model_unavailable');
  });

  it('rejects invalid image reward JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { HuggingFaceImageRewardAnalyzer } = await import('../../../src/score/image-reward');
    const analyzer = new HuggingFaceImageRewardAnalyzer({ scriptPath: '/tmp/image_reward.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
