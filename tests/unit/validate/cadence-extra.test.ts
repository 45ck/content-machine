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

  it('passes crop filters through to ffmpeg when requested', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb?.(null, '', 'pts_time:1.00');
    });

    const { detectSceneCutsWithFfmpeg } = await import('../../../src/validate/cadence');
    await detectSceneCutsWithFfmpeg({
      videoPath: 'video.mp4',
      cropFilter: 'crop=iw:floor(ih/2):0:0',
    });

    expect(execFileMock).toHaveBeenCalledWith(
      'ffmpeg',
      expect.arrayContaining([
        '-vf',
        "crop=iw:floor(ih/2):0:0,select='gt(scene\\,0.3)',showinfo",
      ]),
      expect.any(Object),
      expect.any(Function)
    );
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

  it('fails static single-scene output with an explicit error', async () => {
    detectSceneCutsWithPySceneDetectMock.mockResolvedValue([]);

    const { runCadenceGate } = await import('../../../src/validate/cadence');
    const gate = await runCadenceGate(
      {
        path: 'video.mp4',
        width: 1080,
        height: 1920,
        durationSeconds: 42,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
      },
      { engine: 'pyscenedetect', maxMedianCutIntervalSeconds: 4 }
    );

    expect(gate.passed).toBe(false);
    expect(gate.severity).toBe('error');
    expect(gate.message).toContain('Cadence too static');
    expect(gate.message).toContain('single-scene/default-background');
  });

  it('rescues split-screen cadence by checking the top and bottom halves', async () => {
    execFileMock
      .mockImplementationOnce((_cmd, _args, _opts, cb) => {
        cb?.(null, '', '');
      })
      .mockImplementationOnce((_cmd, _args, _opts, cb) => {
        cb?.(null, '', '');
      })
      .mockImplementationOnce((_cmd, _args, _opts, cb) => {
        cb?.(null, '', 'pts_time:4.0 pts_time:8.0 pts_time:12.0');
      })
      .mockImplementationOnce((_cmd, _args, _opts, cb) => {
        cb?.(null, '', '');
      });

    const { runCadenceGate } = await import('../../../src/validate/cadence');
    const gate = await runCadenceGate(
      {
        path: 'video.mp4',
        width: 1080,
        height: 1920,
        durationSeconds: 16,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
      },
      { engine: 'ffmpeg', maxMedianCutIntervalSeconds: 5 }
    );

    expect(gate.passed).toBe(true);
    expect(gate.details.cutCount).toBe(3);
    expect(execFileMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('retries ffmpeg cadence detection with lower thresholds before failing', async () => {
    execFileMock
      .mockImplementationOnce((_cmd, _args, _opts, cb) => {
        cb?.(null, '', '');
      })
      .mockImplementationOnce((_cmd, _args, _opts, cb) => {
        cb?.(null, '', 'pts_time:6.0 pts_time:12.0 pts_time:18.0 pts_time:24.0');
      });

    const { runCadenceGate } = await import('../../../src/validate/cadence');
    const gate = await runCadenceGate(
      {
        path: 'video.mp4',
        width: 1080,
        height: 1920,
        durationSeconds: 30,
        container: 'mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
      },
      { engine: 'ffmpeg', maxMedianCutIntervalSeconds: 7 }
    );

    expect(gate.passed).toBe(true);
    expect(gate.details.cutCount).toBe(4);
    expect(execFileMock).toHaveBeenCalledTimes(2);
    expect(execFileMock.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['-vf', "select='gt(scene\\,0.3)',showinfo"])
    );
    expect(execFileMock.mock.calls[1]?.[1]).toEqual(
      expect.arrayContaining(['-vf', "select='gt(scene\\,0.2)',showinfo"])
    );
  });
});
