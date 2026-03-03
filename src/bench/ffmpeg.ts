import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CMError } from '../core/errors';

const execFileAsync = promisify(execFile);

export async function runFfmpeg(params: {
  ffmpegPath: string;
  args: string[];
  timeoutMs?: number;
}): Promise<void> {
  try {
    await execFileAsync(params.ffmpegPath, params.args, {
      windowsHide: true,
      timeout: params.timeoutMs ?? 120_000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', 'ffmpeg is required for benchmark generation', {
        binary: params.ffmpegPath,
      });
    }
    throw new CMError(
      'PROCESS_ERROR',
      `ffmpeg failed: ${error instanceof Error ? error.message : String(error)}`,
      { ffmpegPath: params.ffmpegPath, args: params.args }
    );
  }
}
