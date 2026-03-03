/**
 * TTS router
 *
 * Provides a stable import path (`src/audio/tts`) while allowing multiple engines.
 */

import type { TTSOptions, TTSResult, TTSEngineId } from './types';
import { synthesizeSpeechKokoro, getAvailableVoicesKokoro } from './kokoro';
import { synthesizeSpeechElevenLabs } from './elevenlabs';

export type { TTSOptions, TTSResult, TTSEngineId, ElevenLabsVoiceSettings } from './types';

/**
 * Synthesize narration audio for a script.
 *
 * Defaults to the local Kokoro engine unless `options.engine` is provided.
 */
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> {
  const engine: TTSEngineId = options.engine ?? 'kokoro';

  if (engine === 'kokoro') {
    return synthesizeSpeechKokoro(options);
  }
  if (engine === 'elevenlabs') {
    return synthesizeSpeechElevenLabs(options);
  }
  if (engine === 'edge') {
    throw new Error(
      `TTS engine "edge" is configured but not implemented. Use audio.ttsEngine="kokoro" or "elevenlabs".`
    );
  }

  // Exhaustive check (future engines)

  throw new Error(`Unsupported TTS engine: ${engine}`);
}

/**
 * Return the list of known voices for the given engine.
 *
 * Note: Some engines (e.g. ElevenLabs) require an API call to enumerate voices; for those,
 * this may return an empty list.
 */
export async function getAvailableVoices(engine: TTSEngineId = 'kokoro'): Promise<string[]> {
  if (engine === 'kokoro') return getAvailableVoicesKokoro();
  if (engine === 'elevenlabs') return [];
  if (engine === 'edge') return [];
  return [];
}
