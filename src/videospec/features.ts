import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { CMError } from '../core/errors';

const execFileAsync = promisify(execFile);

/**
 * A grayscale frame with pixels normalized to [0, 1] in row-major order.
 */
export type GrayFrame = {
  width: number;
  height: number;
  data: Float32Array;
};

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function handleExecError(error: unknown, tool: 'ffmpeg' | 'ffprobe'): never {
  if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new CMError('DEPENDENCY_MISSING', `${tool} is required but was not found on PATH`, {
      tool,
    });
  }
  throw new CMError(
    'VIDEO_PROBE_ERROR',
    `${tool} execution failed: ${error instanceof Error ? error.message : String(error)}`,
    { tool },
    error instanceof Error ? error : undefined
  );
}

/**
 * Extract a single grayscale frame from a video at a given time, resized to `size x size`.
 */
export async function extractGrayFrameAtTime(params: {
  videoPath: string;
  timeSeconds: number;
  size: number;
}): Promise<GrayFrame> {
  const { videoPath, timeSeconds, size } = params;
  const safeSize = Math.max(8, Math.min(256, Math.floor(size)));
  const t = Math.max(0, timeSeconds);

  try {
    const expected = safeSize * safeSize;
    const maxBuffer = Math.max(1024 * 1024, expected + 4096);

    async function run(mode: 'fast' | 'accurate'): Promise<Buffer> {
      // `-ss` before `-i` is faster but can return empty output for some short/VFR files.
      // Fall back to accurate seek (`-ss` after `-i`) when that happens.
      const args =
        mode === 'fast'
          ? [
              '-hide_banner',
              '-loglevel',
              'error',
              '-nostdin',
              '-ss',
              String(t),
              '-i',
              videoPath,
              '-frames:v',
              '1',
              '-vf',
              `scale=${safeSize}:${safeSize},format=gray`,
              '-f',
              'rawvideo',
              '-pix_fmt',
              'gray',
              'pipe:1',
            ]
          : [
              '-hide_banner',
              '-loglevel',
              'error',
              '-nostdin',
              '-i',
              videoPath,
              '-ss',
              String(t),
              '-frames:v',
              '1',
              '-vf',
              `scale=${safeSize}:${safeSize},format=gray`,
              '-f',
              'rawvideo',
              '-pix_fmt',
              'gray',
              'pipe:1',
            ];

      const { stdout } = await execFileAsync('ffmpeg', args, {
        windowsHide: true,
        timeout: 30_000,
        // stdout is raw binary; don't decode as utf-8 (it can inflate output and corrupt bytes).
        encoding: 'buffer',
        maxBuffer,
      });

      return Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout as any);
    }

    let buf = await run('fast');
    if (buf.length < expected) {
      buf = await run('accurate');
    }
    if (buf.length < expected) {
      throw new CMError('VIDEO_PROBE_ERROR', 'ffmpeg returned too few bytes for a frame', {
        videoPath,
        got: buf.length,
        expected,
      });
    }

    const data = new Float32Array(expected);
    for (let i = 0; i < expected; i++) data[i] = buf[i]! / 255;
    return { width: safeSize, height: safeSize, data };
  } catch (error) {
    handleExecError(error, 'ffmpeg');
  }
}

/**
 * Returns true if a video contains at least one audio stream (best-effort).
 */
export async function probeHasAudioStream(videoPath: string): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-print_format', 'json', '-show_streams', '-select_streams', 'a', videoPath],
      { windowsHide: true, timeout: 10_000, maxBuffer: 1024 * 1024 }
    );
    const text = String(stdout ?? '');
    const parsed = JSON.parse(text) as { streams?: Array<{ codec_type?: string }> };
    return (parsed.streams ?? []).some((s) => s.codec_type === 'audio');
  } catch (error) {
    handleExecError(error, 'ffprobe');
  }
}

/**
 * Extract mono PCM samples from the video's audio stream as signed 16-bit little-endian.
 */
export async function extractPcmMonoS16le(params: {
  videoPath: string;
  sampleRate: number;
  maxSeconds?: number;
}): Promise<Int16Array> {
  const { videoPath, sampleRate, maxSeconds } = params;
  const sr = Math.max(8_000, Math.min(48_000, Math.floor(sampleRate)));
  const args = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    videoPath,
    '-vn',
    '-ac',
    '1',
    '-ar',
    String(sr),
  ];
  if (typeof maxSeconds === 'number' && maxSeconds > 0) {
    args.push('-t', String(maxSeconds));
  }
  args.push('-f', 's16le', 'pipe:1');

  try {
    const { stdout } = await execFileAsync('ffmpeg', args, {
      windowsHide: true,
      timeout: 60_000,
      maxBuffer: 50 * 1024 * 1024,
    });

    const buf = Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout as any);
    const sampleCount = Math.floor(buf.byteLength / 2);
    if (sampleCount <= 0) return new Int16Array();
    return new Int16Array(buf.buffer, buf.byteOffset, sampleCount);
  } catch (error) {
    handleExecError(error, 'ffmpeg');
  }
}

/**
 * Compute a 64-bit average hash (aHash) for a grayscale frame.
 *
 * The frame is reduced to 8x8 and each bit indicates whether the pixel is above
 * the mean intensity.
 */
export function computeAHash64(frame: GrayFrame): bigint {
  const { width, height, data } = frame;
  if (width <= 0 || height <= 0 || data.length !== width * height) {
    throw new CMError('INVALID_ARGUMENT', 'Invalid GrayFrame', {
      width,
      height,
      length: data.length,
    });
  }

  // Reduce to 8x8 via block averaging (deterministic, no external deps).
  const grid = new Float32Array(64);
  for (let gy = 0; gy < 8; gy++) {
    for (let gx = 0; gx < 8; gx++) {
      const x0 = Math.floor((gx * width) / 8);
      const x1 = Math.floor(((gx + 1) * width) / 8);
      const y0 = Math.floor((gy * height) / 8);
      const y1 = Math.floor(((gy + 1) * height) / 8);
      let sum = 0;
      let n = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          sum += clamp01(data[y * width + x] ?? 0);
          n++;
        }
      }
      grid[gy * 8 + gx] = n > 0 ? sum / n : 0;
    }
  }

  let mean = 0;
  for (let i = 0; i < 64; i++) mean += grid[i]!;
  mean /= 64;

  let hash = 0n;
  for (let i = 0; i < 64; i++) {
    if ((grid[i] ?? 0) > mean) {
      // Set bit i (MSB-first for stable stringification if needed).
      hash |= 1n << BigInt(63 - i);
    }
  }
  return hash;
}

/**
 * Hamming distance for 64-bit hashes.
 */
export function hammingDistance64(a: bigint, b: bigint): number {
  let x = a ^ b;
  let count = 0;
  while (x !== 0n) {
    count += Number(x & 1n);
    x >>= 1n;
  }
  return count;
}

/**
 * Result from `classifyCameraMotionFromFrames`.
 */
export type CameraMotionClassification = {
  motion: 'static' | 'zoom_in' | 'zoom_out' | 'pan_left' | 'pan_right' | 'tilt' | 'unknown';
  confidence: number;
};

function mseWithShift(a: GrayFrame, b: GrayFrame, dx: number, dy: number): number {
  const { width, height } = a;
  let sum = 0;
  let n = 0;
  for (let y = 0; y < height; y++) {
    const y2 = y + dy;
    if (y2 < 0 || y2 >= height) continue;
    for (let x = 0; x < width; x++) {
      const x2 = x + dx;
      if (x2 < 0 || x2 >= width) continue;
      const va = a.data[y * width + x] ?? 0;
      const vb = b.data[y2 * width + x2] ?? 0;
      const d = va - vb;
      sum += d * d;
      n++;
    }
  }
  return n > 0 ? sum / n : Number.POSITIVE_INFINITY;
}

/**
 * Classify camera motion between two frames using a simple translation-fit heuristic.
 *
 * This is intentionally lightweight and designed for "good enough" labeling, not
 * cinematography-grade analysis.
 */
export function classifyCameraMotionFromFrames(params: {
  start: GrayFrame;
  end: GrayFrame;
}): CameraMotionClassification {
  const { start, end } = params;
  if (start.width !== end.width || start.height !== end.height) {
    return { motion: 'unknown', confidence: 0.1 };
  }

  const base = mseWithShift(start, end, 0, 0);
  if (!Number.isFinite(base)) return { motion: 'unknown', confidence: 0.1 };

  const maxShift = Math.max(1, Math.min(4, Math.floor(start.width / 16)));
  let best = { dx: 0, dy: 0, mse: base };
  for (let dy = -maxShift; dy <= maxShift; dy++) {
    for (let dx = -maxShift; dx <= maxShift; dx++) {
      if (dx === 0 && dy === 0) continue;
      const m = mseWithShift(start, end, dx, dy);
      if (m < best.mse) best = { dx, dy, mse: m };
    }
  }

  // If no meaningful improvement from shifting, treat as static.
  const improvement = base > 0 ? (base - best.mse) / base : 0;
  if (base < 1e-4 || improvement < 0.05) {
    return { motion: 'static', confidence: Math.max(0.7, 1 - base * 10) };
  }

  // Prefer pan direction when horizontal shift dominates.
  const absDx = Math.abs(best.dx);
  const absDy = Math.abs(best.dy);
  const conf = Math.max(0.25, Math.min(0.95, 0.4 + improvement * 0.6));
  if (absDx >= absDy && absDx > 0) {
    return { motion: best.dx > 0 ? 'pan_right' : 'pan_left', confidence: conf };
  }
  if (absDy > 0) {
    return { motion: 'tilt', confidence: conf };
  }

  return { motion: 'unknown', confidence: 0.2 };
}

/**
 * Beat grid detection result.
 */
export type BeatGridResult = { bpm: number | null; beats: number[]; confidence: number };

/**
 * Detected SFX-like onset event.
 */
export type SfxEventResult = { time: number; type: string; confidence: number };

/**
 * Heuristic beat tracking + "SFX-like" onset detection from PCM audio.
 *
 * This intentionally favors determinism and low dependency footprint.
 */
export function analyzePcmForBeatAndSfx(params: {
  pcmS16le: Int16Array;
  sampleRate: number;
  durationSeconds: number;
}): { beatGrid: BeatGridResult; sfx: SfxEventResult[] } {
  const { pcmS16le, sampleRate, durationSeconds } = params;
  if (pcmS16le.length === 0) {
    return { beatGrid: { bpm: null, beats: [], confidence: 0 }, sfx: [] };
  }

  const sr = Math.max(8_000, Math.min(48_000, Math.floor(sampleRate)));
  const win = 1024;
  const hop = 512;
  const energies: number[] = [];
  const times: number[] = [];

  for (let i = 0; i + win <= pcmS16le.length; i += hop) {
    let sum = 0;
    for (let j = 0; j < win; j++) sum += Math.abs(pcmS16le[i + j] ?? 0);
    const e = sum / (win * 32768);
    energies.push(e);
    times.push(i / sr);
  }

  if (energies.length === 0) {
    return { beatGrid: { bpm: null, beats: [], confidence: 0 }, sfx: [] };
  }

  let mean = 0;
  for (const e of energies) mean += e;
  mean /= energies.length;
  let variance = 0;
  for (const e of energies) {
    const d = e - mean;
    variance += d * d;
  }
  variance /= energies.length;
  const std = Math.sqrt(variance);
  const threshold = mean + std * 2;

  // Threshold-crossing onset detection is more robust than local maxima for "gated" signals.
  const peaks: number[] = [];
  const minGap = 0.08; // seconds
  for (let i = 1; i < energies.length; i++) {
    const prev = energies[i - 1]!;
    const e = energies[i]!;
    if (prev >= threshold) continue;
    if (e < threshold) continue;
    const t = times[i]!;
    if (peaks.length > 0 && t - peaks[peaks.length - 1]! < minGap) continue;
    peaks.push(t);
  }

  const sfx: SfxEventResult[] = peaks
    .filter((t) => t <= durationSeconds)
    .slice(0, 200)
    .map((t) => ({ time: t, type: 'onset', confidence: 0.6 }));

  // BPM estimate via median interval between peaks in a plausible tempo range.
  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    const dt = peaks[i]! - peaks[i - 1]!;
    if (dt >= 0.25 && dt <= 1.0) intervals.push(dt);
  }

  const beatCandidates = peaks.filter((t) => t <= durationSeconds).slice(0, 500);

  if (intervals.length < 6) {
    // Not enough periodicity evidence to claim a BPM, but we can still provide beat candidates.
    return { beatGrid: { bpm: null, beats: beatCandidates, confidence: 0.2 }, sfx };
  }

  intervals.sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)]!;
  const bpm = Math.round((60 / median) * 10) / 10;

  // Confidence based on interval consistency around the median.
  let consistent = 0;
  for (const dt of intervals) {
    if (Math.abs(dt - median) / median <= 0.12) consistent++;
  }
  const confidence = Math.max(0.2, Math.min(0.95, consistent / intervals.length));

  const beats: number[] = [];
  let t = beatCandidates[0] ?? 0;
  const step = median;
  while (t <= durationSeconds) {
    beats.push(t);
    t += step;
  }

  return { beatGrid: { bpm, beats, confidence }, sfx };
}
