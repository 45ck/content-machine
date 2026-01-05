/**
 * Anthropic LLM Provider
 */
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './provider.js';
import { APIError, RateLimitError } from '../errors.js';
import { getApiKey } from '../config.js';
import { withRetry } from '../retry.js';

/** Build system content with optional JSON mode instruction */
function buildSystemContent(systemContent: string | undefined, jsonMode: boolean | undefined): string | undefined {
  if (jsonMode && systemContent) {
    return `${systemContent}\n\nYou MUST respond with valid JSON only. Do not include any other text.`;
  }
  return systemContent;
}

/** Transform messages for Anthropic API */
function transformMessages(
  messages: LLMMessage[]
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
}

/** Transform Anthropic response to LLMResponse */
function transformResponse(response: Anthropic.Message): LLMResponse {
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
    model: response.model,
  };
}

/** Handle Anthropic API errors */
function handleApiError(error: unknown): never {
  if (error instanceof Anthropic.RateLimitError) {
    throw new RateLimitError('anthropic', 60);
  }

  if (error instanceof Anthropic.APIError) {
    throw new APIError(error.message, { provider: 'anthropic', status: error.status }, error);
  }

  throw error;
}

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private client: Anthropic;
  private maxRetries: number;

  constructor(model: string = 'claude-3-5-sonnet-20241022', apiKey?: string, maxRetries: number = 2) {
    this.model = model;
    this.maxRetries = maxRetries;
    this.client = new Anthropic({
      apiKey: apiKey ?? getApiKey('ANTHROPIC_API_KEY'),
    });
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    return withRetry(
      async () => {
        try {
          const systemMessage = messages.find((m) => m.role === 'system');
          const systemContent = buildSystemContent(systemMessage?.content, options?.jsonMode);

          const response = await this.client.messages.create({
            model: this.model,
            max_tokens: options?.maxTokens ?? 4096,
            system: systemContent,
            messages: transformMessages(messages),
            temperature: options?.temperature