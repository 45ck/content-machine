import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import { CMError } from '../core/errors';
import { createTesseractWorkerEng } from '../core/ocr/tesseract';
import { execFfmpeg } from '../core/video/ffmpeg';
import { probeVideoWithFfprobe } from '../validate/ffprobe';
import { detectSceneCutsWithPySceneDetect } from '../validate/scene-detect';
import { normalizeWord, isFuzzyMatch } from '../core/text/similarity';
import { transcribeAudio } from '../audio/asr';
import { createLLMProvider, type LLMProvider } from '../core/llm';
import { resolveVideoSpecCacheDir } from './cache';
import {
  analyzePcmForBeatAndSfx,
  classifyCameraMotionFromFrames,
  computeAHash64,
  extractGrayFrameAtTime,
  extractPcmMonoS16le,
  hammingDistance64,
  probeHasAudioStream,
} from './features';
import {
  VIDEOSPEC_V1_VERSION,
  VideoSpecV1Schema,
  type VideoSpecV1,
  type VideoSpecTranscriptSegment,
  type VideoSpecCaption,
  type VideoSpecTextOverlay,
} from '../domain';

const execFileAsync = promisify(execFile);

export type VideoSpecPass = '1' | '2' | 'both';
export type NarrativeMode = 'off' | 'heuristic' | 'llm';

export interface AnalyzeVideoToVideoSpecV1Options {
  inputPath: string;
  /**
   * Optional higher-level source label for `meta.source` (e.g. original URL).
   * The analyzer still reads frames/audio from `inputPath` (local file).
   */
  inputSource?: string;
  /**
   * Optional provenance entries from ingestion/downloading before analysis.
   */
  provenanceSeed?: { modules?: Record<string, string>; notes?: string[] };
  outputPath?: string;
  pass?: VideoSpecPass;
  cache?: boolean;
  cacheDir?: string;
  /** Limit processing to the first N seconds (dev/fast). */
  maxSeconds?: number;

  // Shot detection
  shotDetector?: 'auto' | 'pyscenedetect' | 'ffmpeg';
  shotThreshold?: number;

  // OCR
  ocr?: boolean;
  ocrFps?: number;
  /** OCR region from the bottom of the frame; defaults to caption-friendly crop. */
  ocrCrop?: { yRatio: number; heightRatio: number };
  /**
   * Detect and extract "inserted content blocks" (e.g. screenshots of Reddit/chat/browser UIs)
   * as structured segments with best-effort OCR. Disabled when `ocr` is disabled.
   */
  insertedContent?: boolean;

  // ASR
  asr?: boolean;
  asrModel?: 'tiny' | 'base' | 'small' | 'medium' | 'large';

  // Narrative
  narrative?: NarrativeMode;
  llmProvider?: LLMProvider;
}

function nowIso(): string {
  return new Date().toISOString();
}

function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function mseFramesRegion(
  a: { width: number; height: number; data: Float32Array },
  b: typeof a,
  region: { x0: number; y0: number; x1: number; y1: number }
): number {
  if (a.width !== b.width || a.height !== b.height) return Number.POSITIVE_INFINITY;
  const w = a.width;
  const h = a.height;
  const x0 = Math.max(0, Math.min(w, Math.floor(region.x0)));
  const y0 = Math.max(0, Math.min(h, Math.floor(region.y0)));
  const x1 = Math.max(0, Math.min(w, Math.ceil(region.x1)));
  const y1 = Math.max(0, Math.min(h, Math.ceil(region.y1)));
  const rw = Math.max(0, x1 - x0);
  const rh = Math.max(0, y1 - y0);
  if (rw === 0 || rh === 0) return Number.POSITIVE_INFINITY;
  let sum = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    const row = y * w;
    for (let x = x0; x < x1; x++) {
      const idx = row + x;
      const d = (a.data[idx] ?? 0) - (b.data[idx] ?? 0);
      sum += d * d;
      n++;
    }
  }
  return n > 0 ? sum / n : Number.POSITIVE_INFINITY;
}

function edgeDensityRegion(
  frame: { width: number; height: number; data: Float32Array },
  region: { x0: number; y0: number; x1: number; y1: number }
): number {
  const w = frame.width;
  const h = frame.height;
  if (w < 3 || h < 3) return 0;

  // Need 1px border for gradient; clamp into [1..w-2], [1..h-2].
  const x0 = Math.max(1, Math.min(w - 2, Math.floor(region.x0)));
  const y0 = Math.max(1, Math.min(h - 2, Math.floor(region.y0)));
  const x1 = Math.max(1, Math.min(w - 1, Math.ceil(region.x1)));
  const y1 = Math.max(1, Math.min(h - 1, Math.ceil(region.y1)));

  const data = frame.data;
  const threshold = 0.18;

  let edges = 0;
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const idx = y * w + x;
      const gx = Math.abs((data[idx + 1] ?? 0) - (data[idx - 1] ?? 0));
      const gy = Math.abs((data[idx + w] ?? 0) - (data[idx - w] ?? 0));
      if (gx + gy > threshold) edges++;
      n++;
    }
  }
  return n > 0 ? edges / n : 0;
}

async function sha256FileHex(path: string): Promise<string> {
  const hash = createHash('sha256');
  await new Promise<void>((resolvePromise, reject) => {
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolvePromise());
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

async function readJsonIfExists<T>(path: string): Promise<T | null> {
  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    return null;
  }
}

async function writeJsonAtomic(path: string, data: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmpPath = `${path}.${Date.now()}.tmp`;
  await writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  try {
    await rename(tmpPath, path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // On some platforms `rename` can fail if the target exists; treat this as a
    // best-effort atomic replace for cache artifacts.
    if (code === 'EEXIST' || code === 'EPERM' || code === 'ENOTEMPTY') {
      await rm(path, { force: true });
      await rename(tmpPath, path);
      return;
    }
    throw error;
  } finally {
    // If rename succeeded, the tmp path no longer exists. If it failed, clean up.
    await rm(tmpPath, { force: true });
  }
}

function dedupeSortedWithEpsilon(values: number[], epsilon = 0.02): number[] {
  const out: number[] = [];
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (out.length === 0) {
      out.push(v);
      continue;
    }
    if (Math.abs(v - out[out.length - 1]!) >= epsilon) out.push(v);
  }
  return out;
}

async function detectSceneCutsWithFfmpeg(params: {
  videoPath: string;
  threshold?: number;
  maxSeconds?: number;
  timeoutMs?: number;
}): Promise<number[]> {
  const threshold = params.threshold ?? 0.35; // ffmpeg scene score is [0..1]
  const timeoutMs = params.timeoutMs ?? 60_000;

  // Use showinfo to print pts_time for frames where select(...) passes.
  // We avoid shell quoting by escaping the comma in gt(scene\,<thr>).
  const filter = `select=gt(scene\\,${threshold}),showinfo`;

  const args: string[] = ['-hide_banner', '-loglevel', 'info', '-i', params.videoPath];
  if (typeof params.maxSeconds === 'number' && params.maxSeconds > 0) {
    args.push('-t', String(params.maxSeconds));
  }
  args.push('-vf', filter, '-an', '-f', 'null', '-');

  let stderr = '';
  try {
    const result = await execFileAsync('ffmpeg', args, { windowsHide: true, timeout: timeoutMs });
    stderr = String(result.stderr ?? '');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', 'ffmpeg is required for shot detection fallback', {
        binary: 'ffmpeg',
      });
    }
    // ffmpeg frequently exits 0 for this command, but capture output regardless.
    const e = error as { stderr?: unknown; code?: unknown };
    stderr = String(e.stderr ?? '');
    if (!stderr) {
      throw new CMError('VALIDATION_ERROR', 'ffmpeg scene detection failed', {
        videoPath: params.videoPath,
        threshold,
      });
    }
  }

  const times: number[] = [];
  for (const line of stderr.split('\n')) {
    const m = /pts_time:([0-9.]+)/.exec(line);
    if (!m) continue;
    const t = Number(m[1]);
    if (Number.isFinite(t) && t >= 0) times.push(t);
  }

  times.sort((a, b) => a - b);
  return dedupeSortedWithEpsilon(times);
}

async function probeVideoFrameRate(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      [
        '-v',
        'error',
        '-select_streams',
        'v:0',
        '-show_entries',
        'stream=r_frame_rate',
        '-of',
        'default=noprint_wrappers=1:nokey=1',
        videoPath,
      ],
      { windowsHide: true, timeout: 10_000 }
    );
    const raw = String(stdout ?? '').trim();
    if (!raw) return 30;
    const m = /^(\d+)(?:\/(\d+))?$/.exec(raw);
    if (!m) return 30;
    const num = Number(m[1]);
    const den = m[2] ? Number(m[2]) : 1;
    if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return 30;
    const fps = num / den;
    return Number.isFinite(fps) && fps > 0 ? fps : 30;
  } catch {
    return 30;
  }
}

function buildShotsFromCuts(params: { durationSeconds: number; cutTimesSeconds: number[] }): Array<{
  id: number;
  start: number;
  end: number;
  transition_in?: string;
}> {
  const duration = Math.max(0, params.durationSeconds);
  const cuts = params.cutTimesSeconds
    .map((t) => Number(t))
    .filter((t) => Number.isFinite(t) && t > 0 && t < duration)
    .sort((a, b) => a - b);

  const boundaries = [0, ...dedupeSortedWithEpsilon(cuts, 0.03), duration];
  const shots: Array<{ id: number; start: number; end: number; transition_in?: string }> = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i]!;
    const end = boundaries[i + 1]!;
    if (end <= start) continue;
    shots.push({
      id: shots.length + 1,
      start,
      end,
      ...(i === 0 ? {} : { transition_in: 'cut' }),
    });
  }
  return shots;
}

function classifyPacing(avgShotDuration: number): 'very_fast' | 'fast' | 'moderate' | 'slow' {
  if (avgShotDuration < 1.0) return 'very_fast';
  if (avgShotDuration < 2.0) return 'fast';
  if (avgShotDuration < 4.0) return 'moderate';
  return 'slow';
}

function overlapsAnySegment(
  range: { start: number; end: number },
  segments: Array<{ start: number; end: number }>
): boolean {
  for (const seg of segments) {
    if (seg.end <= range.start) continue;
    if (seg.start >= range.end) continue;
    return true;
  }
  return false;
}

function buildTranscriptSegmentsFromWords(params: {
  words: Array<{ word: string; start: number; end: number; confidence?: number }>;
  speaker?: string;
}): VideoSpecTranscriptSegment[] {
  const speaker = params.speaker;
  const words = params.words.filter((w) => Number.isFinite(w.start) && Number.isFinite(w.end));
  if (words.length === 0) return [];

  const segments: VideoSpecTranscriptSegment[] = [];
  const maxSegmentSeconds = 4.0;
  const softBreakRegex = /[.?!]$/;

  let current: { start: number; end: number; parts: string[]; confs: number[] } | null = null;

  function flush(): void {
    if (!current) return;
    const text = current.parts.join(' ').replace(/\s+/g, ' ').trim();
    if (text) {
      segments.push({
        start: current.start,
        end: current.end,
        ...(speaker ? { speaker } : {}),
        text,
        confidence: current.confs.length > 0 ? mean(current.confs) : undefined,
      });
    }
    current = null;
  }

  for (const w of words) {
    if (!current) {
      current = { start: w.start, end: w.end, parts: [w.word], confs: [] };
      if (typeof w.confidence === 'number') current.confs.push(w.confidence);
      continue;
    }

    const wouldExceed = w.end - current.start > maxSegmentSeconds;
    if (wouldExceed) flush();

    if (!current) {
      current = { start: w.start, end: w.end, parts: [w.word], confs: [] };
      if (typeof w.confidence === 'number') current.confs.push(w.confidence);
      continue;
    }

    current.parts.push(w.word);
    current.end = Math.max(current.end, w.end);
    if (typeof w.confidence === 'number') current.confs.push(w.confidence);

    const last = w.word.trim();
    if (softBreakRegex.test(last)) {
      flush();
    }
  }

  flush();
  return segments;
}

async function extractAudioWav16k(params: {
  videoPath: string;
  maxSeconds?: number;
}): Promise<{ audioPath: string; cleanup: () => Promise<void> }> {
  const audioPath = join(tmpdir(), `cm-videospec-audio-${Date.now()}-${Math.random()}.wav`);
  const args: string[] = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    params.videoPath,
    '-vn',
    '-acodec',
    'pcm_s16le',
    '-ar',
    '16000',
    '-ac',
    '1',
    '-y',
    audioPath,
  ];
  if (typeof params.maxSeconds === 'number' && params.maxSeconds > 0) {
    // Cap from start for fast iteration.
    args.splice(5, 0, '-t', String(params.maxSeconds));
  }

  await execFfmpeg(args, { dependencyMessage: 'ffmpeg is required for audio extraction' });
  return { audioPath, cleanup: async () => rm(audioPath, { force: true }) };
}

async function extractOcrFrames(params: {
  videoPath: string;
  fps: number;
  crop: { yRatio: number; heightRatio: number };
  maxSeconds?: number;
}): Promise<{
  framesDir: string;
  frameCount: number;
  fps: number;
  cleanup: () => Promise<void>;
}> {
  const framesDir = join(tmpdir(), `cm-videospec-frames-${Date.now()}-${Math.random()}`);
  await mkdir(framesDir, { recursive: true });

  const info = await probeVideoWithFfprobe(params.videoPath);
  const cropY = Math.floor(info.height * params.crop.yRatio);
  const cropH = Math.floor(info.height * params.crop.heightRatio);
  const width = info.width;

  const args: string[] = ['-hide_banner', '-loglevel', 'error', '-i', params.videoPath];
  if (typeof params.maxSeconds === 'number' && params.maxSeconds > 0) {
    args.push('-t', String(params.maxSeconds));
  }
  args.push(
    '-vf',
    `fps=${params.fps},crop=${width}:${cropH}:0:${cropY}`,
    '-q:v',
    '2',
    join(framesDir, 'frame_%06d.png')
  );

  await execFfmpeg(args, { dependencyMessage: 'ffmpeg is required for OCR frame extraction' });
  // Count frames by asking ffmpeg? Avoid fs.readdirSync in hot path; this is fine for short videos.
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(framesDir)).filter((f) => f.endsWith('.png')).sort();

  return {
    framesDir,
    frameCount: files.length,
    fps: params.fps,
    cleanup: async () => rm(framesDir, { recursive: true, force: true }),
  };
}

type OcrFrame = { t: number; text: string; confidence?: number };

async function extractPngFrameAtTime(params: {
  videoPath: string;
  timeSeconds: number;
  outPath: string;
}): Promise<void> {
  const t = Math.max(0, params.timeSeconds);
  const args: string[] = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-ss',
    String(t),
    '-i',
    params.videoPath,
    '-frames:v',
    '1',
    '-q:v',
    '2',
    '-y',
    params.outPath,
  ];

  await execFfmpeg(args, { dependencyMessage: 'ffmpeg is required for frame extraction' });
}

async function cropPngWithFfmpeg(params: {
  inputPath: string;
  outPath: string;
  cropPx: { x: number; y: number; w: number; h: number };
  scale?: number;
}): Promise<void> {
  const crop = params.cropPx;
  const w = Math.max(1, Math.floor(crop.w));
  const h = Math.max(1, Math.floor(crop.h));
  const x = Math.max(0, Math.floor(crop.x));
  const y = Math.max(0, Math.floor(crop.y));
  const scale =
    typeof params.scale === 'number' && Number.isFinite(params.scale) && params.scale > 0
      ? params.scale
      : 1;

  const filters = [`crop=${w}:${h}:${x}:${y}`];
  if (scale !== 1) {
    // Keep aspect ratio, just scale by a factor for better OCR on small crops.
    filters.push(`scale=iw*${scale}:ih*${scale}:flags=lanczos`);
  }

  const args: string[] = [
    '-hide_banner',
    '-loglevel',
    'error',
    '-i',
    params.inputPath,
    '-vf',
    filters.join(','),
    '-frames:v',
    '1',
    '-q:v',
    '2',
    '-y',
    params.outPath,
  ];

  await execFfmpeg(args, { dependencyMessage: 'ffmpeg is required for image cropping' });
}

async function runTesseractOcr(
  framesDir: string,
  fps: number,
  params?: { psm?: number; whitelist?: string }
): Promise<OcrFrame[]> {
  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(framesDir)).filter((f) => f.endsWith('.png')).sort();

  const { worker } = await createTesseractWorkerEng({
    dependencyMessage: 'tesseract.js is required for videospec OCR',
  });
  try {
    const ocrParams: Record<string, string> = {};
    if (typeof params?.psm === 'number' && Number.isFinite(params.psm)) {
      ocrParams.tessedit_pageseg_mode = String(Math.floor(params.psm));
    }
    if (typeof params?.whitelist === 'string' && params.whitelist.trim()) {
      ocrParams.tessedit_char_whitelist = params.whitelist;
    }
    if (Object.keys(ocrParams).length > 0) {
      await (worker as any).setParameters(ocrParams);
    }
  } catch {
    // Ignore: some tesseract.js environments don't support all parameters.
  }

  const out: OcrFrame[] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i]!;
    const framePath = join(framesDir, file);
    const t = i / fps;
    const result = await (worker as any).recognize(framePath);
    const data = result.data as { text?: string; confidence?: number };
    const text = String(data.text ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    const conf =
      typeof data.confidence === 'number' && Number.isFinite(data.confidence)
        ? clampNumber(data.confidence / 100, 0, 1)
        : undefined;
    out.push({ t, text, ...(conf !== undefined ? { confidence: conf } : {}) });
  }

  await (worker as any).terminate();
  return out;
}

type InsertedContentOcrKeyframe = {
  time: number;
  text: string;
  confidence?: number;
  words?: Array<{ text: string; bbox: [number, number, number, number]; confidence?: number }>;
};

type TesseractBBox = { x0: number; y0: number; x1: number; y1: number };
type TesseractWordLike = { text?: string; confidence?: number; bbox?: TesseractBBox };

function normalizeTesseractText(text: unknown): string {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTesseractConfidence(confidence: unknown): number | undefined {
  return typeof confidence === 'number' && Number.isFinite(confidence)
    ? clampNumber(confidence / 100, 0, 1)
    : undefined;
}

function toNormalizedWord(params: {
  word: TesseractWordLike;
  frameWidth: number;
  frameHeight: number;
}): { text: string; bbox: [number, number, number, number]; confidence?: number } | null {
  const wt = normalizeTesseractText(params.word.text);
  if (!wt) return null;

  const b = params.word.bbox;
  if (!b) return null;

  const x = clampNumber(b.x0 / params.frameWidth, 0, 1);
  const y = clampNumber(b.y0 / params.frameHeight, 0, 1);
  const ww = clampNumber((b.x1 - b.x0) / params.frameWidth, 0, 1);
  const hh = clampNumber((b.y1 - b.y0) / params.frameHeight, 0, 1);
  const wc = normalizeTesseractConfidence(params.word.confidence);

  return {
    text: wt,
    bbox: [x, y, ww, hh],
    ...(wc !== undefined ? { confidence: wc } : {}),
  };
}

function flattenTesseractBlocks(
  blocks: Array<{
    paragraphs?: Array<{
      lines?: Array<{
        words?: TesseractWordLike[];
      }>;
    }>;
  }>
): TesseractWordLike[] {
  return blocks
    .flatMap((b) => b.paragraphs ?? [])
    .flatMap((p) => p.lines ?? [])
    .flatMap((l) => l.words ?? []);
}

function extractInsertedContentWords(params: {
  data: { words?: TesseractWordLike[]; blocks?: unknown };
  frameWidth: number;
  frameHeight: number;
  maxWords: number;
}): Array<{ text: string; bbox: [number, number, number, number]; confidence?: number }> {
  const out: Array<{ text: string; bbox: [number, number, number, number]; confidence?: number }> =
    [];

  const pushWord = (w: TesseractWordLike): void => {
    if (out.length >= params.maxWords) return;
    const normalized = toNormalizedWord({
      word: w,
      frameWidth: params.frameWidth,
      frameHeight: params.frameHeight,
    });
    if (!normalized) return;
    out.push(normalized);
  };

  // Prefer nested `blocks` output (most stable in tesseract.js).
  if (Array.isArray(params.data.blocks)) {
    for (const w of flattenTesseractBlocks(params.data.blocks as any)) {
      pushWord(w);
      if (out.length >= params.maxWords) break;
    }
    return out;
  }

  // Fallback for environments where `data.words` is available.
  for (const w of (params.data.words ?? []).slice(0, params.maxWords)) pushWord(w);
  return out;
}

async function ocrImagesWithTesseract(params: {
  images: Array<{ time: number; path: string }>;
  frameWidth: number;
  frameHeight: number;
  maxWords?: number;
}): Promise<InsertedContentOcrKeyframe[]> {
  const { worker } = await createTesseractWorkerEng({
    dependencyMessage: 'tesseract.js is required for videospec OCR',
  });

  const out: InsertedContentOcrKeyframe[] = [];
  for (const img of params.images) {
    // `tesseract.js` does not populate `data.words` by default; request block output so we can
    // extract word-level bboxes for region localization.
    const result = await (worker as any).recognize(img.path, {}, { text: true, blocks: true });
    const data = result.data as { text?: unknown; confidence?: unknown; words?: any; blocks?: any };

    const text = normalizeTesseractText(data.text);
    const conf = normalizeTesseractConfidence(data.confidence);

    const maxWords = Math.max(0, Math.min(2000, params.maxWords ?? 400));
    const words = extractInsertedContentWords({
      data,
      frameWidth: params.frameWidth,
      frameHeight: params.frameHeight,
      maxWords,
    });

    out.push({
      time: img.time,
      text,
      ...(conf !== undefined ? { confidence: conf } : {}),
      ...(words.length > 0 ? { words } : {}),
    });
  }

  await (worker as any).terminate();
  return out;
}

function groupOcrFramesIntoSegments(params: { frames: OcrFrame[]; fps: number }): Array<{
  start: number;
  end: number;
  text: string;
  confidence?: number;
}> {
  const frames = [...params.frames].sort((a, b) => a.t - b.t);
  if (frames.length === 0) return [];

  const segments: Array<{ start: number; end: number; text: string; confs: number[] }> = [];
  const frameStep = 1 / params.fps;

  let current: { start: number; end: number; text: string; confs: number[] } | null = null;
  for (const f of frames) {
    if (!current) {
      current = { start: f.t, end: f.t + frameStep, text: f.text, confs: [] };
      if (typeof f.confidence === 'number') current.confs.push(f.confidence);
      continue;
    }

    const same =
      normalizeWord(current.text) === normalizeWord(f.text) ||
      isFuzzyMatch(current.text, f.text, 0.9);

    if (!same) {
      segments.push(current);
      current = { start: f.t, end: f.t + frameStep, text: f.text, confs: [] };
      if (typeof f.confidence === 'number') current.confs.push(f.confidence);
      continue;
    }

    current.end = Math.max(current.end, f.t + frameStep);
    if (typeof f.confidence === 'number') current.confs.push(f.confidence);
  }

  if (current) segments.push(current);

  return segments.map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text,
    confidence: s.confs.length > 0 ? mean(s.confs) : undefined,
  }));
}

type OcrTextMetrics = {
  charCount: number;
  tokenCount: number;
  hasLetter: boolean;
  alnumRatio: number;
  weirdRatio: number;
};

function computeOcrTextMetrics(text: string): OcrTextMetrics {
  const trimmed = String(text ?? '').trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const tokenCount = tokens.length;

  const compact = trimmed.replace(/\s+/g, '');
  const charCount = compact.length;

  const alnum = (compact.match(/[a-z0-9]/gi) ?? []).length;
  const hasLetter = /[a-z]/i.test(compact);
  const weird = (compact.match(/[^a-z0-9.,!?'"\\:\\-]/gi) ?? []).length;

  const denom = Math.max(1, charCount);
  return {
    charCount,
    tokenCount,
    hasLetter,
    alnumRatio: alnum / denom,
    weirdRatio: weird / denom,
  };
}

function shouldKeepCaptionCandidate(params: { text: string; confidence?: number }): boolean {
  const m = computeOcrTextMetrics(params.text);
  if (!params.text.trim()) return false;
  if (m.charCount < 2) return false;
  // Avoid obviously broken OCR spew; captions can be multi-word but rarely thousands of chars.
  if (m.charCount > 260) return false;
  if (!m.hasLetter) return false;
  if (m.alnumRatio < 0.35) return false;
  if (m.weirdRatio > 0.35) return false;
  if (typeof params.confidence === 'number' && params.confidence < 0.2) return false;
  return true;
}

function shouldKeepOverlayCandidate(params: { text: string; confidence?: number }): boolean {
  const t = params.text.trim();
  const m = computeOcrTextMetrics(t);
  if (!t) return false;

  // Overlay words/phrases should be short and readable.
  if (m.charCount > 80) return false;
  if (m.tokenCount > 6) return false;
  if (!m.hasLetter) return false;
  if (m.alnumRatio < 0.45) return false;
  if (m.weirdRatio > 0.25) return false;

  // Two-letter overlays exist ("of"), but keep them only if OCR is confident.
  if (m.charCount <= 2) {
    if (typeof params.confidence !== 'number') return false;
    if (params.confidence < 0.6) return false;
  } else if (typeof params.confidence === 'number' && params.confidence < 0.25) {
    return false;
  }

  return true;
}

function overlapSeconds(
  a: { start: number; end: number },
  b: { start: number; end: number }
): number {
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
}

function pickOverlayConfidence(a?: number, b?: number): number | undefined {
  if (typeof a !== 'number' && typeof b !== 'number') return undefined;
  if (typeof a !== 'number') return b;
  if (typeof b !== 'number') return a;
  return Math.max(a, b);
}

function dedupeTextOverlays(overlays: VideoSpecTextOverlay[]): VideoSpecTextOverlay[] {
  const sorted = [...overlays].sort((a, b) => a.start - b.start || a.end - b.end);
  const out: VideoSpecTextOverlay[] = [];

  for (const overlay of sorted) {
    const last = out[out.length - 1];
    if (!last) {
      out.push(overlay);
      continue;
    }

    const overlap = overlapSeconds(last, overlay);
    const denom = Math.max(0.001, Math.min(last.end - last.start, overlay.end - overlay.start));
    const overlapRatio = overlap / denom;
    const sameText =
      normalizeWord(last.text) === normalizeWord(overlay.text) ||
      isFuzzyMatch(last.text, overlay.text, 0.9);

    if (!sameText || overlapRatio < 0.6) {
      out.push(overlay);
      continue;
    }

    // Merge duplicates from multiple OCR crops/passes.
    const preferIncoming =
      (overlay.confidence ?? 0) > (last.confidence ?? 0) ||
      (last.position === 'bottom' && overlay.position && overlay.position !== 'bottom');

    const merged: VideoSpecTextOverlay = {
      text: last.text,
      start: Math.min(last.start, overlay.start),
      end: Math.max(last.end, overlay.end),
      position: preferIncoming
        ? (overlay.position ?? last.position)
        : (last.position ?? overlay.position),
      note: preferIncoming ? (overlay.note ?? last.note) : (last.note ?? overlay.note),
      confidence: pickOverlayConfidence(last.confidence, overlay.confidence),
    };
    out[out.length - 1] = merged;
  }

  return out;
}

function findBestOverlappingTranscriptSegment(
  segments: VideoSpecTranscriptSegment[],
  start: number,
  end: number
): VideoSpecTranscriptSegment | null {
  let best: VideoSpecTranscriptSegment | null = null;
  let bestOverlap = 0;
  for (const seg of segments) {
    const overlap = Math.max(0, Math.min(seg.end, end) - Math.max(seg.start, start));
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = seg;
    }
  }
  return best;
}

function classifyOcrSegmentAsCaption(params: {
  text: string;
  start: number;
  end: number;
  transcript: VideoSpecTranscriptSegment[];
}): { isCaption: boolean; speaker?: string } {
  const seg = findBestOverlappingTranscriptSegment(params.transcript, params.start, params.end);
  if (!seg) return { isCaption: false };

  // Fuzzy-match the OCR text against overlapping transcript text.
  const ocrNorm = normalizeWord(params.text);
  const trNorm = normalizeWord(seg.text);
  const isCaption = Boolean(ocrNorm) && Boolean(trNorm) && isFuzzyMatch(ocrNorm, trNorm, 0.55);
  return { isCaption, speaker: seg.speaker };
}

function inferThemes(text: string, maxThemes = 6): string[] | undefined {
  const stop = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'is',
    'it',
    'this',
    'that',
    'i',
    'you',
    'we',
    'they',
    'he',
    'she',
    'my',
    'your',
    'our',
    'their',
    'be',
    'are',
    'was',
    'were',
    'as',
    'at',
    'by',
    'from',
    'but',
    'so',
    'if',
    'then',
    'not',
  ]);

  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !stop.has(t));

  if (tokens.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxThemes)
    .map(([t]) => t);
}

function inferNarrativeHeuristic(params: {
  duration: number;
  shots: Array<{ start: number; end: number }>;
  transcript: VideoSpecTranscriptSegment[];
  ocrText: string[];
}): VideoSpecV1['narrative'] {
  const duration = Math.max(0, params.duration);
  const firstCut = params.shots.length >= 2 ? params.shots[0]!.end : null;

  const hookEndCandidate = firstCut ? Math.min(firstCut, 3.0) : Math.min(duration * 0.2, 3.0);
  const hookEndBase = clampNumber(hookEndCandidate, 0, duration);
  // Ensure the hook isn't trivially tiny when the video is long enough.
  const hookEnd = duration >= 0.5 ? Math.max(0.5, hookEndBase) : hookEndBase;

  const payoffStart = clampNumber(Math.max(hookEnd, duration * 0.75), hookEnd, duration);
  const payoffEnd = duration;

  const transcriptText = params.transcript.map((s) => s.text).join(' ');
  const themes = inferThemes(transcriptText);

  const allText = `${transcriptText} ${params.ocrText.join(' ')}`.toLowerCase();
  const cta = /\b(follow|subscribe|like and subscribe|link in bio|comment|share)\b/.test(allText)
    ? 'cta_detected'
    : undefined;

  function describeRange(start: number, end: number, fallback: string): string {
    const segs = params.transcript.filter((s) => s.start < end && s.end > start);
    const snippet = segs
      .map((s) => s.text)
      .join(' ')
      .trim();
    if (snippet) return snippet.slice(0, 220);
    return fallback;
  }

  return {
    arc: {
      hook: {
        start: 0,
        end: hookEnd,
        description: describeRange(0, hookEnd, 'Opening hook segment.'),
      },
      escalation: {
        start: hookEnd,
        end: payoffStart,
        description: describeRange(hookEnd, payoffStart, 'Build-up / escalation segment.'),
      },
      payoff: {
        start: payoffStart,
        end: payoffEnd,
        description: describeRange(payoffStart, payoffEnd, 'Payoff / climax segment.'),
      },
    },
    ...(themes ? { themes } : {}),
    ...(cta ? { cta } : {}),
  };
}

function inferNarrativeDisabled(duration: number): VideoSpecV1['narrative'] {
  // Narrative is required by the v1 schema; "off" means: do not attempt analysis,
  // but emit a stable placeholder so downstream consumers can rely on the key.
  const d = Math.max(0, Number(duration) || 0);
  const hookEnd = clampNumber(Math.min(d, Math.max(0, Math.min(1.5, d * 0.2))), 0, d);
  const payoffStart = clampNumber(Math.max(hookEnd, d * 0.75), hookEnd, d);
  const desc = 'Narrative analysis disabled.';
  return {
    arc: {
      hook: { start: 0, end: hookEnd, description: desc },
      escalation: { start: hookEnd, end: payoffStart, description: desc },
      payoff: { start: payoffStart, end: d, description: desc },
    },
  };
}

async function inferNarrativeWithLLM(params: {
  llm: LLMProvider;
  duration: number;
  transcript: VideoSpecTranscriptSegment[];
  shots: Array<{ start: number; end: number }>;
}): Promise<VideoSpecV1['narrative']> {
  const transcript = params.transcript
    .map((s) => `[${s.start.toFixed(2)}-${s.end.toFixed(2)}] ${s.text}`)
    .join('\n')
    .slice(0, 12_000);

  const shots = params.shots
    .slice(0, 80)
    .map((s, i) => `${i + 1}. ${s.start.toFixed(2)}-${s.end.toFixed(2)}`)
    .join('\n');

  const prompt = [
    'You are labeling a short-form video narrative arc.',
    'Return STRICT JSON with keys: arc (hook/escalation/payoff each has start,end,description), and optional keys: format, cta, themes, tone.',
    'Rules:',
    '- times are in seconds, 0 <= start <= end <= duration',
    '- keep descriptions short (<= 30 words each)',
    '',
    `duration=${params.duration}`,
    '',
    'shots:',
    shots,
    '',
    'transcript:',
    transcript,
  ].join('\n');

  const resp = await params.llm.chat(
    [
      { role: 'system', content: 'Return only valid JSON.' },
      { role: 'user', content: prompt },
    ],
    { temperature: 0, jsonMode: true, maxTokens: 700 }
  );

  const parsed = JSON.parse(resp.content) as unknown;
  const NarrativeSchema = VideoSpecV1Schema.shape.narrative;
  return NarrativeSchema.parse(parsed);
}

interface AnalyzeContext {
  cfg: ReturnType<typeof loadConfig>;
  inputPath: string;
  cacheEnabled: boolean;
  videoCacheDir: string;
  info: Awaited<ReturnType<typeof probeVideoWithFfprobe>>;
  frameRate: number;
  stat: { size: number };
  durationSeconds: number;
}

type OcrSegment = { start: number; end: number; text: string; confidence?: number };

async function createAnalyzeContext(
  options: AnalyzeVideoToVideoSpecV1Options
): Promise<AnalyzeContext> {
  const cfg = loadConfig();
  const inputPath = resolve(options.inputPath);
  const cacheEnabled = options.cache ?? true;
  const cacheRoot = resolveVideoSpecCacheDir(options.cacheDir);

  const info = await probeVideoWithFfprobe(inputPath);
  const frameRate = await probeVideoFrameRate(inputPath);
  const stat = await (await import('node:fs/promises')).stat(inputPath);

  const durationSeconds =
    typeof options.maxSeconds === 'number' && options.maxSeconds > 0
      ? Math.min(info.durationSeconds, options.maxSeconds)
      : info.durationSeconds;

  const videoHash = await sha256FileHex(inputPath);
  const videoKey = `${videoHash.slice(0, 16)}-${stat.size}`;
  const videoCacheDir = join(cacheRoot, videoKey);

  return { cfg, inputPath, cacheEnabled, videoCacheDir, info, frameRate, stat, durationSeconds };
}

async function analyzeTimeline(params: {
  ctx: AnalyzeContext;
  options: AnalyzeVideoToVideoSpecV1Options;
  provenanceModules: Record<string, string>;
  provenanceNotes: string[];
}): Promise<{
  shots: Array<{ id: number; start: number; end: number; transition_in?: string }>;
  pacing: VideoSpecV1['timeline']['pacing'];
}> {
  const { ctx, options, provenanceModules, provenanceNotes } = params;
  const shotDetector = options.shotDetector ?? 'auto';
  const pyThreshold = options.shotThreshold ?? 30;
  const ffThreshold = 0.35;

  const cutsCachePath = join(ctx.videoCacheDir, 'shots.v1.json');
  let cutTimesSeconds: number[] | null = ctx.cacheEnabled
    ? await readJsonIfExists<number[]>(cutsCachePath)
    : null;

  if (cutTimesSeconds) {
    provenanceModules.shot_detection = 'cache';
  } else {
    const wantsPy = shotDetector === 'pyscenedetect' || shotDetector === 'auto';
    const wantsFf = shotDetector === 'ffmpeg' || shotDetector === 'auto';

    if (wantsPy) {
      try {
        cutTimesSeconds = await detectSceneCutsWithPySceneDetect({
          videoPath: ctx.inputPath,
          threshold: pyThreshold,
          timeoutMs: 30_000,
        });
        provenanceModules.shot_detection = `PySceneDetect ContentDetector (threshold=${pyThreshold})`;
      } catch (error) {
        provenanceNotes.push(
          `Shot detection: PySceneDetect unavailable/failed; falling back to ffmpeg. (${error instanceof Error ? error.message : String(error)})`
        );
        cutTimesSeconds = null;
      }
    }

    if (!cutTimesSeconds && wantsFf) {
      cutTimesSeconds = await detectSceneCutsWithFfmpeg({
        videoPath: ctx.inputPath,
        threshold: ffThreshold,
        maxSeconds: options.maxSeconds,
      });
      provenanceModules.shot_detection = `ffmpeg select(scene>${ffThreshold})`;
    }

    cutTimesSeconds ??= [];
    if (ctx.cacheEnabled) await writeJsonAtomic(cutsCachePath, cutTimesSeconds);
  }

  const shots = buildShotsFromCuts({ durationSeconds: ctx.durationSeconds, cutTimesSeconds });
  const durations = shots.map((s) => s.end - s.start).filter((d) => d > 0);
  const avgShot = mean(durations);
  const medShot = median(durations);
  const fastest = durations.length > 0 ? Math.min(...durations) : 0;
  const slowest = durations.length > 0 ? Math.max(...durations) : 0;

  return {
    shots,
    pacing: {
      shot_count: shots.length,
      avg_shot_duration: avgShot,
      median_shot_duration: medShot,
      fastest_shot_duration: fastest,
      slowest_shot_duration: slowest,
      classification: classifyPacing(avgShot),
    },
  };
}

async function analyzeTranscript(params: {
  ctx: AnalyzeContext;
  options: AnalyzeVideoToVideoSpecV1Options;
  provenanceModules: Record<string, string>;
  provenanceNotes: string[];
}): Promise<VideoSpecTranscriptSegment[]> {
  const { ctx, options, provenanceModules, provenanceNotes } = params;
  const asrEnabled = options.asr ?? true;

  if (!asrEnabled) {
    provenanceModules.asr = 'disabled';
    return [];
  }

  const transcriptCachePath = join(ctx.videoCacheDir, 'audio.transcript.v1.json');
  const cached = ctx.cacheEnabled
    ? await readJsonIfExists<VideoSpecTranscriptSegment[]>(transcriptCachePath)
    : null;
  if (cached) {
    provenanceModules.asr = 'cache';
    return cached
      .map((s) => ({
        ...s,
        start: clampNumber(s.start, 0, ctx.durationSeconds),
        end: clampNumber(s.end, 0, ctx.durationSeconds),
      }))
      .filter((s) => s.end > s.start);
  }

  try {
    const { audioPath, cleanup } = await extractAudioWav16k({
      videoPath: ctx.inputPath,
      maxSeconds: options.maxSeconds,
    });
    try {
      const model = options.asrModel ?? ctx.cfg.audio?.asrModel ?? 'base';
      const asr = await transcribeAudio({ audioPath, model, requireWhisper: false });
      provenanceModules.asr = `${asr.engine} (${model})`;
      const transcript = buildTranscriptSegmentsFromWords({
        words: asr.words,
        speaker: 'Person1',
      }).map((s) => ({ ...s, end: Math.min(s.end, ctx.durationSeconds) }));
      if (ctx.cacheEnabled) await writeJsonAtomic(transcriptCachePath, transcript);
      return transcript;
    } finally {
      await cleanup();
    }
  } catch (error) {
    provenanceNotes.push(
      `ASR failed or whisper not installed; transcript omitted. (${error instanceof Error ? error.message : String(error)})`
    );
    provenanceModules.asr = 'unavailable';
    return [];
  }
}

function maybeNoteOcrRefineFallback(params: {
  pass: AnalyzeVideoToVideoSpecV1Options['pass'] | undefined;
  ocrEnabled: boolean;
  ocrRefineSegments: OcrSegment[] | null;
  provenanceNotes: string[];
}) {
  const pass = params.pass ?? '1';
  if (pass !== 'both') return;
  if (!params.ocrEnabled) return;
  if (params.ocrRefineSegments && params.ocrRefineSegments.length > 0) return;
  params.provenanceNotes.push('OCR refine pass yielded no segments; using pass 1 OCR.');
}

function processBottomOcrSegments(params: {
  segments: OcrSegment[];
  transcript: VideoSpecTranscriptSegment[];
}): { captions: VideoSpecCaption[]; textOverlays: VideoSpecTextOverlay[]; ocrTexts: string[] } {
  const captions: VideoSpecCaption[] = [];
  const textOverlays: VideoSpecTextOverlay[] = [];
  const ocrTexts: string[] = [];

  for (const seg of params.segments) {
    if (!shouldKeepCaptionCandidate(seg)) continue;

    const cls = classifyOcrSegmentAsCaption({
      text: seg.text,
      start: seg.start,
      end: seg.end,
      transcript: params.transcript,
    });
    if (cls.isCaption) {
      captions.push({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        ...(cls.speaker ? { speaker: cls.speaker } : {}),
        ...(seg.confidence !== undefined ? { confidence: seg.confidence } : {}),
      });
      ocrTexts.push(seg.text);
      continue;
    }

    if (!shouldKeepOverlayCandidate(seg)) continue;
    textOverlays.push({
      text: seg.text,
      start: seg.start,
      end: seg.end,
      position: 'bottom',
      ...(seg.confidence !== undefined ? { confidence: seg.confidence } : {}),
    });
    ocrTexts.push(seg.text);
  }

  return { captions, textOverlays, ocrTexts };
}

function processCenterOcrSegments(params: { segments: OcrSegment[] }): {
  textOverlays: VideoSpecTextOverlay[];
  ocrTexts: string[];
} {
  const textOverlays: VideoSpecTextOverlay[] = [];
  const ocrTexts: string[] = [];
  for (const seg of params.segments) {
    if (!shouldKeepOverlayCandidate(seg)) continue;
    textOverlays.push({
      text: seg.text,
      start: seg.start,
      end: seg.end,
      position: 'center',
      ...(seg.confidence !== undefined ? { confidence: seg.confidence } : {}),
    });
    ocrTexts.push(seg.text);
  }
  return { textOverlays, ocrTexts };
}

function dedupeOcrTexts(ocrTexts: string[]): string[] {
  const textSeen = new Set<string>();
  const ocrTextsDeduped: string[] = [];
  for (const t of ocrTexts) {
    const key = normalizeWord(t);
    if (!key) continue;
    if (textSeen.has(key)) continue;
    textSeen.add(key);
    ocrTextsDeduped.push(t);
  }
  return ocrTextsDeduped;
}

async function analyzeOcr(params: {
  ctx: AnalyzeContext;
  options: AnalyzeVideoToVideoSpecV1Options;
  transcript: VideoSpecTranscriptSegment[];
  provenanceModules: Record<string, string>;
  provenanceNotes: string[];
}): Promise<{
  captions: VideoSpecCaption[];
  textOverlays: VideoSpecTextOverlay[];
  ocrTexts: string[];
}> {
  const { ctx, options, transcript, provenanceModules, provenanceNotes } = params;
  const pass = options.pass ?? '1';
  const ocrEnabled = options.ocr ?? true;
  const ocrCrop = options.ocrCrop ?? { yRatio: 0.6, heightRatio: 0.4 };
  const pass1Fps = options.ocrFps ?? 1;
  const pass2Fps = options.ocrFps ?? 2;
  const baseFps = pass === '2' ? pass2Fps : pass1Fps;

  // Burnt-in captions and "big word" overlays often live outside the bottom band.
  // Run a second OCR pass over a center crop to pick up mid-frame overlays while
  // keeping the default bottom crop optimized for subtitles.
  const overlayCrop = { yRatio: 0.2, heightRatio: 0.6 };
  const overlayBaseFps = pass === '2' || pass === 'both' ? pass2Fps : baseFps;
  const overlayFps = Math.max(2, overlayBaseFps * 2);
  const overlayWhitelist = `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'’"?!.,:- `;

  async function getOcrSegmentsForPass(params: {
    fps: number;
    crop: { yRatio: number; heightRatio: number };
    cacheLabel: 'bottom' | 'center';
    cropLabel: 'bottom' | 'center';
    moduleKey: string;
    tesseract?: { psm?: number; whitelist?: string };
  }): Promise<OcrSegment[]> {
    if (!ocrEnabled) {
      provenanceModules[params.moduleKey] = 'disabled';
      return [];
    }
    const cachePath = join(
      ctx.videoCacheDir,
      `editing.ocr.${params.cacheLabel}.${params.fps}fps.v2.json`
    );
    const cached = ctx.cacheEnabled ? await readJsonIfExists<OcrSegment[]>(cachePath) : null;
    if (cached) {
      provenanceModules[params.moduleKey] = 'cache';
      return cached
        .map((s) => ({
          ...s,
          start: clampNumber(s.start, 0, ctx.durationSeconds),
          end: clampNumber(s.end, 0, ctx.durationSeconds),
        }))
        .filter((s) => s.end > s.start);
    }
    try {
      const { framesDir, cleanup } = await extractOcrFrames({
        videoPath: ctx.inputPath,
        fps: params.fps,
        crop: params.crop,
        maxSeconds: options.maxSeconds,
      });
      try {
        const frames = await runTesseractOcr(framesDir, params.fps, params.tesseract);
        provenanceModules[params.moduleKey] =
          `tesseract.js (fps=${params.fps}, crop=${params.cropLabel})`;
        const grouped = groupOcrFramesIntoSegments({ frames, fps: params.fps }).map((s) => ({
          ...s,
          start: clampNumber(s.start, 0, ctx.durationSeconds),
          end: Math.min(s.end, ctx.durationSeconds),
        }));
        if (ctx.cacheEnabled) await writeJsonAtomic(cachePath, grouped);
        return grouped;
      } finally {
        await cleanup();
      }
    } catch (error) {
      provenanceNotes.push(
        `OCR failed; captions/overlays omitted. (${error instanceof Error ? error.message : String(error)})`
      );
      provenanceModules[params.moduleKey] = 'unavailable';
      return [];
    }
  }

  // Pass selection: pass=both runs refine and replaces pass 1 results when possible.
  const ocrSegments = await getOcrSegmentsForPass({
    fps: baseFps,
    crop: ocrCrop,
    cacheLabel: 'bottom',
    cropLabel: 'bottom',
    moduleKey: 'ocr',
    tesseract: { psm: 6 },
  });
  let ocrRefineSegments: OcrSegment[] | null = null;
  if (pass === 'both' && ocrEnabled) {
    ocrRefineSegments = await getOcrSegmentsForPass({
      fps: pass2Fps,
      crop: ocrCrop,
      cacheLabel: 'bottom',
      cropLabel: 'bottom',
      moduleKey: 'ocr_refine',
      tesseract: { psm: 6 },
    });
  }
  const segmentsToUse =
    ocrRefineSegments && ocrRefineSegments.length > 0 ? ocrRefineSegments : ocrSegments;

  const bottom = processBottomOcrSegments({ segments: segmentsToUse, transcript });
  const captions: VideoSpecCaption[] = [...bottom.captions];
  const textOverlays: VideoSpecTextOverlay[] = [...bottom.textOverlays];
  const ocrTexts: string[] = [...bottom.ocrTexts];

  // Center crop: "big word" overlays that appear mid-frame (common in Shorts/Reels).
  const overlaySegments = await getOcrSegmentsForPass({
    fps: overlayFps,
    crop: overlayCrop,
    cacheLabel: 'center',
    cropLabel: 'center',
    moduleKey: 'ocr_overlay',
    // Encourage single-line recognition for big-word overlays.
    tesseract: { psm: 7, whitelist: overlayWhitelist },
  });
  const center = processCenterOcrSegments({ segments: overlaySegments });
  textOverlays.push(...center.textOverlays);
  ocrTexts.push(...center.ocrTexts);

  maybeNoteOcrRefineFallback({
    pass,
    ocrEnabled,
    ocrRefineSegments,
    provenanceNotes,
  });

  // De-dupe noisy repeats across OCR crops/passes before emitting.
  const overlaysDeduped = dedupeTextOverlays(textOverlays);
  const ocrTextsDeduped = dedupeOcrTexts(ocrTexts);

  return { captions, textOverlays: overlaysDeduped, ocrTexts: ocrTextsDeduped };
}

function classifyInsertedContentType(text: string): {
  type: NonNullable<VideoSpecV1['inserted_content_blocks']>[number]['type'];
  confidence: number;
} {
  const t = text.toLowerCase();
  // OCR can insert spaces around punctuation; tolerate: "r / AskReddit" etc.
  if (
    /\br\s*\/\s*[a-z0-9_]+\b/.test(t) ||
    /\bu\s*\/\s*[a-z0-9_-]+\b/.test(t) ||
    t.includes('reddit') ||
    t.includes('askreddit') ||
    t.includes('subreddit')
  ) {
    return { type: 'reddit_screenshot', confidence: 0.85 };
  }
  if (/\bhttps?:\/\//.test(t) || /\bwww\./.test(t) || /\b[a-z0-9-]+\.(com|net|org)\b/.test(t)) {
    return { type: 'browser_page', confidence: 0.75 };
  }
  if (/\b(sent|delivered|typing|message|dm|pm)\b/.test(t)) {
    return { type: 'chat_screenshot', confidence: 0.65 };
  }
  return { type: 'generic_screenshot', confidence: 0.4 };
}

function computeSafeVideoEndTimeSeconds(ctx: AnalyzeContext): number {
  // ffmpeg can return 0 bytes when asked for a frame at or past the end timestamp.
  const marginSeconds = Math.max(0.05, 1 / Math.max(1, ctx.frameRate));
  return Math.max(0, ctx.durationSeconds - marginSeconds);
}

type InsertedContentSample = { t: number; confidence: number };
type InsertedContentSegment = { start: number; end: number; confs: number[] };
type InsertedContentCandidate = { start: number; end: number; avg: number };
type InsertedContentBlock = NonNullable<VideoSpecV1['inserted_content_blocks']>[number];

const INSERTED_CONTENT_BLOCKS_CACHE_VERSION = 3;

type InsertedContentBlocksCache = {
  version: number;
  blocks: InsertedContentBlock[];
};

function parseInsertedContentBlocksCache(raw: unknown): InsertedContentBlock[] | null {
  if (!raw) return null;

  // Legacy format: the cache was stored as a raw array. Treat it as stale so algorithm updates
  // don't keep reusing low-quality results across runs.
  if (Array.isArray(raw)) return null;

  if (typeof raw !== 'object' || raw === null) return null;
  const obj = raw as Partial<InsertedContentBlocksCache>;
  if (obj.version !== INSERTED_CONTENT_BLOCKS_CACHE_VERSION) return null;
  if (!Array.isArray(obj.blocks)) return null;
  return obj.blocks as InsertedContentBlock[];
}

type NormalizedRect = { x: number; y: number; w: number; h: number };

function rectArea(r: NormalizedRect): number {
  return Math.max(0, r.w) * Math.max(0, r.h);
}

function isNearFullFrameRect(r: NormalizedRect): boolean {
  const eps = 0.02;
  const x1 = r.x + r.w;
  const y1 = r.y + r.h;
  return r.x <= eps && r.y <= eps && x1 >= 1 - eps && y1 >= 1 - eps;
}

function inferInsertedContentRegionFromOcrKeyframes(params: {
  keyframes: InsertedContentOcrKeyframe[];
  minWordConfidence: number;
  minWords: number;
}): NormalizedRect | null {
  const all = params.keyframes.flatMap((k) => k.words ?? []);
  const filtered = all.filter((w) => {
    if (!/[a-z0-9]/i.test(w.text)) return false;
    if (typeof w.confidence !== 'number') return false;
    return w.confidence >= params.minWordConfidence;
  });

  if (filtered.length < params.minWords) return null;

  let x0 = 1;
  let y0 = 1;
  let x1 = 0;
  let y1 = 0;
  for (const w of filtered) {
    const [x, y, ww, hh] = w.bbox;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x + ww);
    y1 = Math.max(y1, y + hh);
  }

  if (!(x1 > x0 && y1 > y0)) return null;

  // Expand from the text union to approximate the whole inserted card/page region.
  const bw = x1 - x0;
  const bh = y1 - y0;
  const padX = Math.max(0.01, bw * 0.12);
  const padY = Math.max(0.01, bh * 0.35);

  const nx0 = clampNumber(x0 - padX, 0, 1);
  const ny0 = clampNumber(y0 - padY, 0, 1);
  const nx1 = clampNumber(x1 + padX, 0, 1);
  const ny1 = clampNumber(y1 + padY, 0, 1);

  const rect = { x: nx0, y: ny0, w: Math.max(0, nx1 - nx0), h: Math.max(0, ny1 - ny0) };
  if (rectArea(rect) <= 1e-6) return null;
  return rect;
}

function toPosixPath(p: string): string {
  return p.replace(/\\/g, '/');
}

function relPathOrNull(baseDir: string | null, absPath: string): string | null {
  if (!baseDir) return null;
  const rel = relative(baseDir, absPath);
  if (rel.startsWith('..')) return null;
  return toPosixPath(rel);
}

function shouldKeepInsertedContentBlock(block: InsertedContentBlock): boolean {
  const text = block.extraction?.ocr?.text ?? '';
  const alnumChars = text.replace(/[^a-z0-9]/gi, '').length;
  const wordCount = (block.extraction?.ocr?.words ?? []).filter((w) =>
    /[a-z0-9]/i.test(w.text)
  ).length;
  const area = block.region ? rectArea(block.region) : 1;

  // Captions often look like "inserted content" (high edges, low motion), so we aggressively
  // filter generic blocks unless we have enough text and a meaningful region size.
  if (block.type === 'generic_screenshot') {
    return alnumChars >= 30 && wordCount >= 5 && area >= 0.06;
  }

  return alnumChars >= 12 && wordCount >= 3;
}

async function sampleInsertedContentConfidence(params: {
  ctx: AnalyzeContext;
  sampleStepSeconds: number;
  sampleSize: number;
}): Promise<InsertedContentSample[]> {
  const { ctx, sampleStepSeconds, sampleSize } = params;
  const samples: InsertedContentSample[] = [];
  const safeEndTimeSeconds = computeSafeVideoEndTimeSeconds(ctx);

  let prev: Awaited<ReturnType<typeof extractGrayFrameAtTime>> | null = null;
  for (let t = 0; t < safeEndTimeSeconds + 1e-6; t += sampleStepSeconds) {
    const tt = Math.min(t, safeEndTimeSeconds);
    const frame = await extractGrayFrameAtTime({
      videoPath: ctx.inputPath,
      timeSeconds: tt,
      size: sampleSize,
    });
    // Tile-based scoring: take the mean of the top-K tiles so PiP overlays can be detected even
    // when the background has significant motion.
    const grid = 4;
    const tileScores: number[] = [];
    for (let ty = 0; ty < grid; ty++) {
      for (let tx = 0; tx < grid; tx++) {
        const x0 = Math.floor((tx * frame.width) / grid);
        const x1 = Math.floor(((tx + 1) * frame.width) / grid);
        const y0 = Math.floor((ty * frame.height) / grid);
        const y1 = Math.floor(((ty + 1) * frame.height) / grid);
        const region = { x0, y0, x1, y1 };
        const e = edgeDensityRegion(frame, region);
        const motion = prev ? mseFramesRegion(frame, prev, region) : 0;

        const edgeNorm = clampNumber((e - 0.05) / 0.18, 0, 1);
        const motionPenalty = clampNumber(motion / 0.04, 0, 1);
        tileScores.push(clampNumber(edgeNorm * (1 - motionPenalty), 0, 1));
      }
    }

    tileScores.sort((a, b) => b - a);
    const topK = tileScores.slice(0, 4);
    const confidence = clampNumber(mean(topK), 0, 1);
    samples.push({ t: tt, confidence });
    prev = frame;
  }

  return samples;
}

function segmentsFromInsertedContentSamples(params: {
  samples: InsertedContentSample[];
  sampleStepSeconds: number;
  startThreshold: number;
  continueThreshold: number;
}): InsertedContentSegment[] {
  const { samples, sampleStepSeconds, startThreshold, continueThreshold } = params;

  const segments: InsertedContentSegment[] = [];
  let current: InsertedContentSegment | null = null;

  for (const s of samples) {
    if (!current) {
      if (s.confidence >= startThreshold) {
        current = { start: s.t, end: s.t + sampleStepSeconds, confs: [s.confidence] };
      }
      continue;
    }

    if (s.confidence >= continueThreshold) {
      current.end = Math.max(current.end, s.t + sampleStepSeconds);
      current.confs.push(s.confidence);
      continue;
    }

    segments.push(current);
    current = null;
  }

  if (current) segments.push(current);
  return segments;
}

function mergeInsertedContentSegments(params: {
  segments: InsertedContentSegment[];
  maxGapSeconds: number;
}): InsertedContentSegment[] {
  const { segments, maxGapSeconds } = params;
  const merged: InsertedContentSegment[] = [];

  for (const seg of segments) {
    const prevSeg = merged.length > 0 ? merged[merged.length - 1] : null;
    if (prevSeg && seg.start - prevSeg.end <= maxGapSeconds) {
      prevSeg.end = Math.max(prevSeg.end, seg.end);
      prevSeg.confs.push(...seg.confs);
      continue;
    }
    merged.push(seg);
  }

  return merged;
}

function candidatesFromInsertedContentSegments(params: {
  ctx: AnalyzeContext;
  merged: InsertedContentSegment[];
  minDurationSeconds: number;
  minAvgConfidence: number;
  maxBlocks: number;
}): InsertedContentCandidate[] {
  const { ctx, merged, minDurationSeconds, minAvgConfidence, maxBlocks } = params;
  return merged
    .map((s) => ({
      start: Math.max(0, s.start),
      end: Math.min(ctx.durationSeconds, s.end),
      avg: mean(s.confs),
    }))
    .filter((s) => s.end - s.start >= minDurationSeconds && s.avg >= minAvgConfidence)
    .slice(0, maxBlocks);
}

async function buildInsertedContentBlock(params: {
  ctx: AnalyzeContext;
  seg: InsertedContentCandidate;
  id: string;
  artifactsRootDir: string;
  cacheBaseDir: string | null;
}): Promise<InsertedContentBlock> {
  const { ctx, seg, id, artifactsRootDir, cacheBaseDir } = params;
  const dur = seg.end - seg.start;
  const mid = (seg.start + seg.end) / 2;

  const keyTimesBase = dur >= 1.2 ? [seg.start + 0.15, mid] : [mid];
  const keyTimes = Array.from(
    new Set(
      keyTimesBase
        .map((t) => clampNumber(t, 0, computeSafeVideoEndTimeSeconds(ctx)))
        .map((t) => Math.round(t * 100) / 100)
    )
  ).slice(0, 2);

  const blockDir = join(artifactsRootDir, id);
  // Ensure reruns don't mix old artifacts with new results.
  await rm(blockDir, { recursive: true, force: true });
  await mkdir(blockDir, { recursive: true });

  const fullImages: Array<{ time: number; path: string }> = [];
  for (let k = 0; k < keyTimes.length; k++) {
    const t = keyTimes[k]!;
    const framePath = join(blockDir, `kf${k}.full.png`);
    await extractPngFrameAtTime({ videoPath: ctx.inputPath, timeSeconds: t, outPath: framePath });
    fullImages.push({ time: t, path: framePath });
  }

  const ocrFull = await ocrImagesWithTesseract({
    images: fullImages,
    frameWidth: ctx.info.width,
    frameHeight: ctx.info.height,
  });

  // Infer an approximate inserted-content region from word bboxes, then re-OCR the crop so we
  // don't mix background/captions into the extracted text.
  let region: NormalizedRect = inferInsertedContentRegionFromOcrKeyframes({
    keyframes: ocrFull,
    minWordConfidence: 0.7,
    minWords: 4,
  }) ?? { x: 0, y: 0, w: 1, h: 1 };
  if (isNearFullFrameRect(region) || (region.w > 0.94 && region.h > 0.94)) {
    region = { x: 0, y: 0, w: 1, h: 1 };
  }
  const presentation = isNearFullFrameRect(region) ? 'full_screen' : 'picture_in_picture';

  let ocrKeyframes: InsertedContentOcrKeyframe[] = ocrFull;
  const cropPaths: string[] = [];

  if (presentation !== 'full_screen') {
    const fw = ctx.info.width;
    const fh = ctx.info.height;

    let x = Math.floor(region.x * fw);
    let y = Math.floor(region.y * fh);
    let w = Math.ceil(region.w * fw);
    let h = Math.ceil(region.h * fh);

    x = Math.max(0, Math.min(fw - 1, x));
    y = Math.max(0, Math.min(fh - 1, y));
    w = Math.max(1, Math.min(fw - x, w));
    h = Math.max(1, Math.min(fh - y, h));

    const areaNorm = rectArea(region);
    const scale = areaNorm <= 0.22 ? 2 : 1;

    const cropImages: Array<{ time: number; path: string }> = [];
    for (let k = 0; k < fullImages.length; k++) {
      const src = fullImages[k]!;
      const outPath = join(blockDir, `kf${k}.crop.png`);
      await cropPngWithFfmpeg({
        inputPath: src.path,
        outPath,
        cropPx: { x, y, w, h },
        scale,
      });
      cropPaths.push(outPath);
      cropImages.push({ time: src.time, path: outPath });
    }

    const ocrCrop = await ocrImagesWithTesseract({
      images: cropImages,
      frameWidth: w * scale,
      frameHeight: h * scale,
    });

    // Map crop-local bboxes back into full-frame normalized coordinates.
    ocrKeyframes = ocrCrop.map((kf) => ({
      ...kf,
      ...(kf.words
        ? {
            words: kf.words.map((w) => {
              const [cx, cy, cw, ch] = w.bbox;
              const fx = clampNumber(region.x + cx * region.w, 0, 1);
              const fy = clampNumber(region.y + cy * region.h, 0, 1);
              const fw2 = clampNumber(cw * region.w, 0, 1);
              const fh2 = clampNumber(ch * region.h, 0, 1);
              return { ...w, bbox: [fx, fy, fw2, fh2] as [number, number, number, number] };
            }),
          }
        : {}),
    }));
  }

  const combinedTextFromKeyframes = ocrKeyframes
    .map((k) => k.text)
    .filter(Boolean)
    .join(' ');
  const combinedTextFromWords = ocrKeyframes
    .flatMap((k) => k.words ?? [])
    .map((w) => w.text)
    .filter(Boolean)
    .slice(0, 250)
    .join(' ');
  const combinedText = `${combinedTextFromKeyframes} ${combinedTextFromWords}`
    .replace(/\s+/g, ' ')
    .trim();

  const typeGuess = classifyInsertedContentType(combinedText);
  const ocrQuality = mean(
    ocrKeyframes
      .map((k) => k.confidence)
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  );

  const bestKeyframe =
    ocrKeyframes.length > 0
      ? ocrKeyframes.reduce((best, cur) =>
          (cur.confidence ?? 0) > (best.confidence ?? 0) ? cur : best
        )
      : null;

  return {
    id,
    type: typeGuess.type,
    start: seg.start,
    end: seg.end,
    presentation,
    region,
    keyframes: ocrKeyframes.map((k, idx) => {
      const fullPath = fullImages[idx]?.path ?? null;
      const cropPath = cropPaths[idx] ?? null;
      const relFull = fullPath ? relPathOrNull(cacheBaseDir, fullPath) : null;
      const relCrop = cropPath ? relPathOrNull(cacheBaseDir, cropPath) : null;
      return {
        time: k.time,
        ...(k.text ? { text: k.text } : {}),
        ...(k.confidence !== undefined ? { confidence: k.confidence } : {}),
        ...(relFull ? { path: relFull } : {}),
        ...(relCrop ? { crop_path: relCrop } : {}),
      };
    }),
    extraction: {
      ocr: {
        engine: 'tesseract.js',
        ...(combinedText ? { text: combinedText } : {}),
        ...(bestKeyframe?.words ? { words: bestKeyframe.words.slice(0, 400) } : {}),
      },
    },
    confidence: {
      is_inserted_content: seg.avg,
      type: typeGuess.confidence,
      ...(Number.isFinite(ocrQuality) ? { ocr_quality: ocrQuality } : {}),
    },
  };
}

async function analyzeInsertedContentBlocks(params: {
  ctx: AnalyzeContext;
  options: AnalyzeVideoToVideoSpecV1Options;
  provenanceModules: Record<string, string>;
  provenanceNotes: string[];
}): Promise<NonNullable<VideoSpecV1['inserted_content_blocks']>> {
  const { ctx, options, provenanceModules, provenanceNotes } = params;
  const insertedEnabled = options.insertedContent ?? true;
  const ocrEnabled = options.ocr ?? true;

  const cachePath = join(ctx.videoCacheDir, 'inserted-content.v1.json');
  const cachedRaw = ctx.cacheEnabled ? await readJsonIfExists<unknown>(cachePath) : null;
  const cached = parseInsertedContentBlocksCache(cachedRaw);
  if (cachedRaw && !cached) provenanceNotes.push('Inserted content cache stale; recomputing.');

  if (!insertedEnabled || !ocrEnabled) {
    provenanceModules.inserted_content_blocks = 'disabled';
    return [];
  }

  if (cached) {
    provenanceModules.inserted_content_blocks = 'cache';
    return cached
      .map((b) => ({
        ...b,
        start: clampNumber(b.start, 0, ctx.durationSeconds),
        end: clampNumber(b.end, 0, ctx.durationSeconds),
        ...(b.keyframes
          ? {
              keyframes: b.keyframes
                .map((k) => ({ ...k, time: clampNumber(k.time, 0, ctx.durationSeconds) }))
                .filter((k) => k.time < ctx.durationSeconds),
            }
          : {}),
      }))
      .filter((b) => b.end > b.start);
  }

  // Heuristic: tile edge-density + low motion over time.
  const sampleStepSeconds = 0.5;
  const sampleSize = 64;

  const samples = await sampleInsertedContentConfidence({
    ctx,
    sampleStepSeconds,
    sampleSize,
  });
  const segments = segmentsFromInsertedContentSamples({
    samples,
    sampleStepSeconds,
    startThreshold: 0.34,
    continueThreshold: 0.26,
  });
  const merged = mergeInsertedContentSegments({
    segments,
    maxGapSeconds: sampleStepSeconds * 0.9,
  });
  const candidates = candidatesFromInsertedContentSegments({
    ctx,
    merged,
    minDurationSeconds: 0.75,
    minAvgConfidence: 0.26,
    maxBlocks: 6,
  });

  if (candidates.length === 0) {
    provenanceModules.inserted_content_blocks = 'heuristic (none detected)';
    return [];
  }

  const artifactsRootDir = ctx.cacheEnabled
    ? join(ctx.videoCacheDir, 'inserted-content')
    : join(tmpdir(), `cm-videospec-inserted-${Date.now()}-${Math.random()}`);
  await mkdir(artifactsRootDir, { recursive: true });
  const cacheBaseDir = ctx.cacheEnabled ? ctx.videoCacheDir : null;

  try {
    const blocks: NonNullable<VideoSpecV1['inserted_content_blocks']> = [];
    for (let i = 0; i < candidates.length; i++) {
      const seg = candidates[i]!;
      const id = `icb_${String(i + 1).padStart(4, '0')}`;
      const block = await buildInsertedContentBlock({
        ctx,
        seg,
        id,
        artifactsRootDir,
        cacheBaseDir,
      });
      if (!shouldKeepInsertedContentBlock(block)) {
        await rm(join(artifactsRootDir, id), { recursive: true, force: true });
        continue;
      }
      blocks.push(block);
    }

    if (blocks.length === 0) {
      provenanceModules.inserted_content_blocks = 'heuristic (none detected)';
      return [];
    }

    if (ctx.cacheEnabled) {
      await writeJsonAtomic(cachePath, {
        version: INSERTED_CONTENT_BLOCKS_CACHE_VERSION,
        blocks,
      } satisfies InsertedContentBlocksCache);
    }
    provenanceModules.inserted_content_blocks =
      'heuristic (tile edge-density + keyframe OCR + OCR-localized region)';
    return blocks;
  } catch (error) {
    provenanceNotes.push(
      `Inserted content block extraction failed; omitted. (${error instanceof Error ? error.message : String(error)})`
    );
    provenanceModules.inserted_content_blocks = 'unavailable';
    return [];
  } finally {
    if (!ctx.cacheEnabled) {
      await rm(artifactsRootDir, { recursive: true, force: true });
    }
  }
}

async function analyzeEditingMotionAndEffects(params: {
  ctx: AnalyzeContext;
  shots: Array<{ id: number; start: number; end: number; transition_in?: string }>;
  provenanceModules: Record<string, string>;
  provenanceNotes: string[];
}): Promise<{
  cameraMotion: VideoSpecV1['editing']['camera_motion'];
  jumpCutShotIds: number[];
  shotIdToJumpCut: Map<number, boolean>;
}> {
  const { ctx, shots, provenanceModules, provenanceNotes } = params;
  const cachePath = join(ctx.videoCacheDir, 'editing.effects.v1.json');
  const cached = ctx.cacheEnabled
    ? await readJsonIfExists<{
        cameraMotion: VideoSpecV1['editing']['camera_motion'];
        jumpCutShotIds: number[];
      }>(cachePath)
    : null;
  if (cached) {
    provenanceModules.camera_motion = 'cache';
    provenanceModules.jump_cut_detection = 'cache';
    const map = new Map<number, boolean>();
    for (const id of cached.jumpCutShotIds ?? []) map.set(id, true);
    return {
      cameraMotion: cached.cameraMotion ?? [],
      jumpCutShotIds: cached.jumpCutShotIds ?? [],
      shotIdToJumpCut: map,
    };
  }

  const maxShots = 200;
  const slice = shots.length > maxShots ? shots.slice(0, maxShots) : shots;
  if (shots.length > maxShots) {
    provenanceNotes.push(
      `Editing effects limited to first ${maxShots} shots for performance (detected ${shots.length} shots).`
    );
  }

  const cameraMotion: VideoSpecV1['editing']['camera_motion'] = [];
  const jumpCutShotIds: number[] = [];
  const shotIdToJumpCut = new Map<number, boolean>();

  for (const shot of slice) {
    const eps = 0.05;
    const t0 = Math.min(Math.max(shot.start + eps, 0), Math.max(0, shot.end - eps));
    const t1 = Math.max(shot.end - eps, t0);
    try {
      const startFrame = await extractGrayFrameAtTime({
        videoPath: ctx.inputPath,
        timeSeconds: t0,
        size: 32,
      });
      const endFrame = await extractGrayFrameAtTime({
        videoPath: ctx.inputPath,
        timeSeconds: t1,
        size: 32,
      });
      const cls = classifyCameraMotionFromFrames({ start: startFrame, end: endFrame });
      cameraMotion.push({
        shot_id: shot.id,
        motion: cls.motion,
        start: shot.start,
        end: shot.end,
      });
    } catch (error) {
      provenanceNotes.push(
        `Camera motion analysis failed for shot ${shot.id}. (${error instanceof Error ? error.message : String(error)})`
      );
      cameraMotion.push({ shot_id: shot.id, motion: 'unknown', start: shot.start, end: shot.end });
      provenanceModules.camera_motion = 'unavailable';
    }
  }
  if (!provenanceModules.camera_motion) {
    provenanceModules.camera_motion = 'heuristic (ffmpeg frames + mse/shift/zoom)';
  }

  for (let i = 0; i < slice.length - 1; i++) {
    const a = slice[i]!;
    const b = slice[i + 1]!;
    const eps = 0.05;
    const ta = Math.max(a.end - eps, a.start);
    const tb = Math.min(b.start + eps, b.end);
    try {
      const fa = await extractGrayFrameAtTime({
        videoPath: ctx.inputPath,
        timeSeconds: ta,
        size: 32,
      });
      const fb = await extractGrayFrameAtTime({
        videoPath: ctx.inputPath,
        timeSeconds: tb,
        size: 32,
      });
      const ha = computeAHash64(fa);
      const hb = computeAHash64(fb);
      const dist = hammingDistance64(ha, hb);
      if (dist <= 8) {
        jumpCutShotIds.push(b.id);
        shotIdToJumpCut.set(b.id, true);
      }
    } catch (error) {
      provenanceNotes.push(
        `Jump-cut detection failed near shot ${b.id}. (${error instanceof Error ? error.message : String(error)})`
      );
      provenanceModules.jump_cut_detection = 'unavailable';
      break;
    }
  }
  if (!provenanceModules.jump_cut_detection) {
    provenanceModules.jump_cut_detection = 'ahash(8x8) boundary compare';
  }

  if (ctx.cacheEnabled) {
    await writeJsonAtomic(cachePath, { cameraMotion, jumpCutShotIds });
  }

  return { cameraMotion, jumpCutShotIds, shotIdToJumpCut };
}

async function analyzeAudioStructure(params: {
  ctx: AnalyzeContext;
  options: AnalyzeVideoToVideoSpecV1Options;
  transcript: VideoSpecTranscriptSegment[];
  provenanceModules: Record<string, string>;
  provenanceNotes: string[];
}): Promise<Pick<VideoSpecV1['audio'], 'music_segments' | 'sound_effects' | 'beat_grid'>> {
  const { ctx, options, transcript, provenanceModules, provenanceNotes } = params;
  const cachePath = join(ctx.videoCacheDir, 'audio.structure.v1.json');
  const cached = ctx.cacheEnabled
    ? await readJsonIfExists<
        Pick<VideoSpecV1['audio'], 'music_segments' | 'sound_effects' | 'beat_grid'>
      >(cachePath)
    : null;
  if (cached) {
    provenanceModules.music_detection = 'cache';
    provenanceModules.beat_tracking = 'cache';
    provenanceModules.sfx_detection = 'cache';
    return cached;
  }

  let hasAudio = false;
  try {
    hasAudio = await probeHasAudioStream(ctx.inputPath);
  } catch (error) {
    provenanceNotes.push(
      `Audio probing failed; skipping audio structure. (${error instanceof Error ? error.message : String(error)})`
    );
    provenanceModules.music_detection = 'unavailable';
    provenanceModules.beat_tracking = 'unavailable';
    provenanceModules.sfx_detection = 'unavailable';
    return { music_segments: [], sound_effects: [], beat_grid: { bpm: null, beats: [] } };
  }

  if (!hasAudio) {
    provenanceModules.music_detection = 'no-audio';
    provenanceModules.beat_tracking = 'no-audio';
    provenanceModules.sfx_detection = 'no-audio';
    return { music_segments: [], sound_effects: [], beat_grid: { bpm: null, beats: [] } };
  }

  const sampleRate = 22050;
  const pcm = await extractPcmMonoS16le({
    videoPath: ctx.inputPath,
    sampleRate,
    maxSeconds: options.maxSeconds,
  });
  if (pcm.length === 0) {
    provenanceModules.music_detection = 'no-audio';
    provenanceModules.beat_tracking = 'no-audio';
    provenanceModules.sfx_detection = 'no-audio';
    return { music_segments: [], sound_effects: [], beat_grid: { bpm: null, beats: [] } };
  }

  const durationSeconds =
    typeof options.maxSeconds === 'number' && options.maxSeconds > 0
      ? Math.min(ctx.durationSeconds, options.maxSeconds)
      : ctx.durationSeconds;

  const { beatGrid, sfx } = analyzePcmForBeatAndSfx({
    pcmS16le: pcm,
    sampleRate,
    durationSeconds,
  });

  const speechSegments = transcript.map((t) => ({ start: t.start, end: t.end }));
  const beatPresent =
    beatGrid.bpm !== null && beatGrid.beats.length >= 8 && beatGrid.confidence >= 0.6;

  const music_segments: VideoSpecV1['audio']['music_segments'] = [];
  if (beatPresent) {
    const range = { start: 0, end: durationSeconds };
    music_segments.push({
      start: range.start,
      end: range.end,
      track: null,
      background: overlapsAnySegment(range, speechSegments),
      description: 'Background music (heuristic: beat grid detected)',
      confidence: Math.min(0.95, 0.6 + beatGrid.confidence * 0.35),
    });
    provenanceModules.music_detection = 'heuristic (beat grid present)';
  } else if (transcript.length > 0 && sfx.length >= 6) {
    const range = { start: 0, end: durationSeconds };
    music_segments.push({
      start: range.start,
      end: range.end,
      track: null,
      background: true,
      description: 'Audio bed present (heuristic)',
      confidence: 0.55,
    });
    provenanceModules.music_detection = 'heuristic (energy peaks)';
  } else {
    provenanceModules.music_detection = 'heuristic (no music detected)';
  }

  provenanceModules.beat_tracking = beatGrid.bpm
    ? 'heuristic (onset energy)'
    : 'heuristic (no bpm)';
  provenanceModules.sfx_detection = sfx.length ? 'heuristic (energy onsets)' : 'heuristic (none)';

  const sound_effects: VideoSpecV1['audio']['sound_effects'] = sfx.map((e) => ({
    time: e.time,
    type: e.type,
    confidence: e.confidence,
  }));
  const beat_grid: VideoSpecV1['audio']['beat_grid'] = { bpm: beatGrid.bpm, beats: beatGrid.beats };

  const out = { music_segments, sound_effects, beat_grid };
  if (ctx.cacheEnabled) await writeJsonAtomic(cachePath, out);
  return out;
}

function deriveCharacters(
  transcript: VideoSpecTranscriptSegment[]
): VideoSpecV1['entities']['characters'] {
  const speakerIds = [...new Set(transcript.map((s) => s.speaker).filter(Boolean))] as string[];
  return (speakerIds.length > 0 ? speakerIds : ['Person1']).map((id, i) => {
    const speaking =
      transcript.length > 0
        ? transcript
            .filter((s) => (s.speaker ?? 'Person1') === id)
            .map((s) => ({ start: s.start, end: s.end }))
        : [];
    return {
      id,
      appearances: speaking,
      speaker_label: `Speaker${i}`,
      speaking_segments: speaking,
    };
  });
}

async function analyzeNarrative(params: {
  ctx: AnalyzeContext;
  options: AnalyzeVideoToVideoSpecV1Options;
  shots: Array<{ start: number; end: number }>;
  transcript: VideoSpecTranscriptSegment[];
  ocrTexts: string[];
  provenanceModules: Record<string, string>;
  provenanceNotes: string[];
}): Promise<VideoSpecV1['narrative']> {
  const { ctx, options, shots, transcript, ocrTexts, provenanceModules, provenanceNotes } = params;
  const narrativeMode = options.narrative ?? 'heuristic';

  if (narrativeMode === 'off') {
    provenanceModules.narrative_analysis = 'disabled';
    return inferNarrativeDisabled(ctx.durationSeconds);
  }

  if (narrativeMode === 'llm') {
    try {
      const llm = options.llmProvider ?? createLLMProvider(ctx.cfg.llm.provider, ctx.cfg.llm.model);
      const narrative = await inferNarrativeWithLLM({
        llm,
        duration: ctx.durationSeconds,
        transcript,
        shots,
      });
      provenanceModules.narrative_analysis = `${llm.name} ${llm.model}`;
      return narrative;
    } catch (error) {
      provenanceNotes.push(
        `Narrative LLM analysis failed; falling back to heuristic. (${error instanceof Error ? error.message : String(error)})`
      );
    }
  }

  provenanceModules.narrative_analysis = 'heuristic';
  return inferNarrativeHeuristic({
    duration: ctx.durationSeconds,
    shots,
    transcript,
    ocrText: ocrTexts,
  });
}

/**
 * Analyze a video file and produce a `VideoSpecV1` describing its structure.
 *
 * This is best-effort and may use a mix of ffprobe-derived metadata, heuristics,
 * and optional LLM inference (when configured) to improve labeling.
 */
export async function analyzeVideoToVideoSpecV1(
  options: AnalyzeVideoToVideoSpecV1Options
): Promise<{ spec: VideoSpecV1; outputPath?: string }> {
  const log = createLogger({
    module: 'videospec',
    input: options.inputSource ?? options.inputPath,
  });
  const provenanceModules: Record<string, string> = { ...(options.provenanceSeed?.modules ?? {}) };
  const provenanceNotes: string[] = [...(options.provenanceSeed?.notes ?? [])];

  const ctx = await createAnalyzeContext(options);

  const { shots, pacing } = await analyzeTimeline({
    ctx,
    options,
    provenanceModules,
    provenanceNotes,
  });

  const transcript = await analyzeTranscript({
    ctx,
    options,
    provenanceModules,
    provenanceNotes,
  });

  const { captions, textOverlays, ocrTexts } = await analyzeOcr({
    ctx,
    options,
    transcript,
    provenanceModules,
    provenanceNotes,
  });

  const insertedContentBlocks = await analyzeInsertedContentBlocks({
    ctx,
    options,
    provenanceModules,
    provenanceNotes,
  });

  const characters = deriveCharacters(transcript);

  const { cameraMotion, jumpCutShotIds, shotIdToJumpCut } = await analyzeEditingMotionAndEffects({
    ctx,
    shots: shots.map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      transition_in: s.transition_in,
    })),
    provenanceModules,
    provenanceNotes,
  });

  const audioStructure = await analyzeAudioStructure({
    ctx,
    options,
    transcript,
    provenanceModules,
    provenanceNotes,
  });

  const narrative = await analyzeNarrative({
    ctx,
    options,
    shots: shots.map((s) => ({ start: s.start, end: s.end })),
    transcript,
    ocrTexts,
    provenanceModules,
    provenanceNotes,
  });

  const spec: VideoSpecV1 = {
    meta: {
      version: VIDEOSPEC_V1_VERSION,
      source: options.inputSource ?? ctx.inputPath,
      duration: ctx.durationSeconds,
      frame_rate: ctx.frameRate,
      resolution: { width: ctx.info.width, height: ctx.info.height },
      file_size: ctx.stat.size,
      analysis_date: nowIso(),
      notes: provenanceNotes.length > 0 ? provenanceNotes.join(' ') : undefined,
    },
    timeline: {
      shots: shots.map((s) => ({
        id: s.id,
        start: s.start,
        end: s.end,
        transition_in: s.transition_in,
        ...(shotIdToJumpCut.get(s.id) ? { jump_cut: true } : {}),
      })),
      pacing,
    },
    editing: {
      captions,
      text_overlays: textOverlays,
      camera_motion: cameraMotion,
      other_effects: {
        ...(jumpCutShotIds.length > 0 ? { jump_cuts: jumpCutShotIds } : {}),
      },
    },
    audio: {
      transcript,
      music_segments: audioStructure.music_segments,
      sound_effects: audioStructure.sound_effects,
      beat_grid: audioStructure.beat_grid,
    },
    entities: {
      characters,
      objects: [],
    },
    narrative,
    ...(insertedContentBlocks.length > 0 ? { inserted_content_blocks: insertedContentBlocks } : {}),
    provenance: {
      modules: {
        ...provenanceModules,
        pipeline: `content-machine videospec (${VIDEOSPEC_V1_VERSION})`,
      },
      notes: provenanceNotes.length > 0 ? provenanceNotes : undefined,
    },
  };

  const validated = VideoSpecV1Schema.parse(spec);

  const outputPath =
    typeof options.outputPath === 'string' && options.outputPath.trim()
      ? resolve(options.outputPath)
      : undefined;
  if (outputPath) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(validated, null, 2), 'utf-8');
    log.info({ outputPath, input: basename(ctx.inputPath) }, 'Wrote VideoSpec.v1 JSON');
  }

  return { spec: validated, outputPath };
}
