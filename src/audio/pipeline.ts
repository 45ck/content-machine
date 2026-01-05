/**
 * Audio Pipeline
 *
 * Coordinates TTS generation and ASR transcription for word-level timestamps.
 * Based on SYSTEM-DESIGN §7.2 cm audio command.
 */
import { writeFile } from 'fs/promises';
import { ScriptOutput } from '../script/generator';
import { createLogger } from '../core/logger';
import {
  AudioOutput,
  AudioOutputSchema,
  TimestampsOutput,
  WordTimestamp,
  SceneTimestamp,
  AUDIO_SCHEMA_VERSION,
} from './schema';
import { synthesizeSpeech } from './tts';
import { transcribeAudio, ASRResult } from './asr';

export type { AudioOutput, TimestampsOutput, WordTimestamp } from './schema';

export interface GenerateAudioOptions {
  script: ScriptOutput;
  voice: string;
  outputPath: string;
  timestampsPath: string;
  /** Use mock audio generation for testing */
  mock?: boolean;
}

/**
 * Generate audio from script with word-level timestamps
 */
export async function generateAudio(options: GenerateAudioOptions): Promise<AudioOutput> {
  const log = createLogger({ module: 'audio', voice: options.voice });

  log.info(
    { sceneCount: options.script.scenes.length, mock: options.mock },
    'Starting audio generation'
  );

  // Mock mode for testing without real TTS/ASR
  if (options.mock) {
    return generateMockAudio(options);
  }

  // Combine all script text for TTS
  const fullText = buildFullText(options.script);

  log.debug({ textLength: fullText.length }, 'Combined script text');

  // Step 1: Generate TTS audio
  log.info('Generating TTS audio');
  const ttsResult = await synthesizeSpeech({
    text: fullText,
    voice: options.voice,
    outputPath: options.outputPath,
  });

  log.info({ duration: ttsResult.duration }, 'TTS audio generated');

  // Step 2: Transcribe for word-level timestamps
  log.info('Transcribing audio for timestamps');
  const asrResult = await transcribeAudio({
    audioPath: options.outputPath,
    originalText: fullText,
    audioDuration: ttsResult.duration,
  });

  log.info(
    { wordCount: asrResult.words.length, engine: asrResult.engine },
    'Transcription complete'
  );

  // Step 3: Build timestamps output
  const timestamps = buildTimestamps(asrResult, options.script);

  // Save timestamps
  await writeFile(options.timestampsPath, JSON.stringify(timestamps, null, 2), 'utf-8');

  const output: AudioOutput = {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    audioPath: options.outputPath,
    timestampsPath: options.timestampsPath,
    timestamps,
    duration: ttsResult.duration,
    wordCount: asrResult.words.length,
    voice: options.voice,
    sampleRate: ttsResult.sampleRate,
    ttsCost: ttsResult.cost,
  };

  // Validate output
  const validated = AudioOutputSchema.parse(output);

  log.info(
    {
      duration: validated.duration,
      wordCount: validated.wordCount,
    },
    'Audio generation complete'
  );

  return validated;
}

/**
 * Generate mock audio output for testing
 */
async function generateMockAudio(options: GenerateAudioOptions): Promise<AudioOutput> {
  const log = createLogger({ module: 'audio', mock: true });

  // Create mock word timestamps from script text
  const words: WordTimestamp[] = [];
  let currentTime = 0;
  const wordDuration = 0.3; // ~200 WPM

  for (const scene of options.script.scenes) {
    const sceneWords = scene.text.split(/\s+/).filter(Boolean);
    for (const word of sceneWords) {
      words.push({
        word,
        start: currentTime,
        end: currentTime + wordDuration,
        confidence: 0.95,
      });
      currentTime += wordDuration;
    }
  }

  // Build mock scene timestamps
  const scenes: SceneTimestamp[] = [];
  let wordIndex = 0;

  for (const scene of options.script.scenes) {
    const sceneWordCount = scene.text.split(/\s+/).filter(Boolean).length;
    const sceneWords = words.slice(wordIndex, wordIndex + sceneWordCount);

    if (sceneWords.length > 0) {
      scenes.push({
        sceneId: scene.id,
        audioStart: sceneWords[0].start,
        audioEnd: sceneWords[sceneWords.length - 1].end,
        words: sceneWords,
      });
    }

    wordIndex += sceneWordCount;
  }

  const totalDuration = currentTime;

  const timestamps: TimestampsOutput = {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    scenes,
    allWords: words,
    totalDuration,
    ttsEngine: 'mock',
    asrEngine: 'mock',
  };

  // Save mock timestamps
  await writeFile(options.timestampsPath, JSON.stringify(timestamps, null, 2), 'utf-8');

  // Create a small mock audio file (just a placeholder)
  const mockAudioBuffer = Buffer.alloc(1024);
  await writeFile(options.outputPath, mockAudioBuffer);

  const output: AudioOutput = {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    audioPath: options.outputPath,
    timestampsPath: options.timestampsPath,
    timestamps,
    duration: totalDuration,
    wordCount: words.length,
    voice: options.voice,
    sampleRate: 22050,
    ttsCost: 0,
  };

  log.info(
    {
      duration: output.duration,
      wordCount: output.wordCount,
    },
    'Mock audio generation complete'
  );

  return AudioOutputSchema.parse(output);
}

/**
 * Build full text from script for TTS
 */
function buildFullText(script: ScriptOutput): string {
  const parts: string[] = [];

  // Add hook if present
  if (script.hook) {
    parts.push(script.hook);
  }

  // Add each scene's text
  for (const scene of script.scenes) {
    parts.push(scene.text);
  }

  // Add CTA if present
  if (script.cta) {
    parts.push(script.cta);
  }

  return parts.join(' ');
}

/**
 * Build timestamps output from ASR result aligned to scenes
 */
function buildTimestamps(asr: ASRResult, script: ScriptOutput): TimestampsOutput {
  // Build scene-level timestamps
  const scenes: SceneTimestamp[] = [];
  let wordIndex = 0;

  for (const scene of script.scenes) {
    const sceneWords: WordTimestamp[] = [];
    const targetWordCount = scene.text.split(/\s+/).filter(Boolean).length;

    // Collect words for this scene (approximate by word count)
    while (wordIndex < asr.words.length && sceneWords.length < targetWordCount) {
      sceneWords.push(asr.words[wordIndex]);
      wordIndex++;
    }

    if (sceneWords.length > 0) {
      scenes.push({
        sceneId: scene.id,
        audioStart: sceneWords[0].start,
        audioEnd: sceneWords[sceneWords.length - 1].end,
        words: sceneWords,
      });
    }
  }

  return {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    scenes,
    allWords: asr.words,
    totalDuration: asr.duration,
    ttsEngine: 'kokoro',
    asrEngine: asr.engine,
  };
}
