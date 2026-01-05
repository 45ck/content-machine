/**
 * Audio Pipeline
 * 
 * Coordinates TTS generation and ASR transcription for word-level timestamps.
 */
import { writeFile } from 'fs/promises';
import { ScriptOutput } from '../script/generator';
import { createLogger } from '../core/logger';
import { APIError } from '../core/errors';
import { 
  AudioOutput, 
  AudioOutputSchema,
  TimestampsOutput,
  WordTimestamp,
  TranscriptSegment 
} from './schema';
import { synthesizeSpeech, TTSResult } from './tts';
import { transcribeAudio, ASRResult } from './asr';

export type { AudioOutput, TimestampsOutput, WordTimestamp } from './schema';

export interface GenerateAudioOptions {
  script: ScriptOutput;
  voice: string;
  outputPath: string;
  timestampsPath: string;
}

/**
 * Generate audio from script with word-level timestamps
 */
export async function generateAudio(options: GenerateAudioOptions): Promise<AudioOutput> {
  const log = createLogger({ module: 'audio', voice: options.voice });
  
  log.info({ sectionCount: options.script.sections.length }, 'Starting audio generation');
  
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
  });
  
  log.info({ wordCount: asrResult.words.length }, 'Transcription complete');
  
  // Step 3: Build timestamps output
  const timestamps = buildTimestamps(asrResult, options.script);
  
  // Save timestamps
  await writeFile(
    options.timestampsPath,
    JSON.stringify(timestamps, null, 2),
    'utf-8'
  );
  
  const output: AudioOutput = {
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
  
  log.info({ 
    duration: validated.duration, 
    wordCount: validated.wordCount 
  }, 'Audio generation complete');
  
  return validated;
}

/**
 * Build full text from script for TTS
 */
function buildFullText(script: ScriptOutput): string {
  const parts: string[] = [];
  
  // Add hook
  parts.push(script.hook);
  
  // Add each section
  for (const section of script.sections) {
    // Skip hook section if already added
    if (section.type === 'hook') continue;
    parts.push(section.text);
  }
  
  // Add CTA
  if (script.cta) {
    parts.push(script.cta);
  }
  
  return parts.join(' ');
}

/**
 * Build timestamps output from ASR result
 */
function buildTimestamps(asr: ASRResult, script: ScriptOutput): TimestampsOutput {
  // Build segments by grouping words
  const segments: TranscriptSegment[] = [];
  let currentSegment: WordTimestamp[] = [];
  let segmentStart = 0;
  let segmentId = 0;
  
  for (const word of asr.words) {
    if (currentSegment.length === 0) {
      segmentStart = word.start;
    }
    
    currentSegment.push(word);
    
    // End segment on sentence-ending punctuation
    if (word.word.match(/[.!?]$/)) {
      segments.push({
        id: `segment-${segmentId++}`,
        text: currentSegment.map(w => w.word).join(' '),
        start: segmentStart,
        end: word.end,
        words: currentSegment,
      });
      currentSegment = [];
    }
  }
  
  // Add remaining words as final segment
  if (currentSegment.length > 0) {
    segments.push({
      id: `segment-${segmentId}`,
      text: currentSegment.map(w => w.word).join(' '),
      start: segmentStart,
      end: currentSegment[currentSegment.length - 1].end,
      words: currentSegment,
    });
  }
  
  return {
    segments,
    words: asr.words,
    duration: asr.duration,
    wordCount: asr.words.length,
  };
}
