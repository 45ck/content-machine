import { extname } from 'node:path';
import { execFfmpeg, execFfprobe } from '../core/video/ffmpeg';
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
  ffmpegPath?: string;
  ffprobePath?: string;
  timeoutMs?: number;
  analyzedAt?: string;
}

type SourceSignals = SourceMediaAnalysisOutput['sourceSignals'];
type SilenceGap = SourceSignals['silenceGaps'][number];

interface MeasuredSourceSignals {
  audioRmsDb?: number | null;
  audioPeakDb?: number | null;
  silenceGaps?: SilenceGap[];
  sceneChanges?: number[];
  warnings?: string[];
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
  measured?: MeasuredSourceSignals;
}): SourceSignals {
  const sceneChanges = params.measured?.sceneChanges ?? [];
  const silenceGaps = params.measured?.silenceGaps ?? [];
  const totalSilenceSeconds = sumSilenceSeconds(silenceGaps);
  const audioRmsDb = params.measured?.audioRmsDb ?? null;
  const audioPeakDb = params.measured?.audioPeakDb ?? null;

  return {
    audioEnergyScore:
      params.hasAudio && audioRmsDb !== null ? rmsDbToEnergyScore(audioRmsDb) : null,
    audioRmsDb,
    audioPeakDb,
    silenceGapCount: silenceGaps.length,
    totalSilenceSeconds,
    silenceGaps,
    sceneChangeScore:
      params.hasVideo && params.durationSeconds
        ? sceneChangeDensityScore(sceneChanges.length, params.durationSeconds)
        : null,
    sceneChanges,
    sampledFrameCount:
      params.estimatedFrameCount > 0 ? Math.min(params.estimatedFrameCount, 120) : 0,
    estimatedSceneCount:
      params.hasVideo && params.durationSeconds ? Math.max(1, sceneChanges.length + 1) : null,
  };
}

function buildWarnings(params: {
  hasAudio: boolean;
  hasVideo: boolean;
  durationSeconds: number | null;
  measured?: MeasuredSourceSignals;
}): string[] {
  return [
    ...(params.hasVideo ? [] : ['No video stream found']),
    ...(params.hasAudio ? [] : ['No audio stream found']),
    ...(params.durationSeconds ? [] : ['Duration unavailable from ffprobe']),
    ...(params.measured?.warnings ?? []),
  ];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function rmsDbToEnergyScore(rmsDb: number): number {
  // Map near-silent material to 0 and healthy speech/music loudness toward 1.
  return clamp01((rmsDb + 60) / 48);
}

function sceneChangeDensityScore(sceneChangeCount: number, durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  // One meaningful change every ~3 seconds is enough for a high short-form rhythm score.
  return clamp01(sceneChangeCount / Math.max(1, durationSeconds / 3));
}

function sumSilenceSeconds(gaps: SilenceGap[]): number {
  return Number(gaps.reduce((sum, gap) => sum + gap.duration, 0).toFixed(3));
}

function parseSceneChanges(stderr: string): number[] {
  const values: number[] = [];
  const re = /pts_time:([0-9.]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(stderr)) !== null) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 0) values.push(value);
  }
  return dedupeSorted(
    values.sort((left, right) => left - right),
    0.03
  );
}

function parseSilenceGaps(stderr: string): SilenceGap[] {
  const gaps: SilenceGap[] = [];
  let activeStart: number | null = null;
  for (const line of stderr.split(/\r?\n/)) {
    const start = /silence_start:\s*([0-9.]+)/.exec(line);
    if (start) {
      const value = Number(start[1]);
      if (Number.isFinite(value) && value >= 0) activeStart = value;
    }

    const end = /silence_end:\s*([0-9.]+)\s*\|\s*silence_duration:\s*([0-9.]+)/.exec(line);
    if (end) {
      const endValue = Number(end[1]);
      const duration = Number(end[2]);
      const startValue =
        activeStart !== null && Number.isFinite(activeStart)
          ? activeStart
          : Math.max(0, endValue - duration);
      if (Number.isFinite(endValue) && Number.isFinite(duration) && endValue >= startValue) {
        gaps.push({
          start: Number(startValue.toFixed(3)),
          end: Number(endValue.toFixed(3)),
          duration: Number(Math.max(0, duration).toFixed(3)),
        });
      }
      activeStart = null;
    }
  }
  return gaps;
}

function parseVolumeStats(stderr: string): {
  audioRmsDb: number | null;
  audioPeakDb: number | null;
} {
  const mean = /mean_volume:\s*(-?[0-9.]+)\s*dB/.exec(stderr);
  const max = /max_volume:\s*(-?[0-9.]+)\s*dB/.exec(stderr);
  return {
    audioRmsDb: mean ? Number(mean[1]) : null,
    audioPeakDb: max ? Number(max[1]) : null,
  };
}

function dedupeSorted(values: number[], epsilon: number): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (out.length === 0 || Math.abs(value - out[out.length - 1]!) >= epsilon) {
      out.push(Number(value.toFixed(3)));
    }
  }
  return out;
}

async function measureSourceSignals(
  mediaPath: string,
  params: { hasAudio: boolean; hasVideo: boolean; options: AnalyzeSourceMediaOptions }
): Promise<MeasuredSourceSignals> {
  const warnings: string[] = [];
  const measured: MeasuredSourceSignals = { warnings };

  if (params.hasVideo) {
    try {
      const { stderr } = await execFfmpeg(
        [
          '-hide_banner',
          '-loglevel',
          'info',
          '-i',
          mediaPath,
          '-vf',
          'select=gt(scene\\,0.3),showinfo',
          '-an',
          '-f',
          'null',
          '-',
        ],
        {
          ffmpegPath: params.options.ffmpegPath,
          timeoutMs: params.options.timeoutMs ?? 30_000,
          maxBuffer: 10 * 1024 * 1024,
          encoding: 'utf8',
          dependencyMessage: 'ffmpeg is required for source scene analysis',
        }
      );
      measured.sceneChanges = parseSceneChanges(String(stderr ?? ''));
    } catch (error) {
      warnings.push(
        `Scene-change measurement unavailable: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (params.hasAudio) {
    try {
      const { stderr } = await execFfmpeg(
        [
          '-hide_banner',
          '-i',
          mediaPath,
          '-af',
          'silencedetect=noise=-35dB:d=0.25',
          '-f',
          'null',
          '-',
        ],
        {
          ffmpegPath: params.options.ffmpegPath,
          timeoutMs: params.options.timeoutMs ?? 30_000,
          maxBuffer: 10 * 1024 * 1024,
          encoding: 'utf8',
          dependencyMessage: 'ffmpeg is required for source silence analysis',
        }
      );
      measured.silenceGaps = parseSilenceGaps(String(stderr ?? ''));
    } catch (error) {
      warnings.push(
        `Silence measurement unavailable: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    try {
      const { stderr } = await execFfmpeg(
        ['-hide_banner', '-i', mediaPath, '-af', 'volumedetect', '-f', 'null', '-'],
        {
          ffmpegPath: params.options.ffmpegPath,
          timeoutMs: params.options.timeoutMs ?? 30_000,
          maxBuffer: 10 * 1024 * 1024,
          encoding: 'utf8',
          dependencyMessage: 'ffmpeg is required for source audio energy analysis',
        }
      );
      Object.assign(measured, parseVolumeStats(String(stderr ?? '')));
    } catch (error) {
      warnings.push(
        `Audio energy measurement unavailable: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  return measured;
}

export function analyzeSourceMediaFromProbe(
  mediaPath: string,
  probe: FfprobeJson,
  options: Pick<AnalyzeSourceMediaOptions, 'analyzedAt'> & {
    measuredSignals?: MeasuredSourceSignals;
  } = {}
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

  const measured = options.measuredSignals;

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
    sourceSignals: buildSourceSignals({
      hasAudio,
      hasVideo,
      durationSeconds,
      estimatedFrameCount,
      measured,
    }),
    warnings: buildWarnings({ hasAudio, hasVideo, durationSeconds, measured }),
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
  const video = parsed.streams?.find((stream) => stream.codec_type === 'video');
  const audio = parsed.streams?.find((stream) => stream.codec_type === 'audio');
  const measuredSignals = await measureSourceSignals(mediaPath, {
    hasAudio: Boolean(audio),
    hasVideo: Boolean(video),
    options,
  });
  return analyzeSourceMediaFromProbe(mediaPath, parsed, {
    analyzedAt: options.analyzedAt,
    measuredSignals,
  });
}
