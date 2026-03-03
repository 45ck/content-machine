import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CMError } from '../errors';
import { createRequireSafe } from '../require';

const execFileAsync = promisify(execFile);

function resolveBinaryFromOptionalDep(depName: string): string | null {
  try {
    const require = createRequireSafe(import.meta.url);
    const mod = require(depName);
    if (typeof mod === 'string' && mod.length > 0) return mod;
    // Some packages (e.g. ffprobe-static) export `{ path: string }`.
    if (mod && typeof mod === 'object' && typeof (mod as any).path === 'string') {
      const p = String((mod as any).path);
      return p.length > 0 ? p : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function resolveFfmpegPath(): string {
  const env = process.env.CM_FFMPEG;
  if (env && env.trim()) return env.trim();
  // Prefer bundled static ffmpeg when available (avoids PATH issues on Windows).
  return resolveBinaryFromOptionalDep('ffmpeg-static') ?? 'ffmpeg';
}

export function resolveFfprobePath(): string {
  const env = process.env.CM_FFPROBE;
  if (env && env.trim()) return env.trim();
  return resolveBinaryFromOptionalDep('ffprobe-static') ?? 'ffprobe';
}

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
  const ffmpegPath = opts.ffmpegPath ?? resolveFfmpegPath();
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

export async function execFfprobe(
  args: string[],
  opts: {
    ffprobePath?: string;
    timeoutMs?: number;
    maxBuffer?: number;
    encoding?: 'utf8' | 'buffer';
    dependencyMessage: string;
  }
): Promise<{ stdout: unknown; stderr: unknown }> {
  const ffprobePath = opts.ffprobePath ?? resolveFfprobePath();
  try {
    const result = await execFileAsync(ffprobePath, args, {
      windowsHide: true,
      timeout: opts.timeoutMs ?? 60_000,
      maxBuffer: opts.maxBuffer,
      ...(opts.encoding ? { encoding: opts.encoding as any } : {}),
    } as any);
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', opts.dependencyMessage, { binary: ffprobePath });
    }
    throw error;
  }
}
