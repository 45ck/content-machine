/**
 * Type declarations for kokoro-js
 */
declare module 'kokoro-js' {
  export interface KokoroTTSOptions {
    dtype?: 'q8' | 'fp16' | 'fp32';
  }

  export interface GenerateOptions {
    voice?: string;
    speed?: number;
  }

  export interface AudioOutput {
    audio: Float32Array;
    sampling_rate: number;
    save(path: string): Promise<void>;
  }

  export class KokoroTTS {
    static from_pretrained(
      model: string,
      options?: KokoroTTSOptions
    ): Promise<KokoroTTS>;

    generate(text: string, options?: GenerateOptions): Promise<AudioOutput>;
  }
}
