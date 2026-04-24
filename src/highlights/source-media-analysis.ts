import { extname } from 'node:path';
import { execFfprobe } from '../core/video/ffmpeg';
import {
  SOURCE_MEDIA_ANALYSIS_SCHEMA_VERSION,
  SourceMediaAnalysisOutputSchema,
  type SourceMediaAnalysisOutput,
} from '../domain';

interface FfprobeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  nb_frames?: string;
}

interface FfprobeFormat {
  duration?: string;
  format_name?: string;
}

interface FfprobeJson {
  streams?: FfprobeStream[];
  format?: FfprobeFormat;
}

export interface AnalyzeSourceMediaOptions {
  ffprobePath?: string;
  timeoutMs?: number;
  analyzedAt?: string;
}

function parseRate(rate: string | undefined): number | null {
  if (!rate || rate === '0/0') return null;
  const [left, right] = rate.split('/').map((part) => Number(part));
  if (!Number.isFinite(left)) return null;
  if (!Number.isFinite(right) || right === 0) return left > 0 ? left : null;
  const value = left / right;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function parsePositiveNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function orientation(
  width: number | null,
  height: number | null
): 'portrait' | 'landscape' | 'square' | 'unknown' {
  if (!width || !height) return 'unknown';
  if (width === height) return 'square';
  return height > width ? 'portrait' : 'landscape';
}

function normalizeContainer(formatName: string | undefined, mediaPath: string): string | null {
  if (!formatName) {
    const extension = extname(mediaPath).replace(/^\./, '');
    return extension || null;
  }
  const normalized = formatName.toLowerCase();
  if (normalized.includes('mp4')) return 'mp4';
  if (normalized.includes('webm')) return 'webm';
  if (normalized.includes('matroska')) return 'mkv';
  return normalized.split(',')[0] ?? null;
}

function estimateFrameCount(params: {
  streamFrameCount: string | undefined;
  durationSeconds: number | null;
  fps: number | null;
}): number {
  const frameCount = params.streamFrameCount ? Number(params.streamFrameCount) : NaN;
  if (Number.isFinite(frameCount) && frameCount >= 0) return Math.trunc(frameCount);
  if (params.durationSeconds && params.fps) {
    return Math.trunc(params.durationSeconds * params.fps);
  }
  return 0;
}

function buildSourceSignals(params: {
  hasAudio: boolean;
  hasVideo: boolean;
  durationSeconds: number | null;
  estimatedFrameCount: number;
}): SourceMediaAnalysisOutput['sourceSignals'] {
  return {
    audioEnergyScore: params.hasAudio ? 0.5 : null,
    sceneChangeScore:
      params.hasVideo && params.durationSeconds
        ? Math.min(1, params.estimatedFrameCount / (params.durationSeconds * 30))
        : null,
    sampledFrameCount:
      params.estimatedFrameCount > 0 ? Math.min(params.estimatedFrameCount, 120) : 0,
    estimatedSceneCount:
      params.hasVideo && params.durationSeconds
        ? Math.max(1, Math.round(params.durationSeconds / 4))
        : null,
  };
}

function buildWarnings(params: {
  hasAudio: boolean;
  hasVideo: boolean;
  durationSeconds: number | null;
}): string[] {
  return [
    ...(params.hasVideo ? [] : ['No video stream found']),
    ...(params.hasAudio ? [] : ['No audio stream found']),
    ...(params.durationSeconds ? [] : ['Duration unavailable from ffprobe']),
  ];
}

export function analyzeSourceMediaFromProbe(
  mediaPath: string,
  probe: FfprobeJson,
  options: Pick<AnalyzeSourceMediaOptions, 'analyzedAt'> = {}
): SourceMediaAnalysisOutput {
  const video = probe.streams?.find((stream) => stream.codec_type === 'video');
  const audio = probe.streams?.find((stream) => stream.codec_type === 'audio');
  const width = video?.width ?? null;
  const height = video?.height ?? null;
  const fps = parseRate(video?.avg_frame_rate) ?? parseRate(video?.r_frame_rate);
  const durationSeconds = parsePositiveNumber(probe.format?.duration);
  const estimatedFrameCount = estimateFrameCount({
    streamFrameCount: video?.nb_frames,
    durationSeconds,
    fps,
  });
  const hasAudio = Boolean(audio);
  const hasVideo = Boolean(video);

  return SourceMediaAnalysisOutputSchema.parse({
    schemaVersion: SOURCE_MEDIA_ANALYSIS_SCHEMA_VERSION,
    mediaPath,
    analyzedAt: options.analyzedAt ?? new Date().toISOString(),
    probe: {
      engine: 'ffprobe',
      durationSeconds,
      width,
      height,
      fps,
      hasAudio,
      hasVideo,
      orientation: orientation(width, height),
      videoCodec: video?.codec_name ?? null,
      audioCodec: audio?.codec_name ?? null,
      container: normalizeContainer(probe.format?.format_name, mediaPath),
    },
    sourceSignals: buildSourceSignals({ hasAudio, hasVideo, durationSeconds, estimatedFrameCount }),
    warnings: buildWarnings({ hasAudio, hasVideo, durationSeconds }),
  });
}

export async function analyzeSourceMedia(
  mediaPath: string,
  options: AnalyzeSourceMediaOptions = {}
): Promise<SourceMediaAnalysisOutput> {
  const { stdout } = await execFfprobe(
    ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', mediaPath],
    {
      ffprobePath: options.ffprobePath,
      timeoutMs: options.timeoutMs ?? 15_000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: 'utf8',
      dependencyMessage: 'ffprobe is required for source media analysis',
    }
  );
  const parsed = JSON.parse(String(stdout)) as FfprobeJson;
  return analyzeSourceMediaFromProbe(mediaPath, parsed, { analyzedAt: options.analyzedAt });
}
