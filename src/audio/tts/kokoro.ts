/**
 * TTS (Kokoro) - Text-to-Speech using kokoro-js
 *
 * Generates high-quality speech audio locally.
 */

import { RawAudio } from '@huggingface/transformers';
import { createLogger } from '../../core/logger';
import { APIError } from '../../core/errors';
import { createRequire } from 'node:module';
import type { TTSOptions, TTSResult } from './types';
import { chunkTextForTts } from './text-chunking';

interface KokoroTTSLike {
  generate: (text: string, options: { voice?: string; speed?: number }) => Promise<RawAudio>;
  // Note: kokoro-js also provides `stream(...)`, but we've observed runtime failures in that
  // code path in Node. We chunk manually and call `generate(...)` per chunk instead.
}

type KokoroModule = {
  KokoroTTS: {
    from_pretrained: (...args: unknown[]) => Promise<KokoroTTSLike>;
  };
};

// Dynamically import kokoro to handle ESM/CJS differences
let kokoroModule: KokoroModule | null = null;

async function getKokoro(): Promise<KokoroModule> {
  if (!kokoroModule) {
    const require = createRequire(typeof __filename === 'string' ? __filename : import.meta.url);
    const isTestEnv = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

    // Prefer the Node `require` export in real CLI runs.
    // Reason: kokoro-js's Node "import" build uses `import.meta.dirname`, which is not a Node standard,
    // and can cause it to resolve the packaged `voices/*.bin` directory incorrectly at runtime.
    if (!isTestEnv) {
      try {
        kokoroModule = require('kokoro-js') as unknown as KokoroModule;
      } catch {
        // Fall back to dynamic import.
      }
    }

    if (!kokoroModule) {
      // Prefer dynamic import in test runners so `vi.mock('kokoro-js')` is reliable.
      kokoroModule = (await import('kokoro-js')) as unknown as KokoroModule;
    }
  }
  return kokoroModule;
}

// Cache the TTS model
let cachedTTS: KokoroTTSLike | null = null;

// In practice, kokoro-js can truncate or degrade on longer single-pass inputs.
// Keep this aligned with our chunker default so anything that would be split can be split.
const LONG_TEXT_CHAR_THRESHOLD = 360;
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
  if (!cachedTTS) {
    params.log.debug('Loading TTS model');
    const kokoro = await getKokoro();
    cachedTTS = await kokoro.KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
      dtype: 'q8',
    });
    params.log.debug('TTS model loaded');
  }

  const chunks: Float32Array[] = [];
  let sampleRate: number | undefined;

  const textChunks = chunkTextForTts(params.text, { maxChars: 360 });
  params.log.info({ chunkCount: textChunks.length }, 'Generating chunked TTS audio');

  for (const chunkText of textChunks) {
    const audio = await cachedTTS.generate(chunkText, {
      voice: params.voice,
      speed: params.speed,
    });
    if (sampleRate === undefined) sampleRate = audio.sampling_rate;
    if (audio.sampling_rate !== sampleRate) {
      throw new Error(
        `Kokoro returned varying sample rates across chunks: expected=${sampleRate} got=${audio.sampling_rate}`
      );
    }
    chunks.push(audio.audio);
  }

  params.log.info({ chunkCount: chunks.length }, 'Chunked TTS audio generated');
  return mergeAudioChunks({ chunks, sampleRate: sampleRate ?? 24000 });
}

/**
 * Synthesize speech using the local Kokoro model.
 */
export async function synthesizeSpeechKokoro(options: TTSOptions): Promise<TTSResult> {
  const log = createLogger({ module: 'tts', engine: 'kokoro', voice: options.voice });

  log.info(
    {
      textLength: options.text.length,
      outputPathType: typeof (options as unknown as { outputPath?: unknown }).outputPath,
      hasOutputPath: Object.prototype.hasOwnProperty.call(options, 'outputPath'),
    },
    'Starting TTS synthesis'
  );

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

    if (typeof options.outputPath !== 'string' || options.outputPath.trim().length === 0) {
      const keys = Object.keys(options as unknown as Record<string, unknown>);
      // Include a hint if a common snake_case variant is present.
      const maybeSnakeCase = (options as unknown as Record<string, unknown>)['output_path'];
      throw new Error(
        `Invalid TTS outputPath (expected non-empty string). keys=${JSON.stringify(keys)} output_path=${maybeSnakeCase ? 'present' : 'absent'}`
      );
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
      { voice: options.voice, engine: 'kokoro' }
    );
  }
}

/**
 * List Kokoro voice ids supported by `kokoro-js`.
 */
export async function getAvailableVoicesKokoro(): Promise<string[]> {
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
