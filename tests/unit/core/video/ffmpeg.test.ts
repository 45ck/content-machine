import { describe, expect, it, vi, beforeEach } from 'vitest';
import { promisify } from 'node:util';

const execFileMock = vi.fn();
execFileMock[promisify.custom] = (cmd: string, args: string[], options: Record<string, unknown>) =>
  new Promise((resolve, reject) => {
    execFileMock(cmd, args, options, (error: unknown, stdout: unknown, stderr: unknown) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });

vi.mock('node:child_process', () => ({
  execFile: execFileMock,
}));

describe('execFfmpeg', () => {
  beforeEach(() => {
    execFileMock.mockReset();
    delete process.env.CM_FFMPEG;
    delete process.env.CM_FFPROBE;
  });

  it('prefers explicit env overrides for ffmpeg and ffprobe paths', async () => {
    process.env.CM_FFMPEG = 'C:\\tools\\ffmpeg.exe';
    process.env.CM_FFPROBE = 'C:\\tools\\ffprobe.exe';

    const { resolveFfmpegPath, resolveFfprobePath } =
      await import('../../../../src/core/video/ffmpeg');

    expect(resolveFfmpegPath()).toBe('C:\\tools\\ffmpeg.exe');
    expect(resolveFfprobePath()).toBe('C:\\tools\\ffprobe.exe');
  });

  it('executes ffmpeg and returns stdout/stderr', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => cb?.(null, 'out', 'err'));

    const { execFfmpeg } = await import('../../../../src/core/video/ffmpeg');
    const res = await execFfmpeg(['-version'], { dependencyMessage: 'need ffmpeg' });

    expect(res.stdout).toBe('out');
    expect(res.stderr).toBe('err');
  });

  it('throws DEPENDENCY_MISSING on ENOENT', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      const err = new Error('missing');
      (err as NodeJS.ErrnoException).code = 'ENOENT';
      cb?.(err, '', '');
    });

    const { execFfmpeg } = await import('../../../../src/core/video/ffmpeg');
    await expect(
      execFfmpeg(['-version'], { dependencyMessage: 'need ffmpeg' })
    ).rejects.toMatchObject({
      code: 'DEPENDENCY_MISSING',
    });
  });

  it('rethrows non-ENOENT ffmpeg errors', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb?.(new Error('boom'), '', '');
    });

    const { execFfmpeg } = await import('../../../../src/core/video/ffmpeg');
    await expect(execFfmpeg(['-version'], { dependencyMessage: 'need ffmpeg' })).rejects.toThrow(
      'boom'
    );
  });

  it('executes ffprobe and returns stdout/stderr', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) =>
      cb?.(null, 'probe-out', 'probe-err')
    );

    const { execFfprobe } = await import('../../../../src/core/video/ffmpeg');
    const res = await execFfprobe(['-version'], { dependencyMessage: 'need ffprobe' });

    expect(res.stdout).toBe('probe-out');
    expect(res.stderr).toBe('probe-err');
  });

  it('throws DEPENDENCY_MISSING on ffprobe ENOENT', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      const err = new Error('missing');
      (err as NodeJS.ErrnoException).code = 'ENOENT';
      cb?.(err, '', '');
    });

    const { execFfprobe } = await import('../../../../src/core/video/ffmpeg');
    await expect(
      execFfprobe(['-version'], { dependencyMessage: 'need ffprobe' })
    ).rejects.toMatchObject({
      code: 'DEPENDENCY_MISSING',
    });
  });

  it('rethrows non-ENOENT ffprobe errors', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, cb) => {
      cb?.(new Error('probe-boom'), '', '');
    });

    const { execFfprobe } = await import('../../../../src/core/video/ffmpeg');
    await expect(execFfprobe(['-version'], { dependencyMessage: 'need ffprobe' })).rejects.toThrow(
      'probe-boom'
    );
  });
});
