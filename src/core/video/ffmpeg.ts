import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CMError } from '../errors';

const execFileAsync = promisify(execFile);

export async function execFfmpeg(
  args: string[],
  opts: {
    ffmpegPath?: string;
    timeoutMs?: number;
    maxBuffer?: number;
    encoding?: 'utf8' | 'buffer';
    dependencyMessage: string;
  }
): Promise<{ stdout: unknown; stderr: unknown }> {
  const ffmpegPath = opts.ffmpegPath ?? 'ffmpeg';
  try {
    const result = await execFileAsync(ffmpegPath, args, {
      windowsHide: true,
      timeout: opts.timeoutMs ?? 60_000,
      maxBuffer: opts.maxBuffer,
      ...(opts.encoding ? { encoding: opts.encoding as any } : {}),
    } as any);
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', opts.dependencyMessage, { binary: ffmpegPath });
    }
    throw error;
  }
}
