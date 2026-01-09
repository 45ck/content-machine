/**
 * Audio Pipeline
 *
 * Coordinates TTS generation and ASR transcription for word-level timestamps.
 * Based on SYSTEM-DESIGN §7.2 cm audio command.
 */
import { writeFile } from 'fs/promises';
import type { ScriptOutput } from '../script/generator';
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
import { reconcileToScript as reconcileAsrToScript } from './asr/reconcile';
import { restorePunctuation } from './asr/post-processor';

export type { AudioOutput, TimestampsOutput, WordTimestamp } from './schema';

export interface SpokenSection {
  id: string;
  text: string;
}

function sanitizeForTts(text: string): string {
  return text.replace(/[`*_]/g, '');
}

function normalizeSpokenText(text: string): string {
  return sanitizeForTts(text).replace(/\s+/g, ' ').trim();
}

function resolveTotalDuration(totalDuration: number | undefined, words: WordTimestamp[]): number {
  if (typeof totalDuration === 'number' && Number.isFinite(totalDuration)) {
    return totalDuration;
  }
  if (words.length === 0) {
    return 0;
  }
  return words[words.length - 1].end;
}

export function buildAlignmentSections(script: ScriptOutput): SpokenSection[] {
  const sections: SpokenSection[] = [];
  const scenes = script.scenes;

  const firstSceneText = scenes.length > 0 ? normalizeSpokenText(scenes[0].text) : '';
  const lastSceneText =
    scenes.length > 0 ? normalizeSpokenText(scenes[scenes.length - 1].text) : '';

  // Check if hook is already included in first scene to prevent duplication
  // The LLM often returns a hook field AND includes the hook in scene 1
  const hookText = script.hook ? normalizeSpokenText(script.hook) : '';
  const hookAlreadyInScene1 =
    hookText &&
    (hookText === firstSceneText ||
      firstSceneText.startsWith(hookText) ||
      firstSceneText.includes(hookText));

  if (hookText && !hookAlreadyInScene1) {
    sections.push({ id: 'hook', text: script.hook! });
  }

  sections.push(...scenes.map((scene) => ({ id: scene.id, text: scene.text })));

  const ctaText = script.cta ? normalizeSpokenText(script.cta) : '';
  if (ctaText && ctaText !== lastSceneText) {
    sections.push({ id: 'cta', text: script.cta! });
  }

  return sections;
}

/**
 * Append remaining ASR words to the last scene or create a fallback scene.
 * Ensures we never drop trailing words (prevents audio continuing after visuals).
 * @internal
 */
function appendRemainingWords(
  result: SceneTimestamp[],
  sections: SpokenSection[],
  words: WordTimestamp[],
  wordIndex: number
): void {
  if (wordIndex >= words.length) return;

  const remaining = words.slice(wordIndex);

  if (result.length > 0) {
    const lastScene = result[result.length - 1];
    lastScene.words.push(...remaining);
    lastScene.audioEnd = remaining[remaining.length - 1].end;
    return;
  }

  // Defensive fallback: if no scene got words, attach everything to the first section
  if (sections.length > 0) {
    result.push({
      sceneId: sections[0].id,
      audioStart: words[0].start,
      audioEnd: words[words.length - 1].end,
      words: [...words],
    });
  }
}

/**
 * Build scene timestamps from words and scene text structure.
 * Assigns words to scenes proportionally based on word count.
 * Also restores punctuation from original script text.
 *
 * @internal Shared between mock and real audio generation
 */
export function buildSceneTimestamps(
  words: WordTimestamp[],
  sections: SpokenSection[],
  totalDuration?: number
): SceneTimestamp[] {
  const result: SceneTimestamp[] = [];
  let wordIndex = 0;
  const duration = resolveTotalDuration(totalDuration, words);

  // Combine all section texts for punctuation restoration
  const fullScriptText = sections.map((s) => s.text).join(' ');

  // Restore punctuation to all words before assigning to scenes
  const punctuatedWords = restorePunctuation(words, fullScriptText);

  for (const section of sections) {
    const targetWordCount = section.text.split(/\s+/).filter(Boolean).length;
    const sceneWords: WordTimestamp[] = [];

    while (wordIndex < punctuatedWords.length && sceneWords.length < targetWordCount) {
      sceneWords.push(punctuatedWords[wordIndex]);
      wordIndex++;
    }

    if (sceneWords.length > 0) {
      result.push({
        sceneId: section.id,
        audioStart: sceneWords[0].start,
        audioEnd: sceneWords[sceneWords.length - 1].end,
        words: sceneWords,
      });
    }
  }

  appendRemainingWords(result, sections, punctuatedWords, wordIndex);

  if (result.length > 0) {
    const lastScene = result[result.length - 1];
    lastScene.audioEnd = Math.max(lastScene.audioEnd, duration);
  }

  return result;
}

export interface GenerateAudioOptions {
  script: ScriptOutput;
  voice: string;
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

  // Create mock word timestamps from the same alignment sections as real TTS (hook/scenes/cta)
  const sections = buildAlignmentSections(options.script);
  const words: WordTimestamp[] = [];
  let currentTime = 0;
  const wordDuration = 0.3; // ~200 WPM

  for (const section of sections) {
    const sectionWords = section.text.split(/\s+/).filter(Boolean);
    for (const word of sectionWords) {
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
  const sceneTimestamps = buildSceneTimestamps(words, sections, totalDuration);

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
  return buildAlignmentSections(script)
    .map((section) => normalizeSpokenText(section.text))
    .join(' ');
}

/**
 * Build timestamps output from ASR result aligned to scenes
 */
function buildTimestamps(asr: ASRResult, script: ScriptOutput): TimestampsOutput {
  // Align scenes to the same sections used for TTS (hook/scenes/cta) to prevent drift.
  const sections = buildAlignmentSections(script);
  const scenes = buildSceneTimestamps(asr.words, sections, asr.duration);

  return {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    scenes,
    allWords: asr.words,
    totalDuration: asr.duration,
    ttsEngine: 'kokoro',
    asrEngine: asr.engine,
  };
}
