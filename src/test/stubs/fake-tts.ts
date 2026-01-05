/**
 * Fake TTS Provider for Testing
 */
import { TTSResult, TTSOptions } from '../../audio/tts';

export class FakeTTSProvider {
  private responses: TTSResult[] = [];
  private calls: TTSOptions[] = [];

  /**
   * Queue a response for the next call
   */
  queueResponse(response: TTSResult): void {
    this.responses.push(response);
  }

  /**
   * Queue a default successful response
   */
  queueDefaultResponse(duration: number = 30): void {
    this.responses.push({
      audioPath: 'test-audio.wav',
      duration,
      sampleRate: 24000,
      cost: 0,
    });
  }

  /**
   * Synthesize speech (mock implementation)
   */
  async synthesize(options: TTSOptions): Promise<TTSResult> {
    this.calls.push(options);

    if (this.responses.length === 0) {
      // Default response
      return {
        audioPath: options.outputPath,
        duration: options.text.split(' ').length / 2.5, // ~150 WPM
        sampleRate: 24000,
        cost: 0,
      };
    }

    return this.responses.shift()!;
  }

  /**
   * Get all recorded calls
   */
  getCalls(): TTSOptions[] {
    return [...this.calls];
  }

  /**
   * Get the last call
   */
  getLastCall(): TTSOptions | undefined {
    return this.calls[this.calls.length - 1];
  }

  /**
   * Reset the provider
   */
  reset(): void {
    this.responses = [];
    this.calls = [];
  }
}
