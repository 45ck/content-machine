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

/**
 * Extract word timestamps from whisper transcription segments.
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
        if (token.text.trim()) {
          words.push({
            word: token.text.trim(),
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

  log.info({ model }, 'Starting transcription');

  // Try whisper.cpp first
  try {
    const result = await transcribeWithWhisper(options, log);
    if (result) {
      return result;
    }
  } catch (error) {
    log.warn({ error }, 'Whisper.cpp transcription failed, falling back to estimation');
  }

  // Fallback to estimated timestamps
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

  const model = options.model ?? 'base';

  try {
    // Ensure whisper model is installed
    await whisper.downloadWhisperModel({
      model,
      folder: './.cache/whisper',
    });
    log.debug({ model }, 'Whisper model ready');

    // Transcribe with word-level timestamps
    const result = await whisper.transcribe({
      inputPath: options.audioPath,
      model,
      modelFolder: './.cache/whisper',
      tokenLevelTimestamps: true,
      language: options.language,
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
  } catch (error) {
    log.warn({ error }, 'Whisper.cpp transcription failed');
    return null;
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
