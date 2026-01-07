/**
 * ASR - Automatic Speech Recognition
 *
 * Transcribes audio to get word-level timestamps.
 * Supports whisper.cpp for accurate timestamps or estimated timestamps
 * based on audio duration when whisper is not available.
 */
import { createLogger } from '../../core/logger';
import { APIError } from '../../core/errors';
import { WordTimestamp } from '../schema';
import { validateWordTimings, repairWordTimings, TimestampValidationError } from './validator';
import type { Language, WhisperModel } from '@remotion/install-whisper-cpp';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs';

const execAsync = promisify(exec);

// Import from @remotion/install-whisper-cpp for transcription
let whisperModule: typeof import('@remotion/install-whisper-cpp') | null = null;
let whisperInstallFailed = false;

async function getWhisper() {
  if (whisperInstallFailed) {
    return null;
  }
  if (!whisperModule) {
    try {
      whisperModule = await import('@remotion/install-whisper-cpp');
    } catch {
      whisperInstallFailed = true;
      return null;
    }
  }
  return whisperModule;
}

export interface ASROptions {
  audioPath: string;
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
  /** Original text for fallback estimation */
  originalText?: string;
  /** Audio duration in seconds for fallback estimation */
  audioDuration?: number;
  /**
   * If true, require Whisper ASR and fail if not available.
   * Used in "audio-first" pipeline mode for guaranteed accurate timestamps.
   */
  requireWhisper?: boolean;
}

export interface ASRResult {
  words: WordTimestamp[];
  duration: number;
  text: string;
  engine: 'whisper-cpp' | 'estimated';
}

/** Whisper transcription segment structure */
interface WhisperToken {
  text: string;
  offsets: { from: number; to: number };
  p?: number;
}

interface WhisperSegment {
  text: string;
  tokens?: WhisperToken[];
}

function resolveWhisperModel(model: NonNullable<ASROptions['model']>): WhisperModel {
  if (model === 'large') {
    // Map user-facing "large" to a concrete whisper.cpp model.
    return 'large-v3';
  }
  return model;
}

/**
 * Resample audio to 16kHz mono WAV for Whisper.cpp compatibility.
 * Whisper.cpp requires 16kHz sample rate.
 * @returns Path to resampled audio file (temp file if resampling needed)
 */
async function resampleFor16kHz(
  audioPath: string,
  log: ReturnType<typeof createLogger>
): Promise<{ resampledPath: string; needsCleanup: boolean }> {
  // Convert to absolute path to avoid working directory issues
  const absoluteAudioPath = path.resolve(audioPath);

  // Check current sample rate using ffprobe
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of default=noprint_wrappers=1:nokey=1 "${absoluteAudioPath}"`
    );
    const sampleRate = parseInt(stdout.trim(), 10);

    if (sampleRate === 16000) {
      log.debug({ sampleRate }, 'Audio already at 16kHz, no resampling needed');
      return { resampledPath: absoluteAudioPath, needsCleanup: false };
    }

    log.info({ currentRate: sampleRate, targetRate: 16000 }, 'Resampling audio for Whisper');
  } catch (error) {
    log.warn({ error }, 'Could not probe sample rate, will attempt resampling anyway');
  }

  // Create resampled file path (absolute)
  const dir = path.dirname(absoluteAudioPath);
  const ext = path.extname(absoluteAudioPath);
  const base = path.basename(absoluteAudioPath, ext);
  const resampledPath = path.join(dir, `${base}_16khz${ext}`);

  // Resample to 16kHz mono using FFmpeg
  try {
    await execAsync(
      `ffmpeg -y -i "${absoluteAudioPath}" -ar 16000 -ac 1 -c:a pcm_s16le "${resampledPath}"`
    );

    // Verify the file was created
    if (!fs.existsSync(resampledPath)) {
      throw new Error(`Resampled file was not created at ${resampledPath}`);
    }

    log.debug({ resampledPath }, 'Audio resampled to 16kHz');
    return { resampledPath, needsCleanup: true };
  } catch (error) {
    throw new APIError(
      'Failed to resample audio to 16kHz for Whisper. Ensure FFmpeg is installed.',
      { audioPath: absoluteAudioPath, error: String(error) }
    );
  }
}

/**
 * Check if a word is a Whisper special token that should be filtered out.
 * These include:
 * - [_BEG_] - begin token
 * - [_TT_xxx] - timing tokens
 * - [_xxx_] - any special tokens in brackets
 * - Standalone punctuation (single character punctuation)
 */
function isWhisperArtifact(word: string): boolean {
  const trimmed = word.trim();

  // Empty or whitespace only
  if (!trimmed) return true;

  // Whisper special tokens in brackets like [_BEG_], [_TT_123]
  if (/^\[.*\]$/.test(trimmed)) return true;

  // Standalone punctuation (single punctuation character)
  if (/^[.,!?;:'"()-]$/.test(trimmed)) return true;

  // Very short non-alphabetic tokens (likely artifacts)
  if (trimmed.length === 1 && !/[a-zA-Z0-9]/.test(trimmed)) return true;

  return false;
}

/**
 * Extract word timestamps from whisper transcription segments.
 * Filters out Whisper special tokens and artifacts.
 * @internal
 */
function extractWordsFromSegments(segments: WhisperSegment[]): {
  words: WordTimestamp[];
  duration: number;
} {
  const words: WordTimestamp[] = [];
  let duration = 0;

  for (const segment of segments) {
    if (segment.tokens) {
      for (const token of segment.tokens) {
        const text = token.text.trim();
        // Filter out Whisper artifacts and special tokens
        if (text && !isWhisperArtifact(text)) {
          words.push({
            word: text,
            start: token.offsets.from / 1000,
            end: token.offsets.to / 1000,
            confidence: token.p ?? 0.9, // Default confidence if not provided
          });
          duration = Math.max(duration, token.offsets.to / 1000);
        }
      }
    }
  }

  return { words, duration };
}

/**
 * Validate and optionally repair word timestamps.
 * @internal
 */
function validateOrRepairTimestamps(
  words: WordTimestamp[],
  duration: number,
  log: ReturnType<typeof createLogger>
): WordTimestamp[] {
  try {
    validateWordTimings(words, duration, {
      minCoverageRatio: 0.85, // Whisper may have small gaps
    });
    return words;
  } catch (error) {
    if (error instanceof TimestampValidationError) {
      log.warn(
        { error: error.message, wordIndex: error.wordIndex, word: error.word },
        'Whisper timestamp validation failed, attempting repair'
      );
      return repairWordTimings(words, duration);
    }
    throw error;
  }
}

/**
 * Transcribe audio file to get word-level timestamps
 */
export async function transcribeAudio(options: ASROptions): Promise<ASRResult> {
  const log = createLogger({ module: 'asr', audioPath: options.audioPath });
  const model = options.model ?? 'base';

  log.info({ model, requireWhisper: options.requireWhisper }, 'Starting transcription');

  // Try whisper.cpp first
  try {
    const result = await transcribeWithWhisper(options, log);
    if (result) {
      return result;
    }
  } catch (error) {
    // If requireWhisper is true, don't fall back to estimation
    if (options.requireWhisper) {
      throw new APIError(
        'Whisper.cpp transcription failed and requireWhisper=true. Install whisper model or use standard pipeline.',
        { audioPath: options.audioPath, error: String(error) }
      );
    }
    log.warn({ error }, 'Whisper.cpp transcription failed, falling back to estimation');
  }

  // In audio-first mode, we require Whisper - never fall back
  if (options.requireWhisper) {
    throw new APIError(
      'Whisper.cpp not available but requireWhisper=true. Run `npx @remotion/install-whisper-cpp` to install.',
      { audioPath: options.audioPath }
    );
  }

  // Fallback to estimated timestamps (only in standard pipeline mode)
  if (options.originalText && options.audioDuration) {
    log.info('Using estimated timestamps based on audio duration');
    return estimateTimestamps(options.originalText, options.audioDuration);
  }

  throw new APIError(
    'Transcription failed: whisper.cpp not available and no fallback text provided',
    { audioPath: options.audioPath }
  );
}

/**
 * Transcribe with whisper.cpp
 */
async function transcribeWithWhisper(
  options: ASROptions,
  log: ReturnType<typeof createLogger>
): Promise<ASRResult | null> {
  const whisper = await getWhisper();
  if (!whisper) {
    return null;
  }

  const rawModel = options.model ?? 'base';
  const model = resolveWhisperModel(rawModel);
  const whisperFolder = './.cache/whisper';
  const whisperCppVersion = '1.5.5';
  const language = options.language ? (options.language as Language) : undefined;

  // Ensure whisper model is installed
  await whisper.downloadWhisperModel({
    model,
    folder: whisperFolder,
  });
  log.debug({ model, whisperFolder }, 'Whisper model ready');

  // Ensure whisper executable is installed
  await whisper.installWhisperCpp({
    to: whisperFolder,
    version: whisperCppVersion,
  });
  log.debug({ whisperFolder, whisperCppVersion }, 'Whisper executable ready');

  // Resample audio to 16kHz for Whisper compatibility
  const { resampledPath, needsCleanup } = await resampleFor16kHz(options.audioPath, log);

  try {
    // Transcribe with word-level timestamps
    const result = await whisper.transcribe({
      inputPath: resampledPath,
      whisperPath: whisperFolder,
      whisperCppVersion,
      model,
      modelFolder: whisperFolder,
      tokenLevelTimestamps: true,
      language,
    });

    // Extract word timestamps using helper
    const { words, duration } = extractWordsFromSegments(result.transcription);

    const fullText = result.transcription
      .map((s) => s.text)
      .join(' ')
      .trim();

    log.info(
      { wordCount: words.length, duration, engine: 'whisper-cpp' },
      'Transcription complete'
    );

    // Validate and optionally repair timestamps
    const validatedWords = validateOrRepairTimestamps(words, duration, log);

    return {
      words: validatedWords,
      duration,
      text: fullText,
      engine: 'whisper-cpp',
    };
  } finally {
    // Clean up resampled file if created
    if (needsCleanup) {
      try {
        fs.unlinkSync(resampledPath);
        log.debug({ resampledPath }, 'Cleaned up resampled audio file');
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Estimate word timestamps based on text and audio duration
 * Uses a simple linear distribution approach with validation.
 *
 * FIXED: Previous version had scaling bugs that caused end < start.
 * Now uses proper proportional distribution without post-scaling.
 */
function estimateTimestamps(text: string, audioDuration: number): ASRResult {
  const log = createLogger({ module: 'asr-estimate' });
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      words: [],
      duration: audioDuration,
      text,
      engine: 'estimated',
    };
  }

  // Calculate character-weighted durations (more accurate than uniform)
  const totalChars = words.reduce((sum, w) => sum + w.length, 0);
  const msPerChar = (audioDuration * 1000) / totalChars;

  // Build word timestamps proportionally
  const wordTimestamps: WordTimestamp[] = [];
  let currentTimeMs = 0;

  for (const word of words) {
    // Duration based on character count
    const wordDurationMs = word.length * msPerChar;
    const startMs = currentTimeMs;
    const endMs = currentTimeMs + wordDurationMs;

    wordTimestamps.push({
      word,
      start: startMs / 1000, // Convert to seconds
      end: endMs / 1000,
      confidence: 0.8, // Lower confidence for estimates
    });

    currentTimeMs = endMs;
  }

  // Validate timestamps (should always pass with this algorithm)
  try {
    validateWordTimings(wordTimestamps, audioDuration, {
      minCoverageRatio: 0.9, // Lower threshold for estimates
    });
  } catch (error) {
    if (error instanceof TimestampValidationError) {
      log.warn(
        { error: error.message, wordIndex: error.wordIndex },
        'Timestamp validation failed, attempting repair'
      );
      // Attempt repair
      const repaired = repairWordTimings(wordTimestamps, audioDuration);
      return {
        words: repaired,
        duration: audioDuration,
        text,
        engine: 'estimated',
      };
    }
    throw error;
  }

  return {
    words: wordTimestamps,
    duration: audioDuration,
    text,
    engine: 'estimated',
  };
}
