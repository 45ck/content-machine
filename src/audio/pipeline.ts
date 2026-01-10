/**
 * Audio Pipeline
 *
 * Coordinates TTS generation and ASR transcription for word-level timestamps.
 * Based on SYSTEM-DESIGN §7.2 cm audio command.
 */
import { writeFile } from 'fs/promises';
import type { ScriptOutput } from '../script/schema';
import { createLogger } from '../core/logger';
import {
  AudioOutput,
  AudioOutputSchema,
  TimestampsOutput,
  WordTimestamp,
  AUDIO_SCHEMA_VERSION,
} from './schema';
import { synthesizeSpeech } from './tts';
import { transcribeAudio, ASRResult } from './asr';
import { reconcileToScript as reconcileAsrToScript } from './asr/reconcile';
import {
  buildAlignmentUnits,
  buildSceneTimestamps,
  normalizeSpokenText,
} from './alignment';
import { buildAudioMixPlan, hasAudioMixSources, type AudioMixPlanOptions } from './mix/planner';
import type { AudioMixOutput } from './mix/schema';

export { buildAlignmentUnits, buildSceneTimestamps } from './alignment';

export type { AudioOutput, TimestampsOutput, WordTimestamp } from './schema';

export interface GenerateAudioOptions {
  script: ScriptOutput;
  voice: string;
  speed?: number;
  outputPath: string;
  timestampsPath: string;
  /** Use mock audio generation for testing */
  mock?: boolean;
  /**
   * Require Whisper ASR for timestamps (no fallback to estimation).
   * Used in "audio-first" pipeline mode for guaranteed sync accuracy.
   */
  requireWhisper?: boolean;
  /**
   * Whisper model size for ASR transcription.
   * Larger models are more accurate but slower.
   * Default: 'base'
   */
  whisperModel?: 'tiny' | 'base' | 'small' | 'medium';
  /**
   * Reconcile ASR output to match original script text.
   * Improves caption readability by using original punctuation/casing.
   */
  reconcile?: boolean;
  /**
   * Optional audio mix plan generation.
   * When provided, writes audio.mix.json alongside the voice track.
   */
  audioMix?: {
    outputPath: string;
    options: AudioMixPlanOptions;
    emitEmpty?: boolean;
  };
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
    speed: options.speed,
    outputPath: options.outputPath,
  });

  log.info({ duration: ttsResult.duration }, 'TTS audio generated');

  // Step 2: Transcribe for word-level timestamps
  log.info(
    { requireWhisper: options.requireWhisper, whisperModel: options.whisperModel },
    'Transcribing audio for timestamps'
  );
  const asrResult = await transcribeAudio({
    audioPath: options.outputPath,
    model: options.whisperModel,
    originalText: fullText,
    audioDuration: ttsResult.duration,
    requireWhisper: options.requireWhisper,
  });

  log.info(
    { wordCount: asrResult.words.length, engine: asrResult.engine },
    'Transcription complete'
  );

  // Step 2b: Reconcile ASR to script text if enabled
  let finalWords = asrResult.words;
  if (options.reconcile && asrResult.engine !== 'estimated') {
    log.info('Reconciling ASR output to script text');
    finalWords = reconcileAsrToScript(asrResult.words, fullText);
    log.info({ reconciledWords: finalWords.length }, 'Reconciliation complete');
  }

  // Step 3: Build timestamps output
  const timestamps = buildTimestamps({ ...asrResult, words: finalWords }, options.script);

  // Save timestamps
  await writeFile(options.timestampsPath, JSON.stringify(timestamps, null, 2), 'utf-8');

  const mixResult = await maybeWriteAudioMix({
    script: options.script,
    timestamps,
    voicePath: options.outputPath,
    request: options.audioMix,
  });

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
    audioMixPath: mixResult.audioMixPath,
    audioMix: mixResult.audioMix,
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

  // Create mock word timestamps from the same alignment units as real TTS (hook/scenes/cta)
  const units = buildAlignmentUnits(options.script);
  const words: WordTimestamp[] = [];
  let currentTime = 0;
  const wordDuration = 0.3; // ~200 WPM

  for (const unit of units) {
    const unitWords = unit.text.split(/\s+/).filter(Boolean);
    for (const word of unitWords) {
      words.push({
        word,
        start: currentTime,
        end: currentTime + wordDuration,
        confidence: 0.95,
      });
      currentTime += wordDuration;
    }
  }

  const totalDuration = currentTime;
  const sceneTimestamps = buildSceneTimestamps(words, units, totalDuration);

  const timestamps: TimestampsOutput = {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    scenes: sceneTimestamps,
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

  const mixResult = await maybeWriteAudioMix({
    script: options.script,
    timestamps,
    voicePath: options.outputPath,
    request: options.audioMix,
  });

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
    audioMixPath: mixResult.audioMixPath,
    audioMix: mixResult.audioMix,
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
  return buildAlignmentUnits(script)
    .map((unit) => normalizeSpokenText(unit.text))
    .join(' ');
}

async function maybeWriteAudioMix(params: {
  script: ScriptOutput;
  timestamps: TimestampsOutput;
  voicePath: string;
  request?: {
    outputPath: string;
    options: AudioMixPlanOptions;
    emitEmpty?: boolean;
  };
}): Promise<{ audioMix?: AudioMixOutput; audioMixPath?: string }> {
  if (!params.request) return {};

  const hasSources = hasAudioMixSources(params.request.options);
  if (!hasSources && !params.request.emitEmpty) {
    return {};
  }

  const mixPlan = buildAudioMixPlan({
    script: params.script,
    timestamps: params.timestamps,
    voicePath: params.voicePath,
    options: params.request.options,
  });

  await writeFile(params.request.outputPath, JSON.stringify(mixPlan, null, 2), 'utf-8');

  return {
    audioMix: mixPlan,
    audioMixPath: params.request.outputPath,
  };
}

/**
 * Build timestamps output from ASR result aligned to scenes
 */
function buildTimestamps(asr: ASRResult, script: ScriptOutput): TimestampsOutput {
  // Align scenes to the same units used for TTS (hook/scenes/cta) to prevent drift.
  const units = buildAlignmentUnits(script);
  const scenes = buildSceneTimestamps(asr.words, units, asr.duration);

  return {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    scenes,
    allWords: asr.words,
    totalDuration: asr.duration,
    ttsEngine: 'kokoro',
    asrEngine: asr.engine,
  };
}
