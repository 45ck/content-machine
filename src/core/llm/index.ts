/**
 * LLM Provider Factory
 */
import type { LLMProvider } from './provider.js';
import type { LLMProviderType } from '../config.js';
import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { ConfigError } from '../errors.js';
import { LLM_PROVIDERS, REPO_FACTS } from '../../domain/repo-facts.generated.js';

function resolveProviderDefaultModel(provider: LLMProviderType): string {
  const facts = LLM_PROVIDERS.find((x) => x.id === provider);
  return facts?.defaultModel ?? REPO_FACTS.llm.default.model;
}

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
      return new OpenAIProvider(model ?? resolveProviderDefaultModel(provider), apiKey);
    case 'anthropic':
      return new AnthropicProvider(model ?? resolveProviderDefaultModel(provider), apiKey);
    case 'gemini':
      return new GeminiProvider(model ?? resolveProviderDefaultModel(provider), apiKey);
    default:
      throw new ConfigError(`Unknown LLM provider: ${provider}`);
  }
}

// Re-export types and implementations
export { OpenAIProvider } from './openai.js';
export { AnthropicProvider } from './anthropic.js';
export { GeminiProvider } from './gemini.js';
export type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from './provider.js';
export { calculateLLMCost, getModelCost, hasKnownPricing } from './costs.js';
