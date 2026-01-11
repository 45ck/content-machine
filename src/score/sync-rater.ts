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
  type SyncRatingOutput,
  type SyncMetrics,
  type SyncError,
  type WordMatch,
  type OCRFrame,
  type SyncRatingOptions,
  type SyncRatingLabel,
  SyncRatingOutputSchema,
  SyncRatingOptionsSchema,
} from './sync-schema';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { promisify } from 'node:util';
import { probeVideoWithFfprobe } from '../validate/ffprobe';

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
  captionRegion: { yRatio: number; heightRatio: number }
): Promise<{ framesDir: string; frameCount: number }> {
  const framesDir = join(tmpdir(), `cm-sync-frames-${Date.now()}`);
  mkdirSync(framesDir, { recursive: true });

  log.debug({ videoPath, fps, framesDir }, 'Extracting frames');

  const info = await probeVideoWithFfprobe(videoPath);
  const width = info.width;
  const height = info.height;

  // Calculate crop region for captions (bottom portion)
  const cropY = Math.floor(height * captionRegion.yRatio);
  const cropH = Math.floor(height * captionRegion.heightRatio);

  // Extract frames, cropped to caption region
  try {
    await execFileAsync(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        videoPath,
        '-vf',
        `fps=${fps},crop=${width}:${cropH}:0:${cropY}`,
        '-q:v',
        '2',
        join(framesDir, 'frame_%04d.png'),
      ],
      { windowsHide: true, timeout: 60_000 }
    );
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

  return { framesDir, frameCount: files.length };
}

/**
 * Extract audio from video
 */
async function extractAudio(videoPath: string): Promise<string> {
  const audioPath = join(tmpdir(), `cm-sync-audio-${Date.now()}.wav`);

  log.debug({ videoPath, audioPath }, 'Extracting audio');

  try {
    await execFileAsync(
      'ffmpeg',
      [
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
      ],
      { windowsHide: true, timeout: 60_000 }
    );
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
async function runOCR(framesDir: string, fps: number): Promise<OCRFrame[]> {
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

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const framePath = join(framesDir, file);
    const frameNumber = i + 1;
    // ffmpeg fps filter emits the first frame at t=0, so use zero-based index for timestamps.
    const timestamp = i / fps;

    try {
      const result = await worker.recognize(framePath);
      const text = result.data.text.trim().toUpperCase();
      const confidence = result.data.confidence / 100;

      if (text.length > 0) {
        results.push({
          frameNumber,
          timestamp,
          text,
          confidence,
        });
      }
    } catch (error) {
      log.warn({ frameNumber, error }, 'OCR failed for frame');
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
): Array<{ word: string; firstAppearance: number; lastAppearance: number }> {
  const wordMap = new Map<string, { first: number; last: number }>();

  for (const frame of ocrFrames) {
    const words = frame.text.split(/\s+/).filter(Boolean);
    for (const word of words) {
      const normalized = normalizeWord(word);
      if (normalized.length < 2) continue; // Skip very short words

      const existing = wordMap.get(normalized);
      if (!existing) {
        wordMap.set(normalized, { first: frame.timestamp, last: frame.timestamp });
      } else {
        existing.last = frame.timestamp;
      }
    }
  }

  return Array.from(wordMap.entries()).map(([word, times]) => ({
    word,
    firstAppearance: times.first,
    lastAppearance: times.last,
  }));
}

/**
 * Match OCR words to ASR words
 */
type MatchQuality = 'exact' | 'fuzzy';

function getMatchQuality(ocrWord: string, asrWord: string): MatchQuality | null {
  if (ocrWord === asrWord) {
    return 'exact';
  }
  if (isFuzzyMatch(ocrWord, asrWord)) {
    return 'fuzzy';
  }
  return null;
}

function isBetterCandidate(
  timeDiff: number,
  quality: MatchQuality,
  bestTimeDiff: number,
  bestQuality: MatchQuality | undefined
): boolean {
  if (timeDiff < bestTimeDiff) return true;
  if (timeDiff > bestTimeDiff) return false;
  return quality === 'exact' && bestQuality !== 'exact';
}

function findBestAsrMatch(
  ocrWord: { word: string; firstAppearance: number },
  asrResult: ASRResult,
  usedAsrIndices: Set<number>
): { index: number; quality: MatchQuality } | null {
  let bestIndex = -1;
  let bestTimeDiff = Infinity;
  let bestQuality: MatchQuality | undefined;

  for (let i = 0; i < asrResult.words.length; i++) {
    if (usedAsrIndices.has(i)) continue;

    const asrWord = asrResult.words[i];
    const normalizedAsr = normalizeWord(asrWord.word);
    const quality = getMatchQuality(ocrWord.word, normalizedAsr);
    if (!quality) continue;

    const timeDiff = Math.abs(ocrWord.firstAppearance - asrWord.start);
    if (isBetterCandidate(timeDiff, quality, bestTimeDiff, bestQuality)) {
      bestIndex = i;
      bestTimeDiff = timeDiff;
      bestQuality = quality;
    }
  }

  if (bestIndex < 0 || !bestQuality) {
    return null;
  }

  return { index: bestIndex, quality: bestQuality };
}

function matchWords(
  ocrWords: Array<{ word: string; firstAppearance: number }>,
  asrResult: ASRResult
): WordMatch[] {
  const matches: WordMatch[] = [];
  const usedAsrIndices = new Set<number>();

  for (const ocrWord of ocrWords) {
    const bestMatch = findBestAsrMatch(ocrWord, asrResult, usedAsrIndices);
    if (!bestMatch) continue;

    const asrWord = asrResult.words[bestMatch.index];
    usedAsrIndices.add(bestMatch.index);

    const driftMs = (ocrWord.firstAppearance - asrWord.start) * 1000;
    matches.push({
      word: ocrWord.word,
      ocrTimestamp: ocrWord.firstAppearance,
      asrTimestamp: asrWord.start,
      driftMs,
      matchQuality: bestMatch.quality,
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

  // Deduction 5: Low match ratio (max -10 points)
  if (metrics.matchRatio < 0.9) {
    score -= Math.min(10, (0.9 - metrics.matchRatio) * 50);
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

function validateSyncRatingInput(videoPath: string, opts: SyncRatingOptions): void {
  if (!existsSync(videoPath)) {
    throw new CMError('FILE_NOT_FOUND', `Video file not found: ${videoPath}`);
  }

  if (opts.ocrEngine !== 'tesseract') {
    throw new CMError('INVALID_ARGUMENT', `Unsupported OCR engine: ${opts.ocrEngine}`, {
      allowed: ['tesseract'],
      fix: 'Use ocrEngine=tesseract (easyocr is not implemented yet)',
    });
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
    const frameResult = await extractFrames(videoPath, opts.fps, opts.captionRegion);
    framesDir = frameResult.framesDir;

    // Step 2: Extract audio
    audioPath = await extractAudio(videoPath);

    // Step 3: Run OCR
    const ocrFrames = await runOCR(framesDir, opts.fps);

    // Step 4: Run ASR
    const asrResult = await transcribeAudio({
      audioPath,
      model: opts.asrModel,
      requireWhisper: true,
    });

    // Step 5: Extract OCR word appearances
    const ocrWords = extractWordAppearances(ocrFrames);

    // Step 6: Match words
    const matches = matchWords(ocrWords, asrResult);

    // Step 7: Calculate metrics
    const metrics = calculateMetrics(matches, ocrWords.length, asrResult.words.length);

    // Step 8: Calculate rating
    const rating = calculateRating(metrics);
    const ratingLabel = getRatingLabel(rating);

    // Step 9: Detect errors
    const errors = detectErrors(metrics, matches);

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
      },
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
      framesAnalyzed: Math.max(1, Math.round(opts.fps * 5)),
      analysisTimeMs,
    },
    createdAt: new Date().toISOString(),
  };

  return SyncRatingOutputSchema.parse(output);
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
