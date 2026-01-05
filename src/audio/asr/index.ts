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

    // Extract word-level timestamps
    const words: WordTimestamp[] = [];
    let duration = 0;

    for (const segment of result.transcription) {
      if (segment.tokens) {
        for (const token of segment.tokens) {
          if (token.text.trim()) {
            words.push({
              word: token.text.trim(),
              start: token.offsets.from / 1000,
              end: token.offsets.to / 1000,
              confidence: token.p,
            });
            duration = Math.max(duration, token.offsets.to / 1000);
          }
        }
      }
    }

    const fullText = result.transcription
      .map((s) => s.text)
      .join(' ')
      .trim();

    log.info(
      {
        wordCount: words.length,
        duration,
        engine: 'whisper-cpp',
      },
      'Transcription complete'
    );

    return {
      words,
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
 * Uses a simple linear distribution approach
 */
function estimateTimestamps(text: string, audioDuration: number): ASRResult {
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Calculate average word duration
  const avgWordDuration = audioDuration / wordCount;

  // Build word timestamps with slight variations for natural feel
  const wordTimestamps: WordTimestamp[] = [];
  let currentTime = 0;

  for (const word of words) {
    // Vary duration slightly based on word length
    const lengthFactor = Math.min(word.length / 5, 1.5);
    const wordDuration = avgWordDuration * (0.8 + 0.4 * lengthFactor);

    wordTimestamps.push({
      word,
      start: currentTime,
      end: Math.min(currentTime + wordDuration, audioDuration),
      confidence: 0.9, // Estimated confidence
    });

    currentTime += wordDuration;
  }

  // Normalize to fit exact duration
  if (wordTimestamps.length > 0 && currentTime > 0) {
    const scale = audioDuration / currentTime;
    for (const wt of wordTimestamps) {
      wt.start *= scale;
      wt.end *= scale;
    }
  }

  return {
    words: wordTimestamps,
    duration: audioDuration,
    text,
    engine: 'estimated',
  };
}
