import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CMError } from '../core/errors';
import type { VideoInfo } from './video-info';

const execFileAsync = promisify(execFile);

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
}

interface FfprobeFormat {
  format_name?: string;
  duration?: string;
}

interface FfprobeOutput {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

interface ProbeOptions {
  timeoutMs?: number;
  ffprobePath?: string;
}

function normalizeContainer(formatName: string | undefined): string {
  if (!formatName) return 'unknown';
  const normalized = formatName.toLowerCase();
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('matroska')) return 'mkv';
  return normalized.split(',')[0] ?? 'unknown';
}

async function executeFfprobe(videoPath: string, options: Required<ProbeOptions>): Promise<string> {
  const { stdout } = await execFileAsync(
    options.ffprobePath,
    ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', videoPath],
    { timeout: options.timeoutMs, windowsHide: true }
  );
  return stdout;
}

function parseStreams(parsed: FfprobeOutput): { video?: FfprobeStream; audio?: FfprobeStream } {
  const streams = parsed.streams ?? [];
  return {
    video: streams.find((stream) => stream.codec_type === 'video'),
    audio: streams.find((stream) => stream.codec_type === 'audio'),
  };
}

function validateAndExtractInfo(parsed: FfprobeOutput, videoPath: string): VideoInfo {
  const { video: videoStream, audio: audioStream } = parseStreams(parsed);
  const durationRaw = parsed.format?.duration;
  const durationSeconds = durationRaw ? Number(durationRaw) : NaN;

  if (!videoStream?.width || !videoStream?.height) {
    throw new CMError('VIDEO_PROBE_ERROR', 'ffprobe output missing video width/height', {
      videoPath,
    });
  }
  if (!Number.isFinite(durationSeconds)) {
    throw new CMError('VIDEO_PROBE_ERROR', 'ffprobe output missing duration', { videoPath });
  }

  return {
    path: videoPath,
    width: videoStream.width,
    height: videoStream.height,
    durationSeconds,
    container: normalizeContainer(parsed.format?.format_name),
    videoCodec: videoStream.codec_name ?? 'unknown',
    audioCodec: audioStream?.codec_name ?? 'unknown',
  };
}

function handleProbeError(error: unknown, videoPath: string, ffprobePath: string): never {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new CMError('DEPENDENCY_MISSING', 'ffprobe is required but was not found on PATH', {
      ffprobePath,
    });
  }
  if (error instanceof SyntaxError) {
    throw new CMError('VIDEO_PROBE_ERROR', 'ffprobe returned invalid JSON', { videoPath }, error);
  }
  if (error instanceof CMError) {
    throw error;
  }
  throw new CMError(
    'VIDEO_PROBE_ERROR',
    `Failed to probe video: ${error instanceof Error ? error.message : String(error)}`,
    { videoPath },
    error instanceof Error ? error : undefined
  );
}

export async function probeVideoWithFfprobe(
  videoPath: string,
  options?: ProbeOptions
): Promise<VideoInfo> {
  const resolvedOptions: Required<ProbeOptions> = {
    timeoutMs: options?.timeoutMs ?? 10_000,
    ffprobePath: options?.ffprobePath ?? 'ffprobe',
  };

  try {
    const stdout = await executeFfprobe(videoPath, resolvedOptions);
    const parsed = JSON.parse(stdout) as FfprobeOutput;
    return validateAndExtractInfo(parsed, videoPath);
  } catch (error) {
    handleProbeError(error, videoPath, resolvedOptions.ffprobePath);
  }
}
