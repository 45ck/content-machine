/**
 * LLM Provider Factory
 */
import type { LLMProvider } from './provider.js';
import type { LLMProviderType } from '../config.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { ConfigError } from '../errors.js';

/**
 * Create an LLM provider based on configuration
 */
export function createLLMProvider(
  provider: LLMProviderType,
  model?: string,
  apiKey?: string
): LLMProvider {
  switch (provider) {
    case 'openai':
      return new OpenAIProvider(model ?? 'gpt-4o', apiKey);
    case 'anthropic':
      return new AnthropicProvider(model ?? 'claude-3-5-sonnet-20241022', apiKey);
    default:
      throw new ConfigError(`Unknown LLM provider: ${provider}`);
  }
}

// Re-export types and implementations
export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './provider.js';
