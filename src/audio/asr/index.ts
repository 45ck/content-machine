/**
 * ASR - Automatic Speech Recognition using whisper.cpp
 * 
 * Transcribes audio to get word-level timestamps.
 */
import { createLogger } from '../../core/logger';
import { APIError } from '../../core/errors';
import { WordTimestamp } from '../schema';

// Import from @remotion/install-whisper-cpp for transcription
let whisperModule: typeof import('@remotion/install-whisper-cpp') | null = null;

async function getWhisper() {
  if (!whisperModule) {
    whisperModule = await import('@remotion/install-whisper-cpp');
  }
  return whisperModule;
}

export interface ASROptions {
  audioPath: string;
  model?: 'tiny' | 'base' | 'small' | 'medium' | 'large';
  language?: string;
}

export interface ASRResult {
  words: WordTimestamp[];
  duration: number;
  text: string;
}

/**
 * Transcribe audio file to get word-level timestamps
 */
export async function transcribeAudio(options: ASROptions): Promise<ASRResult> {
  const log = createLogger({ module: 'asr', audioPath: options.audioPath });
  const model = options.model ?? 'base';
  
  log.info({ model }, 'Starting transcription');
  
  try {
    const whisper = await getWhisper();
    
    // Ensure whisper model is installed
    const modelPath = await whisper.downloadWhisperModel({
      model,
      folder: './.cache/whisper',
    });
    
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
              start: token.offsets.from / 1000, // Convert ms to seconds
              end: token.offsets.to / 1000,
              confidence: token.p,
            });
            duration = Math.max(duration, token.offsets.to / 1000);
          }
        }
      }
    }
    
    const fullText = result.transcription.map(s => s.text).join(' ').trim();
    
    log.info({ 
      wordCount: words.length, 
      duration,
      textLength: fullText.length 
    }, 'Transcription complete');
    
    return {
      words,
      duration,
      text: fullText,
    };
    
  } catch (error) {
    log.error({ error }, 'Transcription failed');
    throw new APIError(
      `Transcription failed: ${error instanceof Error ? error.message : String(error)}`,
      { audioPath: options.audioPath }
    );
  }
}
