export type TTSEngineId = 'kokoro' | 'elevenlabs' | 'edge';

export interface ElevenLabsVoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  speed?: number;
  use_speaker_boost?: boolean;
}

export interface TTSOptions {
  engine?: TTSEngineId;
  text: string;
  voice: string;
  outputPath: string;
  speed?: number;
  /**
   * When provided, synthesizes each unit separately so exact per-unit
   * audio durations can be returned in TTSResult.unitTimings.
   * Kokoro only — ignored by other engines.
   */
  units?: Array<{ id: string; text: string }>;
  elevenlabs?: {
    /**
     * ElevenLabs model id (e.g. "eleven_multilingual_v2").
     * Default is handled by the provider implementation.
     */
    modelId?: string;
    /**
     * ElevenLabs output format (e.g. "mp3_44100_128").
     * Default is handled by the provider implementation.
     */
    outputFormat?: string;
    voiceSettings?: ElevenLabsVoiceSettings;
    /** Override API base URL for testing/self-hosting proxies. */
    apiBaseUrl?: string;
  };
}

export interface TTSResult {
  audioPath: string;
  duration: number;
  sampleRate: number;
  cost: number;
  /**
   * Exact start/end times (seconds) for each unit in the concatenated audio.
   * Present only when TTSOptions.units was provided and the engine supports it.
   * Use this instead of ASR for perfectly-synced scene timestamps.
   */
  unitTimings?: Array<{ id: string; start: number; end: number }>;
}
