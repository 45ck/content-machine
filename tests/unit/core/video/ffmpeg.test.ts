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
});
