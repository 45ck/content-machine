/**
 * OpenAI LLM Provider
 */
import OpenAI from 'openai';
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './provider.js';
import { APIError, RateLimitError } from '../errors.js';
import { getApiKey } from '../config.js';
import { withRetry } from '../retry.js';

/**
 * Build OpenAI request parameters from messages and options
 */
function buildRequestParams(
  model: string,
  messages: LLMMessage[],
  options?: LLMOptions
): OpenAI.ChatCompletionCreateParamsNonStreaming {
  return {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens,
    response_format: options?.jsonMode ? { type: 'json_object' } : undefined,
    stop: options?.stopSequences,
  };
}

/**
 * Convert OpenAI response to LLMResponse format
 */
function parseResponse(response: OpenAI.ChatCompletion): LLMResponse {
  const choice = response.choices[0];
  const usage = response.usage;

  return {
    content: choice?.message?.content ?? '',
    usage: {
      promptTokens: usage?.prompt_tokens ?? 0,
      completionTokens: usage?.completion_tokens ?? 0,
      totalTokens: usage?.total_tokens ?? 0,
    },
    finishReason: choice?.finish_reason ?? undefined,
    model: response.model,
  };
}

/**
 * Handle OpenAI-specific errors and convert to our error types
 */
function handleError(error: unknown): never {
  if (error instanceof OpenAI.RateLimitError) {
    throw new RateLimitError('openai', 60);
  }

  if (error instanceof OpenAI.APIError) {
    throw new APIError(error.message, { provider: 'openai', status: error.status }, error);
  }

  throw error;
}

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;
  private client: OpenAI;
  private maxRetries: number;

  constructor(model: string = 'gpt-4o', apiKey?: string, maxRetries: number = 2) {
    this.model = model;
    this.maxRetries = maxRetries;
    this.client = new OpenAI({
      apiKey: apiKey ?? getApiKey('OPENAI_API_KEY'),
    });
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    return withRetry(
      async () => {
        try {
          const params = buildRequestParams(this.model, messages, options);
          const response = await this.client.chat.completions.create(params);
          return parseResponse(response);
        } catch (error: unknown) {
          handleError(error);
        }
      },
      {
        maxRetries: this.maxRetries,
        context: { provider: 'openai', model: this.model },
      }
    );
  }
}
