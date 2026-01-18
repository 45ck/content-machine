/**
 * Sync Rater
 *
 * Rates video caption-audio synchronization quality by:
 * 1. Extracting frames and running OCR to get displayed text timeline
 * 2. Extracting audio and running ASR to get spoken word timeline
 * 3. Comparing both timelines to measure drift
 * 4. Calculating a sync rating (0-100)
 */
import { createLogger } from '../core/logger';
import { CMError } from '../core/errors';
import { transcribeAudio, type ASRResult } from '../audio/asr';
import { normalizeWord, isFuzzyMatch } from '../core/text/similarity';
import {
  type CaptionQualityRatingOptions,
  type CaptionQualityRatingOutput,
  type SyncRatingOutput,
  type SyncMetrics,
  type SyncError,
  type WordMatch,
  type OCRFrame,
  type SyncRatingOptions,
  type SyncRatingLabel,
  CaptionQualityRatingOptionsSchema,
  CaptionQualityRatingOutputSchema,
  SyncRatingOutputSchema,
  SyncRatingOptionsSchema,
} from '../domain';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { probeVideoWithFfprobe } from '../validate/ffprobe';
import { analyzeBurnedInCaptionQuality } from './burned-in-caption-quality';

const log = createLogger({ module: 'sync-rater' });
const execFileAsync = promisify(execFile);

// Statistical helpers
function mean(arr: number[]): number {
  return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function standardDeviation(arr: number[]): number {
  if (arr.length === 0) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map((v) => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

/**
 * Extract frames from video at specified FPS
 */
async function extractFrames(
  videoPath: string,
  fps: number,
  captionRegion: { yRatio: number; heightRatio: number },
  maxSeconds?: number
): Promise<{
  framesDir: string;
  frameCount: number;
  videoFrameSize: { width: number; height: number };
  captionCrop: { offsetY: number; width: number; height: number };
  videoDurationSeconds: number;
}> {
  const framesDir = join(tmpdir(), `cm-sync-frames-${Date.now()}`);
  mkdirSync(framesDir, { recursive: true });

  log.debug({ videoPath, fps, framesDir }, 'Extracting frames');

  const info = await probeVideoWithFfprobe(videoPath);
  const width = info.width;
  const height = info.height;
  const videoDurationSeconds =
    typeof maxSeconds === 'number' && Number.isFinite(maxSeconds)
      ? Math.min(info.durationSeconds, Math.max(0, maxSeconds))
      : info.durationSeconds;

  // Calculate crop region for captions (bottom portion)
  const cropY = Math.floor(height * captionRegion.yRatio);
  const cropH = Math.floor(height * captionRegion.heightRatio);

  // Extract frames, cropped to caption region
  try {
    const args: string[] = ['-hide_banner', '-loglevel', 'error', '-i', videoPath];
    if (typeof maxSeconds === 'number' && Number.isFinite(maxSeconds) && maxSeconds > 0) {
      args.push('-t', String(maxSeconds));
    }
    args.push(
      '-vf',
      `fps=${fps},crop=${width}:${cropH}:0:${cropY}`,
      '-q:v',
      '2',
      join(framesDir, 'frame_%04d.png')
    );
    await execFileAsync('ffmpeg', args, { windowsHide: true, timeout: 60_000 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', 'ffmpeg is required for sync rating', {
        binary: 'ffmpeg',
      });
    }
    throw new CMError(
      'SYNC_RATING_ERROR',
      `Failed to extract frames: ${error instanceof Error ? error.message : String(error)}`,
      { videoPath }
    );
  }

  const files = readdirSync(framesDir).filter((f) => f.endsWith('.png'));
  log.info({ frameCount: files.length, framesDir }, 'Frames extracted');

  return {
    framesDir,
    frameCount: files.length,
    videoFrameSize: { width, height },
    captionCrop: { offsetY: cropY, width, height: cropH },
    videoDurationSeconds,
  };
}

/**
 * Extract audio from video
 */
async function extractAudio(videoPath: string, maxSeconds?: number): Promise<string> {
  const audioPath = join(tmpdir(), `cm-sync-audio-${Date.now()}.wav`);

  log.debug({ videoPath, audioPath }, 'Extracting audio');

  try {
    const args: string[] = [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      videoPath,
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
    if (typeof maxSeconds === 'number' && Number.isFinite(maxSeconds) && maxSeconds > 0) {
      // For audio we cap from start; good enough for benchmark sampling.
      args.splice(5, 0, '-t', String(maxSeconds));
    }
    await execFileAsync('ffmpeg', args, { windowsHide: true, timeout: 60_000 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new CMError('DEPENDENCY_MISSING', 'ffmpeg is required for sync rating', {
        binary: 'ffmpeg',
      });
    }
    throw new CMError(
      'SYNC_RATING_ERROR',
      `Failed to extract audio: ${error instanceof Error ? error.message : String(error)}`,
      { videoPath }
    );
  }

  log.info({ audioPath }, 'Audio extracted');
  return audioPath;
}

/**
 * Run OCR on extracted frames using Tesseract.js
 */
async function runOCR(framesDir: string, fps: number, cropOffsetY: number): Promise<OCRFrame[]> {
  // Dynamic import for tesseract.js (optional dependency)
  let Tesseract: typeof import('tesseract.js');
  try {
    Tesseract = await import('tesseract.js');
  } catch {
    throw new CMError('DEPENDENCY_MISSING', 'tesseract.js is required for sync rating', {
      install: 'npm install tesseract.js',
    });
  }

  const files = readdirSync(framesDir)
    .filter((f) => f.endsWith('.png'))
    .sort();

  log.info({ frameCount: files.length }, 'Running OCR on frames');

  const results: OCRFrame[] = [];
  const cachePath = join(process.cwd(), '.cache', 'tesseract');
  mkdirSync(cachePath, { recursive: true });
  const worker = await Tesseract.createWorker('eng', undefined, { cachePath });

  function extractBboxesFromTsv(tsv: string | null | undefined): Array<{
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  }> {
    if (!tsv) return [];
    const lines = String(tsv).split('\n').filter(Boolean);
    if (lines.length <= 1) return [];

    const out: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
    for (const line of lines.slice(1)) {
      const cols = line.split('\t');
      if (cols.length < 12) continue;
      const level = Number(cols[0]);
      // TSV levels: 5 = word. We union word boxes into a single caption bbox.
      if (level !== 5) continue;

      const left = Number(cols[6]);
      const top = Number(cols[7]);
      const width = Number(cols[8]);
      const height = Number(cols[9]);
      const text = cols.slice(11).join('\t').trim();
      if (!text) continue;
      if (![left, top, width, height].every((n) => Number.isFinite(n))) continue;
      if (width <= 0 || height <= 0) continue;

      out.push({
        x0: left,
        y0: top + cropOffsetY,
        x1: left + width,
        y1: top + height + cropOffsetY,
      });
    }
    return out;
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const framePath = join(framesDir, file);
    const frameNumber = i + 1;
    // ffmpeg fps filter emits the first frame at t=0, so use zero-based index for timestamps.
    const timestamp = i / fps;

    try {
      // Ask tesseract.js to return TSV so we can derive word bounding boxes.
      const result = await (worker as any).recognize(framePath, undefined, { tsv: true });
      const data = result.data as {
        text: string;
        confidence: number;
        tsv?: string | null;
      };
      const text = data.text.trim();
      const confidence = data.confidence / 100;

      const bboxes = extractBboxesFromTsv(data.tsv);

      const bbox =
        bboxes.length > 0
          ? {
              x0: Math.min(...bboxes.map((b: any) => b.x0)),
              y0: Math.min(...bboxes.map((b: any) => b.y0)),
              x1: Math.max(...bboxes.map((b: any) => b.x1)),
              y1: Math.max(...bboxes.map((b: any) => b.y1)),
            }
          : undefined;

      results.push({
        frameNumber,
        timestamp,
        text,
        confidence: Number.isFinite(confidence) ? confidence : 0,
        ...(bbox ? { bbox } : {}),
      });
    } catch (error) {
      log.warn({ frameNumber, error }, 'OCR failed for frame');
      results.push({ frameNumber, timestamp, text: '', confidence: 0 });
    }
  }

  await worker.terminate();
  log.info({ ocrResultCount: results.length }, 'OCR complete');

  return results;
}

/**
 * Extract word appearances from OCR frames
 */
function extractWordAppearances(
  ocrFrames: OCRFrame[]
): Array<{ word: string; timestamps: number[] }> {
  const wordMap = new Map<string, number[]>();

  for (const frame of ocrFrames) {
    const words = frame.text.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const normalized = normalizeWord(word);
      if (normalized.length < 2) continue; // Skip very short words

      const timestamps = wordMap.get(normalized);
      if (!timestamps) {
        wordMap.set(normalized, [frame.timestamp]);
      } else {
        timestamps.push(frame.timestamp);
      }
    }
  }

  return Array.from(wordMap.entries()).map(([word, timestamps]) => ({
    word,
    timestamps: timestamps.sort((a, b) => a - b),
  }));
}

/**
 * Match OCR words to ASR words
 */
type MatchQuality = 'exact' | 'fuzzy';

function isBetterCandidate(params: {
  timeDiff: number;
  quality: MatchQuality;
  bestTimeDiff: number;
  bestQuality: MatchQuality | undefined;
}): boolean {
  if (params.timeDiff < params.bestTimeDiff) return true;
  if (params.timeDiff > params.bestTimeDiff) return false;
  return params.quality === 'exact' && params.bestQuality !== 'exact';
}

function findNearestTimestampIndex(sorted: number[], target: number): number {
  if (sorted.length === 0) return -1;
  let lo = 0;
  let hi = sorted.length - 1;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sorted[mid] < target) lo = mid + 1;
    else hi = mid;
  }
  const candidates = [lo, lo - 1].filter((idx) => idx >= 0 && idx < sorted.length);
  let bestIdx = candidates[0] ?? -1;
  let bestDiff = Infinity;
  for (const idx of candidates) {
    const diff = Math.abs(sorted[idx] - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIdx = idx;
    }
  }
  return bestIdx;
}

function getOcrCandidatesForAsrWord(params: {
  ocrByWord: Map<string, { word: string; timestamps: number[] }>;
  normalizedAsr: string;
}): Array<{ ocrWord: string; quality: MatchQuality }> {
  const candidates: Array<{ ocrWord: string; quality: MatchQuality }> = [];
  const exact = params.ocrByWord.get(params.normalizedAsr);
  if (exact) candidates.push({ ocrWord: exact.word, quality: 'exact' });

  for (const ocrWord of params.ocrByWord.keys()) {
    if (ocrWord === params.normalizedAsr) continue;
    if (!isFuzzyMatch(ocrWord, params.normalizedAsr)) continue;
    candidates.push({ ocrWord, quality: 'fuzzy' });
  }

  return candidates;
}

function pickBestOcrTimestampForAsrStart(params: {
  timestamps: number[];
  asrStart: number;
  frameStepSeconds: number;
}): { ocrTimestamp: number; timeDiff: number } | null {
  const idx = findNearestTimestampIndex(params.timestamps, params.asrStart);
  if (idx < 0) return null;

  const timestamps = params.timestamps;
  const nearest = timestamps[idx];
  const lowerBound = timestamps[idx] >= params.asrStart ? idx : idx + 1;
  const prev = lowerBound - 1 >= 0 ? timestamps[lowerBound - 1] : undefined;
  const next = lowerBound < timestamps.length ? timestamps[lowerBound] : undefined;

  const isVisibleAtAsrStart =
    typeof prev === 'number' &&
    typeof next === 'number' &&
    next - prev <= params.frameStepSeconds * 1.5 &&
    params.asrStart - prev <= params.frameStepSeconds &&
    next - params.asrStart <= params.frameStepSeconds;

  const isNearSample = Math.abs(nearest - params.asrStart) <= params.frameStepSeconds * 1.1;
  const ocrTimestamp =
    isVisibleAtAsrStart || isNearSample ? params.asrStart : (nearest ?? Number.NaN);
  if (!Number.isFinite(ocrTimestamp)) return null;
  return { ocrTimestamp, timeDiff: Math.abs(ocrTimestamp - params.asrStart) };
}

function matchWords(
  ocrWords: Array<{ word: string; timestamps: number[] }>,
  asrResult: ASRResult,
  fps: number
): WordMatch[] {
  const matches: WordMatch[] = [];
  const ocrByWord = new Map(ocrWords.map((w) => [w.word, w] as const));
  const frameStepSeconds = fps > 0 ? 1 / fps : 0.5;

  for (const asrWord of asrResult.words) {
    const normalizedAsr = normalizeWord(asrWord.word);
    if (normalizedAsr.length < 2) continue;

    let best: { ocrWord: string; quality: MatchQuality; timeDiff: number } | null = null;
    let bestOcrTimestamp: number | null = null;

    const candidates = getOcrCandidatesForAsrWord({ ocrByWord, normalizedAsr });
    for (const candidate of candidates) {
      const timeline = ocrByWord.get(candidate.ocrWord);
      if (!timeline || timeline.timestamps.length === 0) continue;

      const pick = pickBestOcrTimestampForAsrStart({
        timestamps: timeline.timestamps,
        asrStart: asrWord.start,
        frameStepSeconds,
      });
      if (!pick) continue;

      if (
        !best ||
        isBetterCandidate({
          timeDiff: pick.timeDiff,
          quality: candidate.quality,
          bestTimeDiff: best.timeDiff,
          bestQuality: best.quality,
        })
      ) {
        best = { ocrWord: candidate.ocrWord, quality: candidate.quality, timeDiff: pick.timeDiff };
        bestOcrTimestamp = pick.ocrTimestamp;
      }
    }

    if (!best || typeof bestOcrTimestamp !== 'number' || !Number.isFinite(bestOcrTimestamp)) {
      continue;
    }

    const driftMs = (bestOcrTimestamp - asrWord.start) * 1000;
    matches.push({
      word: best.ocrWord,
      ocrTimestamp: bestOcrTimestamp,
      asrTimestamp: asrWord.start,
      driftMs,
      matchQuality: best.quality,
    });
  }

  return matches;
}

/**
 * Calculate sync metrics from word matches
 */
function calculateMetrics(
  matches: WordMatch[],
  ocrWordCount: number,
  asrWordCount: number
): SyncMetrics {
  if (matches.length === 0) {
    return {
      meanDriftMs: 0,
      maxDriftMs: 0,
      p95DriftMs: 0,
      medianDriftMs: 0,
      meanSignedDriftMs: 0,
      leadingRatio: 0,
      laggingRatio: 0,
      driftStdDev: 0,
      matchedWords: 0,
      totalOcrWords: ocrWordCount,
      totalAsrWords: asrWordCount,
      matchRatio: 0,
    };
  }

  const drifts = matches.map((m) => m.driftMs);
  const absDrifts = drifts.map(Math.abs);

  return {
    meanDriftMs: mean(absDrifts),
    maxDriftMs: Math.max(...absDrifts),
    p95DriftMs: percentile(absDrifts, 95),
    medianDriftMs: median(absDrifts),
    meanSignedDriftMs: mean(drifts),
    leadingRatio: drifts.filter((d) => d < 0).length / drifts.length,
    laggingRatio: drifts.filter((d) => d > 0).length / drifts.length,
    driftStdDev: standardDeviation(absDrifts),
    matchedWords: matches.length,
    totalOcrWords: ocrWordCount,
    totalAsrWords: asrWordCount,
    matchRatio: matches.length / Math.max(ocrWordCount, asrWordCount),
  };
}

/**
 * Calculate sync rating from metrics
 */
function calculateRating(metrics: SyncMetrics): number {
  if (metrics.matchedWords === 0) {
    return 0;
  }

  let score = 100;

  // Deduction 1: Mean drift (max -40 points)
  if (metrics.meanDriftMs > 50) {
    score -= Math.min(40, (metrics.meanDriftMs - 50) / 6.25);
  }

  // Deduction 2: Max drift (max -25 points)
  if (metrics.maxDriftMs > 100) {
    score -= Math.min(25, (metrics.maxDriftMs - 100) / 16);
  }

  // Deduction 3: P95 drift (max -15 points)
  if (metrics.p95DriftMs > 80) {
    score -= Math.min(15, (metrics.p95DriftMs - 80) / 21.3);
  }

  // Deduction 4: High variance (max -10 points)
  if (metrics.driftStdDev > 50) {
    score -= Math.min(10, (metrics.driftStdDev - 50) / 25);
  }

  // Deduction 5: Low match ratio (max -100 points).
  // If we can't match OCR ↔ ASR words, drift metrics are meaningless; score should tank.
  if (metrics.matchRatio < 0.9) {
    const matchRatio = Math.max(0, Math.min(1, metrics.matchRatio));
    if (matchRatio >= 0.7) {
      // 0.9 -> 0, 0.7 -> 20
      score -= ((0.9 - matchRatio) / 0.2) * 20;
    } else {
      // 0.7 -> 20, 0.0 -> 100
      score -= 20 + ((0.7 - matchRatio) / 0.7) * 80;
    }
  }

  return Math.max(0, Math.round(score));
}

/**
 * Get rating label from score
 */
function getRatingLabel(score: number): SyncRatingLabel {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'broken';
}

/**
 * Detect sync errors from analysis
 */
function detectErrors(metrics: SyncMetrics, matches: WordMatch[]): SyncError[] {
  const errors: SyncError[] = [];

  // Low match ratio
  if (metrics.matchRatio < 0.5) {
    errors.push({
      type: 'low_match_ratio',
      severity: 'critical',
      message: `Only ${(metrics.matchRatio * 100).toFixed(0)}% of words matched`,
      suggestedFix: 'Check OCR accuracy or video clarity',
    });
  }

  // Global offset detection
  const signedDrifts = matches.map((m) => m.driftMs);
  const allSameDirection = signedDrifts.every((d) => d > 0) || signedDrifts.every((d) => d < 0);
  if (allSameDirection && Math.abs(metrics.meanSignedDriftMs) > 100) {
    errors.push({
      type: 'global_offset',
      severity: 'error',
      message: `Consistent ${metrics.meanSignedDriftMs > 0 ? 'positive' : 'negative'} drift detected`,
      suggestedFix: `Apply global offset of ${Math.round(-metrics.meanSignedDriftMs)}ms`,
    });
  }

  // Sporadic errors
  const outliers = matches.filter((m) => Math.abs(m.driftMs) > 300);
  if (outliers.length > 0 && outliers.length < matches.length * 0.2) {
    errors.push({
      type: 'sporadic_errors',
      severity: 'warning',
      message: `${outliers.length} words have drift > 300ms`,
      affectedWords: outliers.slice(0, 5).map((m) => m.word),
    });
  }

  return errors;
}

function detectCaptionQualityErrors(params: {
  captionQuality: NonNullable<SyncRatingOutput['captionQuality']>;
}): SyncError[] {
  const { captionQuality } = params;
  const errors: SyncError[] = [];

  if (captionQuality.overall && !captionQuality.overall.passed) {
    errors.push({
      type: 'caption_quality_overall',
      severity: 'warning',
      message: `Caption quality overall below threshold (score=${captionQuality.overall.score.toFixed(2)})`,
      suggestedFix: 'Improve caption readability (safe margins, pacing, density) and re-render',
    });
  }

  if (captionQuality.flicker.flickerEvents > 0) {
    errors.push({
      type: 'caption_flicker',
      severity: 'warning',
      message: `Caption flicker detected (${captionQuality.flicker.flickerEvents} reappearance event(s))`,
      suggestedFix: 'Increase minimum on-screen time and avoid 1-frame subtitle dropouts',
    });
  }

  if (captionQuality.safeArea.violationCount > 0) {
    errors.push({
      type: 'caption_safe_margin',
      severity: 'warning',
      message: `Captions violate safe margins (${captionQuality.safeArea.violationCount} frame(s))`,
      suggestedFix: 'Move captions inward from screen edges (increase padding / safe area)',
    });
  }

  if (
    captionQuality.density.lineOverflowCount > 0 ||
    captionQuality.density.charOverflowCount > 0
  ) {
    errors.push({
      type: 'caption_density',
      severity: 'warning',
      message: `Caption crowding detected (lineOverflow=${captionQuality.density.lineOverflowCount}, charOverflow=${captionQuality.density.charOverflowCount})`,
      suggestedFix: 'Reduce words per caption and keep captions to 1–2 lines',
    });
  }

  if (
    captionQuality.punctuation.missingTerminalPunctuationCount > 0 ||
    captionQuality.punctuation.repeatedPunctuationCount > 0
  ) {
    errors.push({
      type: 'caption_punctuation',
      severity: 'warning',
      message: `Caption punctuation issues (missingTerminal=${captionQuality.punctuation.missingTerminalPunctuationCount}, repeated=${captionQuality.punctuation.repeatedPunctuationCount})`,
      suggestedFix: 'Fix punctuation in script/transcript normalization and re-render captions',
    });
  }

  if (captionQuality.capitalization.inconsistentStyleCount > 0) {
    errors.push({
      type: 'caption_capitalization',
      severity: 'warning',
      message: `Caption capitalization inconsistencies (${captionQuality.capitalization.inconsistentStyleCount} issue(s), style=${captionQuality.capitalization.style})`,
      suggestedFix: 'Pick a casing style (ALL CAPS or sentence-case) and enforce it consistently',
    });
  }

  if (captionQuality.ocrConfidence.mean < 0.7) {
    errors.push({
      type: 'caption_low_confidence',
      severity: 'warning',
      message: `Low OCR confidence may indicate poor caption legibility (mean=${captionQuality.ocrConfidence.mean.toFixed(2)})`,
      suggestedFix: 'Increase caption contrast (outline/shadow) and avoid cluttered backgrounds',
    });
  }

  return errors;
}

/**
 * Rate video sync quality
 *
 * @param videoPath Path to video file
 * @param options Rating options
 * @returns Sync rating output
 */
export async function rateSyncQuality(
  videoPath: string,
  options?: Partial<SyncRatingOptions> & { mock?: boolean }
): Promise<SyncRatingOutput> {
  const startTime = Date.now();
  const { mock, ...rawOptions } = options ?? {};
  const opts = SyncRatingOptionsSchema.parse(rawOptions);

  log.info({ videoPath, options: opts }, 'Starting sync quality rating');

  if (mock) {
    const analysisTimeMs = Date.now() - startTime;
    return buildMockSyncRatingOutput(videoPath, opts, analysisTimeMs);
  }

  validateSyncRatingInput(videoPath, opts);

  return rateSyncQualityReal(videoPath, opts, startTime);
}

/**
 * Rate burned-in caption quality (OCR-only, no ASR).
 *
 * Intended for fast caption tuning loops without paying the Whisper cost.
 */
export async function rateCaptionQuality(
  videoPath: string,
  options?: Partial<CaptionQualityRatingOptions> & { mock?: boolean }
): Promise<CaptionQualityRatingOutput> {
  const startTime = Date.now();
  const { mock, ...rawOptions } = options ?? {};
  const opts = CaptionQualityRatingOptionsSchema.parse(rawOptions);

  log.info({ videoPath, options: opts }, 'Starting caption quality rating (OCR-only)');

  if (mock) {
    const analysisTimeMs = Date.now() - startTime;
    return buildMockCaptionQualityRatingOutput(videoPath, opts, analysisTimeMs);
  }

  if (opts.ocrEngine !== 'tesseract') {
    throw new CMError('INVALID_ARGUMENT', `Unsupported OCR engine: ${opts.ocrEngine}`, {
      allowed: ['tesseract'],
      fix: 'Use ocrEngine=tesseract (easyocr is not implemented yet)',
    });
  }

  if (!existsSync(videoPath)) {
    throw new CMError('FILE_NOT_FOUND', `Video file not found: ${videoPath}`);
  }

  return rateCaptionQualityReal(videoPath, opts, startTime);
}

function validateSyncRatingInput(videoPath: string, opts: SyncRatingOptions): void {
  if (opts.ocrEngine !== 'tesseract') {
    throw new CMError('INVALID_ARGUMENT', `Unsupported OCR engine: ${opts.ocrEngine}`, {
      allowed: ['tesseract'],
      fix: 'Use ocrEngine=tesseract (easyocr is not implemented yet)',
    });
  }

  if (!existsSync(videoPath)) {
    throw new CMError('FILE_NOT_FOUND', `Video file not found: ${videoPath}`);
  }
}

async function rateSyncQualityReal(
  videoPath: string,
  opts: SyncRatingOptions,
  startTime: number
): Promise<SyncRatingOutput> {
  let framesDir: string | null = null;
  let audioPath: string | null = null;

  try {
    // Step 1: Extract frames
    const frameResult = await extractFrames(
      videoPath,
      opts.fps,
      opts.captionRegion,
      opts.maxSeconds
    );
    framesDir = frameResult.framesDir;

    // Step 2: Extract audio
    audioPath = await extractAudio(videoPath, opts.maxSeconds);

    // Step 3: Run OCR
    const ocrFrames = await runOCR(framesDir, opts.fps, frameResult.captionCrop.offsetY);

    // Step 4: Run ASR
    const asrResult = await transcribeAudio({
      audioPath,
      model: opts.asrModel,
      requireWhisper: true,
    });

    // Step 5: Extract OCR word appearances
    const ocrWords = extractWordAppearances(ocrFrames);

    // Step 6: Match words
    const matches = matchWords(ocrWords, asrResult, opts.fps);

    // Step 7: Calculate metrics
    const metrics = calculateMetrics(matches, ocrWords.length, asrResult.words.length);

    // Step 8: Calculate rating
    const rating = calculateRating(metrics);
    const ratingLabel = getRatingLabel(rating);

    // Step 9: Detect errors
    const errors = detectErrors(metrics, matches);

    const captionQuality = analyzeBurnedInCaptionQuality({
      ocrFrames,
      fps: opts.fps,
      videoDurationSeconds: frameResult.videoDurationSeconds,
      frameSize: frameResult.videoFrameSize,
    });
    errors.push(...detectCaptionQualityErrors({ captionQuality }));

    // Step 10: Check pass/fail
    const passed =
      rating >= opts.thresholds.minRating &&
      metrics.meanDriftMs <= opts.thresholds.maxMeanDriftMs &&
      metrics.maxDriftMs <= opts.thresholds.maxMaxDriftMs &&
      metrics.matchRatio >= opts.thresholds.minMatchRatio;

    // Build drift timeline
    const driftTimeline = matches.map((m) => ({
      timestamp: m.asrTimestamp,
      driftMs: m.driftMs,
    }));

    const analysisTimeMs = Date.now() - startTime;

    const output: SyncRatingOutput = {
      schemaVersion: '1.0.0',
      videoPath,
      rating,
      ratingLabel,
      passed,
      metrics,
      wordMatches: matches,
      driftTimeline,
      errors,
      analysis: {
        ocrEngine: opts.ocrEngine,
        asrEngine: asrResult.engine,
        framesAnalyzed: ocrFrames.length,
        analysisTimeMs,
        captionFrameSize: {
          width: frameResult.captionCrop.width,
          height: frameResult.captionCrop.height,
        },
        videoFrameSize: frameResult.videoFrameSize,
        captionCropOffsetY: frameResult.captionCrop.offsetY,
      },
      captionQuality,
      createdAt: new Date().toISOString(),
    };

    // Validate output
    const validated = SyncRatingOutputSchema.parse(output);

    log.info(
      {
        rating,
        ratingLabel,
        passed,
        matchedWords: metrics.matchedWords,
        meanDriftMs: metrics.meanDriftMs,
        analysisTimeMs,
      },
      'Sync rating complete'
    );

    return validated;
  } finally {
    // Cleanup temp files
    if (framesDir && existsSync(framesDir)) {
      rmSync(framesDir, { recursive: true, force: true });
    }
    if (audioPath && existsSync(audioPath)) {
      rmSync(audioPath, { force: true });
    }
  }
}

async function rateCaptionQualityReal(
  videoPath: string,
  opts: CaptionQualityRatingOptions,
  startTime: number
): Promise<CaptionQualityRatingOutput> {
  let framesDir: string | null = null;

  try {
    const frameResult = await extractFrames(
      videoPath,
      opts.fps,
      opts.captionRegion,
      opts.maxSeconds
    );
    framesDir = frameResult.framesDir;

    const ocrFrames = await runOCR(framesDir, opts.fps, frameResult.captionCrop.offsetY);

    const captionQuality = analyzeBurnedInCaptionQuality({
      ocrFrames,
      fps: opts.fps,
      videoDurationSeconds: frameResult.videoDurationSeconds,
      frameSize: frameResult.videoFrameSize,
    });

    const errors = detectCaptionQualityErrors({ captionQuality });

    const analysisTimeMs = Date.now() - startTime;
    const output: CaptionQualityRatingOutput = {
      schemaVersion: '1.0.0',
      videoPath,
      captionQuality,
      errors,
      analysis: {
        ocrEngine: opts.ocrEngine,
        fps: opts.fps,
        framesAnalyzed: ocrFrames.length,
        analysisTimeMs,
        captionFrameSize: {
          width: frameResult.captionCrop.width,
          height: frameResult.captionCrop.height,
        },
        videoFrameSize: frameResult.videoFrameSize,
        captionCropOffsetY: frameResult.captionCrop.offsetY,
        captionRegion: opts.captionRegion,
      },
      createdAt: new Date().toISOString(),
    };

    return CaptionQualityRatingOutputSchema.parse(output);
  } finally {
    if (framesDir && existsSync(framesDir)) {
      rmSync(framesDir, { recursive: true, force: true });
    }
  }
}

function buildMockSyncRatingOutput(
  videoPath: string,
  opts: SyncRatingOptions,
  analysisTimeMs: number
): SyncRatingOutput {
  const baseStart = 1.0;
  const words = ['this', 'is', 'a', 'mock', 'sync', 'rating', 'report'];

  const wordMatches: WordMatch[] = words.map((word, index) => {
    const asrTimestamp = baseStart + index * 0.4;
    const driftMs = 110 + (index % 3) * 15; // ~110-140ms, deterministic
    const ocrTimestamp = asrTimestamp + driftMs / 1000;
    return {
      word,
      ocrTimestamp,
      asrTimestamp,
      driftMs,
      matchQuality: 'exact',
    };
  });

  const metrics = calculateMetrics(wordMatches, wordMatches.length, wordMatches.length);
  const rating = calculateRating(metrics);
  const ratingLabel = getRatingLabel(rating);
  const errors = detectErrors(metrics, wordMatches);

  const videoFrameSize = { width: 1080, height: 1920 };
  const captionFrameSize = { width: 1080, height: 480 };
  const captionCropOffsetY = 1440;
  const framesAnalyzed = Math.max(1, Math.round(opts.fps * 5));
  const ocrFrames: OCRFrame[] = [];
  for (let i = 0; i < framesAnalyzed; i++) {
    const timestamp = i / Math.max(1, opts.fps);
    const text = timestamp < 2.5 ? 'HELLO WORLD' : 'SECOND CAPTION.';
    ocrFrames.push({
      frameNumber: i + 1,
      timestamp,
      text,
      confidence: 0.95,
      bbox: { x0: 180, y0: 1600, x1: 900, y1: 1700 },
    });
  }
  const captionQuality = analyzeBurnedInCaptionQuality({
    ocrFrames,
    fps: opts.fps,
    videoDurationSeconds: 5,
    frameSize: videoFrameSize,
  });
  errors.push(...detectCaptionQualityErrors({ captionQuality }));

  const passed =
    rating >= opts.thresholds.minRating &&
    metrics.meanDriftMs <= opts.thresholds.maxMeanDriftMs &&
    metrics.maxDriftMs <= opts.thresholds.maxMaxDriftMs &&
    metrics.matchRatio >= opts.thresholds.minMatchRatio;

  const output: SyncRatingOutput = {
    schemaVersion: '1.0.0',
    videoPath,
    rating,
    ratingLabel,
    passed,
    metrics,
    wordMatches,
    driftTimeline: wordMatches.map((m) => ({ timestamp: m.asrTimestamp, driftMs: m.driftMs })),
    errors,
    analysis: {
      ocrEngine: opts.ocrEngine,
      asrEngine: 'mock',
      framesAnalyzed,
      analysisTimeMs,
      captionFrameSize,
      videoFrameSize,
      captionCropOffsetY,
    },
    captionQuality,
    createdAt: new Date().toISOString(),
  };

  return SyncRatingOutputSchema.parse(output);
}

function buildMockCaptionQualityRatingOutput(
  videoPath: string,
  opts: CaptionQualityRatingOptions,
  analysisTimeMs: number
): CaptionQualityRatingOutput {
  const videoFrameSize = { width: 1080, height: 1920 };
  const cropY = Math.floor(videoFrameSize.height * opts.captionRegion.yRatio);
  const cropH = Math.floor(videoFrameSize.height * opts.captionRegion.heightRatio);
  const captionFrameSize = { width: videoFrameSize.width, height: cropH };

  const framesAnalyzed = Math.max(1, Math.round(opts.fps * 6));
  const ocrFrames: OCRFrame[] = [];
  for (let i = 0; i < framesAnalyzed; i++) {
    ocrFrames.push({
      frameNumber: i + 1,
      timestamp: i / opts.fps,
      text: 'THIS IS A MOCK CAPTION',
      confidence: 0.92,
      bbox: {
        x0: 120,
        y0: cropY + 60,
        x1: 960,
        y1: cropY + 220,
      },
    });
  }

  const captionQuality = analyzeBurnedInCaptionQuality({
    ocrFrames,
    fps: opts.fps,
    videoDurationSeconds: 6,
    frameSize: videoFrameSize,
  });

  const errors = detectCaptionQualityErrors({ captionQuality });

  const output: CaptionQualityRatingOutput = {
    schemaVersion: '1.0.0',
    videoPath,
    captionQuality,
    errors,
    analysis: {
      ocrEngine: opts.ocrEngine,
      fps: opts.fps,
      framesAnalyzed,
      analysisTimeMs,
      captionFrameSize,
      videoFrameSize,
      captionCropOffsetY: cropY,
      captionRegion: opts.captionRegion,
    },
    createdAt: new Date().toISOString(),
  };

  return CaptionQualityRatingOutputSchema.parse(output);
}

/**
 * Format sync rating as CLI output
 */
export function formatSyncRatingCLI(output: SyncRatingOutput): string {
  const statusIcon = output.passed ? '✓' : '✗';
  const statusText = output.passed ? 'PASSED' : 'FAILED';

  const lines = [
    '┌─────────────────────────────────────────────────────────────┐',
    '│                    SYNC RATING REPORT                        │',
    '├─────────────────────────────────────────────────────────────┤',
    `│  Video: ${basename(output.videoPath).padEnd(50)}│`,
    `│  Rating: ${output.rating}/100 (${output.ratingLabel.toUpperCase()})`.padEnd(62) + '│',
    `│  Status: ${statusIcon} ${statusText}`.padEnd(62) + '│',
    '├─────────────────────────────────────────────────────────────┤',
    '│  METRICS                                                    │',
    '│  ─────────────────────────────────────────────────────────  │',
    `│  Mean Drift:     ${output.metrics.meanDriftMs.toFixed(0).padStart(4)}ms`.padEnd(62) + '│',
    `│  Max Drift:      ${output.metrics.maxDriftMs.toFixed(0).padStart(4)}ms`.padEnd(62) + '│',
    `│  P95 Drift:      ${output.metrics.p95DriftMs.toFixed(0).padStart(4)}ms`.padEnd(62) + '│',
    `│  Match Ratio:    ${(output.metrics.matchRatio * 100).toFixed(0).padStart(3)}%`.padEnd(62) +
      '│',
  ];

  if (output.captionQuality) {
    lines.push('│'.padEnd(62) + '│');
    lines.push('│  CAPTION QUALITY (OCR)                                       │');
    lines.push('│  ─────────────────────────────────────────────────────────  │');
    lines.push(
      `│  Overall:        ${output.captionQuality.overall.score.toFixed(2).padStart(4)} (${output.captionQuality.overall.passed ? 'PASS' : 'FAIL'})`.padEnd(
        62
      ) + '│'
    );
    lines.push(
      `│  Coverage:       ${(output.captionQuality.coverage.coverageRatio * 100)
        .toFixed(0)
        .padStart(3)}%`.padEnd(62) + '│'
    );
    lines.push(
      `│  Rhythm Score:    ${output.captionQuality.rhythm.score.toFixed(2).padStart(4)}`.padEnd(
        62
      ) + '│'
    );
    lines.push(
      `│  Safe Area Score: ${output.captionQuality.safeArea.score.toFixed(2).padStart(4)}`.padEnd(
        62
      ) + '│'
    );
    lines.push(
      `│  Density Score:   ${output.captionQuality.density.score.toFixed(2).padStart(4)}`.padEnd(
        62
      ) + '│'
    );
    lines.push(
      `│  OCR Conf:        ${output.captionQuality.ocrConfidence.mean.toFixed(2).padStart(4)}`.padEnd(
        62
      ) + '│'
    );
  }

  if (output.errors.length > 0) {
    lines.push('├─────────────────────────────────────────────────────────────┤');
    lines.push(`│  ISSUES (${output.errors.length})`.padEnd(62) + '│');
    lines.push('│  ─────────────────────────────────────────────────────────  │');
    for (const error of output.errors) {
      const icon = error.severity === 'critical' ? '✗' : error.severity === 'error' ? '!' : '⚠';
      lines.push(`│  ${icon} ${error.message}`.substring(0, 61).padEnd(62) + '│');
    }
  }

  lines.push('└─────────────────────────────────────────────────────────────┘');

  return lines.join('\n');
}
