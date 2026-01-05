/**
 * Type declarations for @remotion/install-whisper-cpp
 */
declare module '@remotion/install-whisper-cpp' {
  export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

  export interface DownloadOptions {
    model: WhisperModel;
    folder?: string;
  }

  export interface TranscribeOptions {
    inputPath: string;
    model: WhisperModel;
    modelFolder?: string;
    tokenLevelTimestamps?: boolean;
    language?: string;
  }

  export interface TokenOffsets {
    from: number;
    to: number;
  }

  export interface Token {
    text: string;
    offsets: TokenOffsets;
    p?: number;
  }

  export interface TranscriptionSegment {
    text: string;
    tokens?: Token[];
  }

  export interface TranscribeResult {
    transcription: TranscriptionSegment[];
  }

  export function downloadWhisperModel(options: DownloadOptions): Promise<string>;
  export function transcribe(options: TranscribeOptions): Promise<TranscribeResult>;
}
