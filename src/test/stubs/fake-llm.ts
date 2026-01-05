/**
 * Fake LLM Provider for Testing
 *
 * Allows queueing responses and tracking calls.
 */
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from '../../core/llm/provider.js';

export class FakeLLMProvider implements LLMProvider {
  readonly name = 'fake';
  readonly model = 'fake-model';

  private responseQueue: Array<LLMResponse | Error> = [];
  private callHistory: LLMMessage[][] = [];
  private totalTokensUsed = 0;

  /**
   * Queue a response to return on next chat() call
   */
  queueResponse(response: LLMResponse): void {
    this.responseQueue.push(response);
  }

  /**
   * Queue a JSON object to return (will be stringified)
   */
  queueJsonResponse<T>(data: T): void {
    this.responseQueue.push({
      content: JSON.stringify(data),
      usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
    });
  }

  /**
   * Queue an error to throw on next chat() call
   */
  queueError(error: Error): void {
    this.responseQueue.push(error);
  }

  /**
   * Get all calls made to chat()
   */
  getCalls(): LLMMessage[][] {
    return [...this.callHistory];
  }

  /**
   * Get the last call made to chat()
   */
  getLastCall(): LLMMessage[] | undefined {
    return this.callHistory[this.callHistory.length - 1];
  }

  /**
   * Get total tokens used across all calls
   */
  getTotalTokens(): number {
    return this.totalTokensUsed;
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.responseQueue = [];
    this.callHistory = [];
    this.totalTokensUsed = 0;
  }

  /**
   * Implement LLMProvider.chat()
   */
  async chat(messages: LLMMessage[], _options?: LLMOptions): Promise<LLMResponse> {
    this.callHistory.push([...messages]);

    const response = this.responseQueue.shift();

    if (!response) {
      throw new Error('FakeLLMProvider: No response queued. Call queueResponse() first.');
    }

    if (response instanceof Error) {
      throw response;
    }

    this.totalTokensUsed += response.usage.totalTokens;
    return response;
  }
}
