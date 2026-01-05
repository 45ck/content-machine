/**
 * TTS - Text-to-Speech using kokoro-js
 * 
 * Generates high-quality speech audio locally.
 */

import { createLogger } from '../../core/logger';
import { APIError } from '../../core/errors';

// Dynamically import kokoro to handle ESM/CJS differences
let kokoroModule: typeof import('kokoro-js') | null = null;

async function getKokoro() {
  if (!kokoroModule) {
    kokoroModule = await import('kokoro-js');
  }
  return kokoroModule;
}

export interface TTSOptions {
  text: string;
  voice: string;
  outputPath: string;
  speed?: number;
}

export interface TTSResult {
  audioPath: string;
  duration: number;
  sampleRate: number;
  cost: number; // Always 0 for local TTS
}

// Cache the TTS model
let cachedTTS: any = null;

/**
 * Synthesize speech from text using kokoro-js
 */
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> {
  const log = createLogger({ module: 'tts', voice: options.voice });
  
  log.info({ textLength: options.text.length }, 'Starting TTS synthesis');
  
  try {
    const kokoro = await getKokoro();
    
    // Initialize TTS model if not cached
    if (!cachedTTS) {
      log.debug('Loading TTS model');
      cachedTTS = await kokoro.KokoroTTS.from_pretrained(
        'onnx-community/Kokoro-82M-v1.0-ONNX',
        { dtype: 'q8' } // Use quantized model for faster inference
      );
      log.debug('TTS model loaded');
    }
    
    // Generate audio
    log.debug('Generating audio');
    const audio = await cachedTTS.generate(options.text, {
      voice: options.voice,
      speed: options.speed ?? 1.0,
    });
    
    // Save to file
    await audio.save(options.outputPath);
    
    // Calculate duration from audio data
    const duration = audio.audio.length / audio.sampling_rate;
    
    log.info({ duration, outputPath: options.outputPath }, 'TTS synthesis complete');
    
    return {
      audioPath: options.outputPath,
      duration,
      sampleRate: audio.sampling_rate,
      cost: 0, // Local TTS is free
    };
    
  } catch (error) {
    log.error({ error }, 'TTS synthesis failed');
    throw new APIError(
      `TTS synthesis failed: ${error instanceof Error ? error.message : String(error)}`,
      { voice: options.voice }
    );
  }
}

/**
 * Get available voices
 */
export async function getAvailableVoices(): Promise<string[]> {
  // kokoro-js voices
  return [
    'af_heart',    // American Female (warm)
    'af_bella',    // American Female (professional)
    'af_nicole',   // American Female (young)
    'af_sarah',    // American Female (mature)
    'af_sky',      // American Female (energetic)
    'am_adam',     // American Male (warm)
    'am_michael',  // American Male (professional)
    'bf_emma',     // British Female
    'bf_isabella', // British Female (refined)
    'bm_george',   // British Male
    'bm_lewis',    // British Male (young)
  ];
}
