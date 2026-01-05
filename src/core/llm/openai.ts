/**
 * OpenAI LLM Provider
 */
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './provider.js';
import { APIError, RateLimitError } from '../errors.js';
import { getApiKey } from '../config.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private client: OpenAI;

  constructor(model: string = 'gpt-4o', apiKey?: string) {
    this.model = model;
    this.client = new OpenAI({
      apiKey: apiKey ?? getApiKey('OPENAI_API_KEY'),
    });
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
        stop: options?.stopSequences,
      });

      const choice = response.choices[0];
      const content = choice?.message?.content ?? '';
      const usage = response.usage;

      return {
        content,
        usage: {
          promptTokens: usage?.prompt_tokens ?? 0,
          completionTokens: usage?.completion_tokens ?? 0,
          totalTokens: usage?.total_tokens ?? 0,
        },
        finishReason: choice?.finish_reason ?? undefined,
      };
    } catch (error: unknown) {
      if (error instanceof OpenAI.RateLimitError) {
        // Extract retry-after from headers if available
        const retryAfter = 60; // Default to 60 seconds
        throw new RateLimitError('openai', retryAfter);
      }

      if (error instanceof OpenAI.APIError) {
        throw new APIError(
          error.message,
          { provider: 'openai', status: error.status },
          error
        );
      }

      throw error;
    }
  }
}
