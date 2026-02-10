import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import { CMError } from '../core/errors';
import { probeVideoWithFfprobe } from '../validate/ffprobe';
import { detectSceneCutsWithPySceneDetect } from '../validate/scene-detect';
import { normalizeWord, isFuzzyMatch } from '../core/text/similarity';
import { transcribeAudio } from '../audio/asr';
import { createLLMProvider, type LLMProvider } from '../core/llm';
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

function resolveVideoSpecCacheDir(explicit?: string): string {
  if (explicit) return resolve(explicit);
  if (process.env.CM_VIDEOSPEC_CACHE_DIR) return resolve(process.env.CM_VIDEOSPEC_CACHE_DIR);
  return join(process.cwd(), '.cache', 'content-machine', 'videospec');
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

  try {
    await execFileAsync('ffmpeg', args, { windowsHide: true, timeout: 60_000 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', 'ffmpeg is required for audio extraction', {
        binary: 'ffmpeg',
      });
    }
    throw error;
  }
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

  try {
    await execFileAsync('ffmpeg', args, { windowsHide: true, timeout: 60_000 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', 'ffmpeg is required for OCR frame extraction', {
        binary: 'ffmpeg',
      });
    }
    throw error;
  }
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

async function runTesseractOcr(framesDir: string, fps: number): Promise<OcrFrame[]> {
  let Tesseract: typeof import('tesseract.js');
  try {
    Tesseract = await import('tesseract.js');
  } catch {
    throw new CMError('DEPENDENCY_MISSING', 'tesseract.js is required for videospec OCR', {
      install: 'npm install tesseract.js',
    });
  }

  const { readdir } = await import('node:fs/promises');
  const files = (await readdir(framesDir)).filter((f) => f.endsWith('.png')).sort();

  const cachePath = join(process.cwd(), '.cache', 'tesseract');
  await mkdir(cachePath, { recursive: true });

  // Prefer a local traineddata if present (repo ships eng.traineddata).
  const localLangDir = cachePath;
  const localEng = join(process.cwd(), 'eng.traineddata');
  if (existsSync(localEng)) {
    const dest = join(localLangDir, 'eng.traineddata');
    try {
      if (!existsSync(dest)) {
        const { copyFile } = await import('node:fs/promises');
        await copyFile(localEng, dest);
      }
    } catch {
      // Best-effort; fall back to default download behavior.
    }
  }

  const worker = await Tesseract.createWorker('eng', undefined, {
    cachePath,
    langPath: localLangDir,
  } as any);

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

  const transcriptCachePath = join(ctx.videoCacheDir, 'audio.transcript.v1.json');
  const cached = ctx.cacheEnabled
    ? await readJsonIfExists<VideoSpecTranscriptSegment[]>(transcriptCachePath)
    : null;
  if (cached) {
    provenanceModules.asr = 'cache';
    return cached;
  }

  if (!asrEnabled) {
    provenanceModules.asr = 'disabled';
    return [];
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

  async function getOcrSegmentsForFps(fps: number, moduleKey: string): Promise<OcrSegment[]> {
    const cachePath = join(ctx.videoCacheDir, `editing.ocr.${fps}fps.v1.json`);
    const cached = ctx.cacheEnabled ? await readJsonIfExists<OcrSegment[]>(cachePath) : null;
    if (cached) {
      provenanceModules[moduleKey] = 'cache';
      return cached;
    }
    if (!ocrEnabled) {
      provenanceModules[moduleKey] = 'disabled';
      return [];
    }
    try {
      const { framesDir, cleanup } = await extractOcrFrames({
        videoPath: ctx.inputPath,
        fps,
        crop: ocrCrop,
        maxSeconds: options.maxSeconds,
      });
      try {
        const frames = await runTesseractOcr(framesDir, fps);
        provenanceModules[moduleKey] = `tesseract.js (fps=${fps}, crop=bottom)`;
        const grouped = groupOcrFramesIntoSegments({ frames, fps }).map((s) => ({
          ...s,
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
      provenanceModules[moduleKey] = 'unavailable';
      return [];
    }
  }

  // Pass selection: pass=both runs refine and replaces pass 1 results when possible.
  const ocrSegments = await getOcrSegmentsForFps(baseFps, 'ocr');
  const ocrRefineSegments =
    pass === 'both' && ocrEnabled ? await getOcrSegmentsForFps(pass2Fps, 'ocr_refine') : null;
  const segmentsToUse =
    ocrRefineSegments && ocrRefineSegments.length > 0 ? ocrRefineSegments : ocrSegments;

  const captions: VideoSpecCaption[] = [];
  const textOverlays: VideoSpecTextOverlay[] = [];
  const ocrTexts: string[] = [];

  for (const seg of segmentsToUse) {
    ocrTexts.push(seg.text);
    const cls = classifyOcrSegmentAsCaption({
      text: seg.text,
      start: seg.start,
      end: seg.end,
      transcript,
    });
    if (cls.isCaption) {
      captions.push({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        ...(cls.speaker ? { speaker: cls.speaker } : {}),
        ...(seg.confidence !== undefined ? { confidence: seg.confidence } : {}),
      });
    } else {
      textOverlays.push({
        text: seg.text,
        start: seg.start,
        end: seg.end,
        position: 'bottom',
        ...(seg.confidence !== undefined ? { confidence: seg.confidence } : {}),
      });
    }
  }

  // Best-effort note when pass=both requested but refine didn't improve.
  if (pass === 'both' && ocrEnabled && (!ocrRefineSegments || ocrRefineSegments.length === 0)) {
    provenanceNotes.push('OCR refine pass yielded no segments; using pass 1 OCR.');
  }

  return { captions, textOverlays, ocrTexts };
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
    return inferNarrativeHeuristic({
      duration: ctx.durationSeconds,
      shots,
      transcript,
      ocrText: ocrTexts,
    });
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
  const log = createLogger({ module: 'videospec', input: options.inputPath });
  const provenanceModules: Record<string, string> = {};
  const provenanceNotes: string[] = [];

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
      source: ctx.inputPath,
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
