import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('HuggingFaceVideoRewardAnalyzer', () => {
  it('parses VideoReward results from python JSON', async () => {
    runPythonJsonMock.mockResolvedValue({
      score: 0.72,
      method: 'videoreward',
    });

    const { HuggingFaceVideoRewardAnalyzer } = await import('../../../src/score/video-reward');
    const analyzer = new HuggingFaceVideoRewardAnalyzer({ scriptPath: '/tmp/video_reward.py' });
    const result = await analyzer.analyze('video.mp4', 'amazing video content');

    expect(result.score).toBe(0.72);
    expect(result.method).toBe('videoreward');
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--prompt', 'amazing video content'],
      })
    );
  });

  it('handles fallback results', async () => {
    runPythonJsonMock.mockResolvedValue({
      score: 0.5,
      method: 'fallback',
      reason: 'model_unavailable',
    });

    const { HuggingFaceVideoRewardAnalyzer } = await import('../../../src/score/video-reward');
    const analyzer = new HuggingFaceVideoRewardAnalyzer({ scriptPath: '/tmp/video_reward.py' });
    const result = await analyzer.analyze('video.mp4');

    expect(result.score).toBe(0.5);
    expect(result.method).toBe('fallback');
    expect(result.reason).toBe('model_unavailable');
  });

  it('rejects invalid video reward JSON', async () => {
    runPythonJsonMock.mockResolvedValue({});
    const { HuggingFaceVideoRewardAnalyzer } = await import('../../../src/score/video-reward');
    const analyzer = new HuggingFaceVideoRewardAnalyzer({ scriptPath: '/tmp/video_reward.py' });

    await expect(analyzer.analyze('video.mp4')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    });
  });
});
