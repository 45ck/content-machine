import type { VideoInfo, VideoInspector } from './types';
import { execFile } from 'node:child_process';

function execFileAsync(
  file: string,
  args: readonly string[],
  options: { timeoutMs: number }
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(file, [...args], { timeout: options.timeoutMs }, (error, stdout, stderr) => {
      if (error) {
        reject(Object.assign(error, { stdout, stderr }));
        return;
      }
      resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
}

interface FfprobeFormat {
  format_name?: string;
  duration?: string;
}

interface FfprobeJson {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

function parseFps(rate: string | undefined): number | undefined {
  if (!rate) return undefined;
  const trimmed = rate.trim();
  if (!trimmed || trimmed === '0/0') return undefined;
  const [numStr, denStr] = trimmed.split('/');
  const num = Number(numStr);
  const den = Number(denStr);
  if (!Number.isFinite(num) || !Number.isFinite(den) || den === 0) return undefined;
  return num / den;
}

function extractVideoStream(streams: FfprobeStream[]): FfprobeStream | undefined {
  return streams.find((s) => s.codec_type === 'video');
}

function extractAudioStream(streams: FfprobeStream[]): FfprobeStream | undefined {
  return streams.find((s) => s.codec_type === 'audio');
}

function extractDimensions(video: FfprobeStream | undefined): { width: number; height: number } {
  const width = video?.width;
  const height = video?.height;
  if (!width || !height) {
    throw new Error('ffprobe output missing video width/height');
  }
  return { width, height };
}

function extractDuration(format: FfprobeFormat | undefined): number {
  const durationSeconds = format?.duration ? Number(format.duration) : NaN;
  if (!Number.isFinite(durationSeconds)) {
    throw new Error('ffprobe output missing duration');
  }
  return durationSeconds;
}

export function parseFfprobeJson(jsonText: string): VideoInfo {
  const parsed = JSON.parse(jsonText) as FfprobeJson;
  const streams = parsed.streams ?? [];
  const video = extractVideoStream(streams);
  const audio = extractAudioStream(streams);
  const { width, height } = extractDimensions(video);
  const durationSeconds = extractDuration(parsed.format);

  return {
    width,
    height,
    durationSeconds,
    fps: parseFps(video?.avg_frame_rate) ?? parseFps(video?.r_frame_rate),
    container: parsed.format?.format_name?.split(',')[0]?.trim(),
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
  };
}

export class FfprobeInspector implements VideoInspector {
  readonly ffprobePath: string;
  readonly timeoutMs: number;

  constructor(options?: { ffprobePath?: string; timeoutMs?: number }) {
    this.ffprobePath = options?.ffprobePath ?? 'ffprobe';
    this.timeoutMs = options?.timeoutMs ?? 10_000;
  }

  async inspect(videoPath: string): Promise<VideoInfo> {
    const { stdout } = await execFileAsync(
      this.ffprobePath,
      ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', videoPath],
      { timeoutMs: this.timeoutMs }
    );
    return parseFfprobeJson(stdout);
  }
}
