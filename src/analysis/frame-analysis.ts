import { existsSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { basename, extname, join, resolve } from 'node:path';
import { CMError } from '../core/errors';

export type FrameAnalysisMode = 'fps' | 'shots' | 'both';

export interface AnalyzeVideoFramesOptions {
  inputVideo: string;
  outputRootDir?: string;
  mode?: FrameAnalysisMode;
  fps?: number;
  shots?: number;
  segments?: number;
}

export interface CapturedFrame {
  index: number;
  timeSec: number;
  path: string;
}

export interface FrameAnalysisManifest {
  inputVideo: string;
  generatedAt: string;
  durationSec: number;
  mode: FrameAnalysisMode;
  settings: {
    fps: number;
    shots: number;
    segments: number;
  };
  outputs: {
    root: string;
    fpsDir: string | null;
    shotsDir: string | null;
  };
  segments: Array<{ index: number; startSec: number; endSec: number }>;
  fpsFrames: CapturedFrame[];
  shotFrames: CapturedFrame[];
}

export interface AnalyzeVideoFramesResult {
  manifestPath: string;
  manifest: FrameAnalysisManifest;
}

export const DEFAULT_FRAME_ANALYSIS_SETTINGS = {
  outputRootDir: 'output/analysis',
  mode: 'both' as FrameAnalysisMode,
  fps: 1,
  shots: 30,
  segments: 5,
};

function baseNameNoExt(filePath: string): string {
  const name = basename(filePath);
  const ext = extname(name);
  return ext ? name.slice(0, -ext.length) : name;
}

function resolveBundledBinary(name: 'ffmpeg' | 'ffprobe'): string {
  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const bundled = resolve(
    process.cwd(),
    'node_modules',
    '@remotion',
    'compositor-win32-x64-msvc',
    exe
  );
  return existsSync(bundled) ? bundled : exe;
}

function probeDurationSec(videoPath: string, ffprobePath: string): number {
  const out = execFileSync(ffprobePath, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    videoPath,
  ]).toString('utf8');
  const duration = Number.parseFloat(out.trim());
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new CMError('VIDEO_PROBE_ERROR', 'Could not read video duration for frame analysis', {
      videoPath,
    });
  }
  return duration;
}

function buildEvenTimes(duration: number, count: number): number[] {
  if (count <= 1) return [0];
  const epsilon = 0.05;
  const safeDuration = Math.max(0, duration - epsilon);
  return Array.from({ length: count }, (_, i) => (safeDuration * i) / (count - 1));
}

function captureFrameAt(
  ffmpegPath: string,
  inputVideo: string,
  timeSec: number,
  outputPng: string
): void {
  const attempts = [timeSec, Math.max(0, timeSec - 0.2), Math.max(0, timeSec - 0.5)];
  let lastError: unknown;
  for (const seekTime of attempts) {
    try {
      execFileSync(ffmpegPath, [
        '-hide_banner',
        '-loglevel',
        'error',
        '-y',
        '-ss',
        String(seekTime),
        '-i',
        inputVideo,
        '-update',
        '1',
        '-frames:v',
        '1',
        outputPng,
      ]);
      if (existsSync(outputPng) && statSync(outputPng).size > 0) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new CMError('FFMPEG_ERROR', 'Failed to extract frame image', { outputPng, timeSec });
}

async function captureShots(params: {
  ffmpegPath: string;
  inputVideo: string;
  durationSec: number;
  count: number;
  dir: string;
}): Promise<CapturedFrame[]> {
  const times = buildEvenTimes(params.durationSec, params.count);
  const out: CapturedFrame[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i] ?? 0;
    const name = `shot_${String(i + 1).padStart(3, '0')}_${t.toFixed(3)}s.png`;
    const path = join(params.dir, name);
    captureFrameAt(params.ffmpegPath, params.inputVideo, t, path);
    out.push({ index: i + 1, timeSec: t, path });
  }
  return out;
}

async function captureByFps(params: {
  ffmpegPath: string;
  inputVideo: string;
  durationSec: number;
  fps: number;
  dir: string;
}): Promise<CapturedFrame[]> {
  const count = Math.max(1, Math.floor(params.durationSec * params.fps) + 1);
  const times = buildEvenTimes(params.durationSec, count);
  const out: CapturedFrame[] = [];
  for (let i = 0; i < times.length; i++) {
    const t = times[i] ?? 0;
    const name = `fps_${String(i + 1).padStart(3, '0')}_${t.toFixed(3)}s.png`;
    const path = join(params.dir, name);
    captureFrameAt(params.ffmpegPath, params.inputVideo, t, path);
    out.push({ index: i + 1, timeSec: t, path });
  }
  return out;
}

function buildSegments(
  durationSec: number,
  segments: number
): Array<{ index: number; startSec: number; endSec: number }> {
  const out: Array<{ index: number; startSec: number; endSec: number }> = [];
  const segLen = durationSec / Math.max(1, segments);
  for (let i = 0; i < segments; i++) {
    const startSec = i * segLen;
    const endSec = i === segments - 1 ? durationSec : (i + 1) * segLen;
    out.push({ index: i + 1, startSec, endSec });
  }
  return out;
}

export async function analyzeVideoFrames(
  options: AnalyzeVideoFramesOptions
): Promise<AnalyzeVideoFramesResult> {
  const mode = options.mode ?? DEFAULT_FRAME_ANALYSIS_SETTINGS.mode;
  const fps = options.fps ?? DEFAULT_FRAME_ANALYSIS_SETTINGS.fps;
  const shots = options.shots ?? DEFAULT_FRAME_ANALYSIS_SETTINGS.shots;
  const segments = options.segments ?? DEFAULT_FRAME_ANALYSIS_SETTINGS.segments;
  const outputRootDir = options.outputRootDir ?? DEFAULT_FRAME_ANALYSIS_SETTINGS.outputRootDir;

  if (mode !== 'fps' && mode !== 'shots' && mode !== 'both') {
    throw new CMError('INVALID_ARGUMENT', `Invalid frame analysis mode: ${mode}`, {
      fix: 'Use mode "fps", "shots", or "both"',
    });
  }
  if (!Number.isFinite(fps) || fps <= 0 || fps > 1) {
    throw new CMError('INVALID_ARGUMENT', `Invalid frame analysis fps: ${fps}`, {
      fix: 'Use a number > 0 and <= 1',
    });
  }
  if (!Number.isFinite(shots) || shots < 1) {
    throw new CMError('INVALID_ARGUMENT', `Invalid frame analysis shots: ${shots}`, {
      fix: 'Use an integer >= 1',
    });
  }
  if (!Number.isFinite(segments) || segments < 1) {
    throw new CMError('INVALID_ARGUMENT', `Invalid frame analysis segments: ${segments}`, {
      fix: 'Use an integer >= 1',
    });
  }

  const inputVideo = resolve(options.inputVideo);
  if (!existsSync(inputVideo)) {
    throw new CMError('FILE_NOT_FOUND', 'Input video not found', { path: inputVideo });
  }

  const ffmpegPath = resolveBundledBinary('ffmpeg');
  const ffprobePath = resolveBundledBinary('ffprobe');
  const durationSec = probeDurationSec(inputVideo, ffprobePath);
  const root = resolve(outputRootDir, baseNameNoExt(inputVideo));
  const fpsDir = join(root, 'fps');
  const shotsDir = join(root, 'shots');

  await mkdir(root, { recursive: true });
  if (mode === 'fps' || mode === 'both') await mkdir(fpsDir, { recursive: true });
  if (mode === 'shots' || mode === 'both') await mkdir(shotsDir, { recursive: true });

  const fpsFrames =
    mode === 'fps' || mode === 'both'
      ? await captureByFps({ ffmpegPath, inputVideo, durationSec, fps, dir: fpsDir })
      : [];
  const shotFrames =
    mode === 'shots' || mode === 'both'
      ? await captureShots({ ffmpegPath, inputVideo, durationSec, count: shots, dir: shotsDir })
      : [];
  const segmentRanges = buildSegments(durationSec, segments);

  const manifestPath = join(root, 'frame-analysis.json');
  const manifest: FrameAnalysisManifest = {
    inputVideo,
    generatedAt: new Date().toISOString(),
    durationSec,
    mode,
    settings: { fps, shots, segments },
    outputs: {
      root,
      fpsDir: mode === 'fps' || mode === 'both' ? fpsDir : null,
      shotsDir: mode === 'shots' || mode === 'both' ? shotsDir : null,
    },
    segments: segmentRanges,
    fpsFrames,
    shotFrames,
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return { manifestPath, manifest };
}
