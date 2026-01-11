/**
 * TTS - Text-to-Speech using kokoro-js
 *
 * Generates high-quality speech audio locally.
 */

import { RawAudio } from '@huggingface/transformers';
import { createLogger } from '../../core/logger';
import { APIError } from '../../core/errors';

interface TextSplitterLike {
  push: (text: string) => void;
  close: () => void;
}

interface KokoroTTSLike {
  generate: (
    text: string,
    options: { voice?: string; speed?: number }
  ) => Promise<RawAudio>;
  stream: (
    text: string | TextSplitterLike,
    options: { voice?: string; speed?: number }
  ) => AsyncGenerator<{ audio: RawAudio }>;
}

type KokoroModule = {
  KokoroTTS: {
    from_pretrained: (...args: unknown[]) => Promise<KokoroTTSLike>;
  };
  TextSplitterStream: new () => TextSplitterLike;
};

// Dynamically import kokoro to handle ESM/CJS differences
let kokoroModule: KokoroModule | null = null;

async function getKokoro(): Promise<KokoroModule> {
  if (!kokoroModule) {
    kokoroModule = (await import('kokoro-js')) as unknown as KokoroModule;
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
let cachedTTS: KokoroTTSLike | null = null;

const LONG_TEXT_CHAR_THRESHOLD = 500;
const DEFAULT_PAUSE_SECONDS = 0.08;

function shouldChunkText(text: string): boolean {
  return text.length >= LONG_TEXT_CHAR_THRESHOLD;
}

function mergeAudioChunks(params: {
  chunks: Float32Array[];
  sampleRate: number;
  pauseSeconds?: number;
}): RawAudio {
  const pauseSeconds = params.pauseSeconds ?? DEFAULT_PAUSE_SECONDS;
  const pauseSamples =
    pauseSeconds > 0 ? Math.max(0, Math.round(params.sampleRate * pauseSeconds)) : 0;
  const totalLength =
    params.chunks.reduce((sum, chunk) => sum + chunk.length, 0) +
    pauseSamples * Math.max(0, params.chunks.length - 1);

  const combined = new Float32Array(totalLength);
  let offset = 0;

  params.chunks.forEach((chunk, index) => {
    combined.set(chunk, offset);
    offset += chunk.length;
    if (pauseSamples > 0 && index < params.chunks.length - 1) {
      offset += pauseSamples;
    }
  });

  return new RawAudio(combined, params.sampleRate);
}

async function generateChunkedAudio(params: {
  text: string;
  voice: string;
  speed: number;
  log: ReturnType<typeof createLogger>;
}): Promise<RawAudio> {
  const kokoro = await getKokoro();

  if (!cachedTTS) {
    params.log.debug('Loading TTS model');
    cachedTTS = await kokoro.KokoroTTS.from_pretrained(
      'onnx-community/Kokoro-82M-v1.0-ONNX',
      { dtype: 'q8' }
    );
    params.log.debug('TTS model loaded');
  }

  const splitter = new kokoro.TextSplitterStream();
  splitter.push(params.text);
  splitter.close();

  const chunks: Float32Array[] = [];
  let sampleRate = 24000;
  let chunkCount = 0;

  params.log.info('Generating chunked TTS audio');

  for await (const { audio } of cachedTTS.stream(splitter, {
    voice: params.voice,
    speed: params.speed,
  })) {
    chunkCount += 1;
    sampleRate = audio.sampling_rate;
    chunks.push(audio.audio);
  }

  params.log.info({ chunkCount }, 'Chunked TTS audio generated');
  return mergeAudioChunks({ chunks, sampleRate });
}

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

    const speed = options.speed ?? 1.0;
    let audio: RawAudio;

    if (shouldChunkText(options.text)) {
      audio = await generateChunkedAudio({
        text: options.text,
        voice: options.voice,
        speed,
        log,
      });
    } else {
      // Generate audio
      log.debug('Generating audio');
      audio = await cachedTTS.generate(options.text, {
        voice: options.voice,
        speed,
      });
    }

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
    'af_heart', // American Female (warm)
    'af_bella', // American Female (professional)
    'af_nicole', // American Female (young)
    'af_sarah', // American Female (mature)
    'af_sky', // American Female (energetic)
    'am_adam', // American Male (warm)
    'am_michael', // American Male (professional)
    'bf_emma', // British Female
    'bf_isabella', // British Female (refined)
    'bm_george', // British Male
    'bm_lewis', // British Male (young)
  ];
}
