/**
 * Anthropic LLM Provider
 */
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './provider.js';
import { APIError, RateLimitError } from '../errors.js';
import { getApiKey } from '../config.js';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private client: Anthropic;

  constructor(model: string = 'claude-3-5-sonnet-20241022', apiKey?: string) {
    this.model = model;
    this.client = new Anthropic({
      apiKey: apiKey ?? getApiKey('ANTHROPIC_API_KEY'),
    });
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    try {
      // Extract system message if present
      const systemMessage = messages.find((m) => m.role === 'system');
      const chatMessages = messages.filter((m) => m.role !== 'system');

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens ?? 4096,
        system: systemMessage?.content,
        messages: chatMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        stop_sequences: options?.stopSequences,
      });

      // Extract text content
      const textBlock = response.content.find((block) => block.type === 'text');
      const content = textBlock?.type === 'text' ? textBlock.text : '';

      return {
        content,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        finishReason: response.stop_reason ?? undefined,
      };
    } catch (error: unknown) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new RateLimitError('anthropic', 60);
      }

      if (error instanceof Anthropic.APIError) {
        throw new APIError(error.message, { provider: 'anthropic', status: error.status }, error);
      }

      throw error;
    }
  }
}
