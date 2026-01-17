import { describe, it, expect, vi } from 'vitest';

const runPythonJsonMock = vi.fn();

vi.mock('../../../src/validate/python-json', () => ({
  runPythonJson: runPythonJsonMock,
}));

describe('probeVideoWithPython', () => {
  it('passes ffprobe path and parses output', async () => {
    runPythonJsonMock.mockResolvedValue({
      width: 1280,
      height: 720,
      duration: 12,
      container: 'mp4',
      codec: 'h264',
      audioCodec: 'aac',
    });

    const { probeVideoWithPython } = await import('../../../src/validate/python-probe');
    const info = await probeVideoWithPython('video.mp4', { ffprobePath: '/usr/bin/ffprobe' });

    expect(info.width).toBe(1280);
    expect(runPythonJsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ['--video', 'video.mp4', '--ffprobe', '/usr/bin/ffprobe'],
      })
    );
  });

  it('throws on invalid python payloads', async () => {
    const { parsePythonVideoInfo } = await import('../../../src/validate/python-probe');

    expect(() =>
      parsePythonVideoInfo({ width: 'bad', height: 720, duration: 10 }, 'video.mp4')
    ).toThrowError();
    expect(() => parsePythonVideoInfo({ width: 1280, height: 720 }, 'video.mp4')).toThrowError();
  });
});
