import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promisify } from 'node:util';

const execFileMock = vi.fn();
execFileMock[promisify.custom] = (cmd: string, args: string[], options: Record<string, unknown>) =>
  new Promise((resolve, reject) => {
    execFileMock(cmd, args, options, (error: unknown, stdout: string, stderr: string) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
const detectSceneCutsWithPySceneDetectMock = vi.fn();

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

vi.mock('../../../src/validate/scene-detect', () => ({
  detectSceneCutsWithPySceneDetect: detectSceneCutsWithPySceneDetectMock,
}));

describe('cadence detection', () => {
  beforeEach(() => {
    execFileMock.mockReset();
    detectSceneCutsWithPySceneDetectMock.mockReset();
  });

  it('extracts cut times from ffmpeg stderr', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb?.(null, '', 'pts_time:0.50 other pts_time:1.25 pts_time:2.50');
    });

    const { detectSceneCutsWithFfmpeg } = await import('../../../src/validate/cadence');
    const cuts = await detectSceneCutsWithFfmpeg({ videoPath: 'video.mp4' });

    expect(cuts).toEqual([0.5, 1.25, 2.5]);
  });

  it('throws when ffmpeg is missing', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      const err = new Error('missing');
      (err as NodeJS.ErrnoException).code = 'ENOENT';
      cb?.(err, '', '');
    });

    const { detectSceneCutsWithFfmpeg } = await import('../../../src/validate/cadence');
    await expect(detectSceneCutsWithFfmpeg({ videoPath: 'video.mp4' })).rejects.toMatchObject({
      code: 'DEPENDENCY_MISSING',
    });
  });

  it('runs cadence gate with pyscenedetect engine', async () => {
    detectSceneCutsWithPySceneDetectMock.mockResolvedValue([1, 2, 3]);

    const { runCadenceGate } = await import('../../../src/validate/cadence');
    const gate = await runCadenceGate(
      {
        path: 'video.mp4',
        width: 1080,
        height: 1920,
        durationSeconds: 6,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
      },
      { engine: 'pyscenedetect', maxMedianCutIntervalSeconds: 4 }
    );

    expect(gate.gateId).toBe('cadence');
    expect(gate.details.cutCount).toBe(3);
  });
});
