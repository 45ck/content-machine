/**
 * Fake ASR Provider for Testing
 */
import { ASRResult, ASROptions } from '../../audio/asr';
import { WordTimestamp } from '../../audio/schema';

export class FakeASRProvider {
  private responses: ASRResult[] = [];
  private calls: ASROptions[] = [];

  /**
   * Queue a response for the next call
   */
  queueResponse(response: ASRResult): void {
    this.responses.push(response);
  }

  /**
   * Queue a response from text (generates word timestamps)
   */
  queueFromText(text: string): void {
    const words = text.split(/\s+/).filter(Boolean);
    const wordTimestamps: WordTimestamp[] = [];

    let currentTime = 0;
    for (const word of words) {
      const duration = 0.3 + Math.random() * 0.2; // 0.3-0.5s per word
      wordTimestamps.push({
        word,
        start: currentTime,
        end: currentTime + duration,
        confidence: 0.95,
      });
      currentTime += duration + 0.05; // Small gap between words
    }

    this.responses.push({
      words: wordTimestamps,
      duration: currentTime,
      text,
      engine: 'estimated',
    });
  }

  /**
   * Transcribe audio (mock implementation)
   */
  async transcribe(options: ASROptions): Promise<ASRResult> {
    this.calls.push(options);

    if (this.responses.length === 0) {
      // Default response
      return {
        words: [
          { word: 'Test', start: 0, end: 0.3, confidence: 0.95 },
          { word: 'transcription.', start: 0.35, end: 0.8, confidence: 0.92 },
        ],
        duration: 1,
        text: 'Test transcription.',
        engine: 'estimated',
      };
    }

    return this.responses.shift()!;
  }

  /**
   * Get all recorded calls
   */
  getCalls(): ASROptions[] {
    return [...this.calls];
  }

  /**
   * Get the last call
   */
  getLastCall(): ASROptions | undefined {
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
