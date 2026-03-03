import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('detectSceneCutsWithPySceneDetect', () => {
  it('invokes python and returns cut times', async () => {
    runPythonJsonMock.mockResolvedValue({
      detector: 'pyscenedetect',
      cutTimesSeconds: [0.25, 1.0, 1.75],
    });

    const { detectSceneCutsWithPySceneDetect } = await import('../../../src/validate/scene-detect');
    const result = await detectSceneCutsWithPySceneDetect({
      videoPath: 'video.mp4',
      threshold: 25,
      pythonPath: '/usr/bin/python',
    });

    expect(result).toEqual([0.25, 1.0, 1.75]);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--threshold', '25'],
      })
    );
  });
});
