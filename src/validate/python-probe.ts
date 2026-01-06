import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { CMError } from '../core/errors';
import type { VideoInfo } from './video-info';

function runPythonJson(params: {
  pythonPath?: string;
  scriptPath: string;
  args: readonly string[];
  timeoutMs?: number;
}): Promise<unknown> {
  const pythonPath = params.pythonPath ?? 'python';
  const timeoutMs = params.timeoutMs ?? 30_000;

  return new Promise((resolvePromise, reject) => {
    const child = spawn(pythonPath, [params.scriptPath, ...params.args], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill();
      reject(
        new CMError('VIDEO_PROBE_ERROR', `Python timed out after ${timeoutMs}ms`, {
          pythonPath,
          scriptPath: params.scriptPath,
        })
      );
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(
        new CMError('VIDEO_PROBE_ERROR', `Failed to start python: ${String(error)}`, {
          pythonPath,
          scriptPath: params.scriptPath,
        })
      );
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      try {
        const parsed = JSON.parse(stdout) as unknown;
        if (code === 0) {
          resolvePromise(parsed);
          return;
        }
        reject(
          new CMError('VIDEO_PROBE_ERROR', `Python probe failed with code ${code ?? 'unknown'}`, {
            pythonPath,
            scriptPath: params.scriptPath,
            code,
            stderr: stderr.trim() || undefined,
            stdout: stdout.trim() || undefined,
          })
        );
      } catch {
        reject(
          new CMError('VIDEO_PROBE_ERROR', 'Python probe did not return valid JSON', {
            pythonPath,
            scriptPath: params.scriptPath,
            code,
            stderr: stderr.trim() || undefined,
            stdout: stdout.trim() || undefined,
          })
        );
      }
    });
  });
}

export function parsePythonVideoInfo(data: unknown, videoPath: string): VideoInfo {
  if (!data || typeof data !== 'object') {
    throw new CMError('VIDEO_PROBE_ERROR', 'Invalid python probe JSON (not an object)', {
      videoPath,
    });
  }
  const obj = data as Record<string, unknown>;

  const width = Number(obj['width']);
  const height = Number(obj['height']);
  const duration = Number(obj['duration']);
  const container = obj['container'];
  const codec = obj['codec'];
  const audioCodec = obj['audioCodec'];

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new CMError('VIDEO_PROBE_ERROR', 'Python probe missing width/height', { videoPath });
  }
  if (!Number.isFinite(duration)) {
    throw new CMError('VIDEO_PROBE_ERROR', 'Python probe missing duration', { videoPath });
  }

  return {
    path: videoPath,
    width,
    height,
    durationSeconds: duration,
    container: typeof container === 'string' && container ? container : 'unknown',
    videoCodec: typeof codec === 'string' && codec ? codec : 'unknown',
    audioCodec: typeof audioCodec === 'string' && audioCodec ? audioCodec : 'unknown',
  };
}

export async function probeVideoWithPython(
  videoPath: string,
  options?: { pythonPath?: string; scriptPath?: string; timeoutMs?: number; ffprobePath?: string }
): Promise<VideoInfo> {
  const scriptPath = options?.scriptPath ?? resolve(process.cwd(), 'scripts', 'video_info.py');
  const data = await runPythonJson({
    pythonPath: options?.pythonPath,
    scriptPath,
    args: options?.ffprobePath
      ? ['--video', videoPath, '--ffprobe', options.ffprobePath]
      : ['--video', videoPath],
    timeoutMs: options?.timeoutMs,
  });
  return parsePythonVideoInfo(data, videoPath);
}
