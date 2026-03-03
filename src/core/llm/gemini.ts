/**
 * Google Gemini LLM Provider
 *
 * Uses Google's Generative AI SDK for Gemini models.
 */
import { GoogleGenerativeAI, GenerateContentResult } from '@google/generative-ai';
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './provider.js';
import { APIError, RateLimitError, ConfigError } from '../errors.js';
import { getOptionalApiKey } from '../config.js';
import { withRetry } from '../retry.js';

/**
 * Convert our message format to Gemini's format
 */
function convertMessages(
  messages: LLMMessage[]
): { role: 'user' | 'model'; parts: { text: string }[] }[] {
  // Gemini uses 'model' instead of 'assistant' and doesn't support 'system' directly in chat
  // System messages should be prepended to the first user message
  const systemMessage = messages.find((m) => m.role === 'system');
  const nonSystemMessages = messages.filter((m) => m.role !== 'system');

  return nonSystemMessages.map((msg, index) => {
    let content = msg.content;

    // Prepend system message to first user message
    if (index === 0 && msg.role === 'user' && systemMessage) {
      content = `${systemMessage.content}\n\n${content}`;
    }

    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    };
  });
}

/**
 * Parse Gemini response to our format
 */
function parseResponse(result: GenerateContentResult, model: string): LLMResponse {
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    content: text,
    usage: {
      promptTokens: usage?.promptTokenCount ?? 0,
      completionTokens: usage?.candidatesTokenCount ?? 0,
      totalTokens: usage?.totalTokenCount ?? 0,
    },
    finishReason: response.candidates?.[0]?.finishReason ?? undefined,
    model,
  };
}

/**
 * Handle Gemini-specific errors
 */
function handleError(error: unknown): never {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('quota')) {
      throw new RateLimitError('gemini', 60);
    }

    if (message.includes('api key') || message.includes('invalid key')) {
      throw new ConfigError(
        'Invalid Google API key. Set GOOGLE_API_KEY (or GEMINI_API_KEY) in .env'
      );
    }

    throw new APIError(error.message, { provider: 'gemini' }, error);
  }

  throw error;
}

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  readonly model: string;
  private client: GoogleGenerativeAI;
  private maxRetries: number;

  constructor(model: string = 'gemini-2.0-flash', apiKey?: string, maxRetries: number = 2) {
    this.model = model;
    this.maxRetries = maxRetries;

    const key =
      apiKey ?? getOptionalApiKey('GOOGLE_API_KEY') ?? getOptionalApiKey('GEMINI_API_KEY');
    if (!key) {
      throw new ConfigError(
        'GOOGLE_API_KEY (or GEMINI_API_KEY) not set. Add it to your .env file.'
      );
    }

    this.client = new GoogleGenerativeAI(key);
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    return withRetry(
      async () => {
        try {
          const genModel = this.client.getGenerativeModel({
            model: this.model,
            generationConfig: {
              temperature: options?.temperature ?? 0.7,
              maxOutputTokens: options?.maxTokens,
              stopSequences: options?.stopSequences,
              // Gemini uses responseMimeType for JSON mode
              responseMimeType: options?.jsonMode ? 'application/json' : undefined,
            },
          });

          const geminiMessages = convertMessages(messages);

          // Use startChat for multi-turn conversations
          const chat = genModel.startChat({
            history: geminiMessages.slice(0, -1),
          });

          const lastMessage = geminiMessages[geminiMessages.length - 1];
          const result = await chat.sendMessage(lastMessage.parts[0].text);

          return parseResponse(result, this.model);
        } catch (error: unknown) {
          handleError(error);
        }
      },
      {
        maxRetries: this.maxRetries,
        context: { provider: 'gemini', model: this.model },
      }
    );
  }
}
