import { resolve } from 'node:path';
import { CMError } from '../core/errors';
import type { VideoInfo } from './video-info';
import { runPythonJson } from './python-json';

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
    errorCode: 'VIDEO_PROBE_ERROR',
    pythonPath: options?.pythonPath,
    scriptPath,
    args: options?.ffprobePath
      ? ['--video', videoPath, '--ffprobe', options.ffprobePath]
      : ['--video', videoPath],
    timeoutMs: options?.timeoutMs,
  });
  return parsePythonVideoInfo(data, videoPath);
}
