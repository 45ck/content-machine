/**
 * LLM Provider Interface
 * 
 * Defines the contract for all LLM providers (OpenAI, Anthropic, etc.)
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface LLMMessage {
  role: MessageRole;
  content: string;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage: LLMUsage;
  finishReason?: string;
  model?: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  stopSequences?: string[];
}

/**
 * Interface for LLM providers
 */
export interface LLMProvider {
  readonly name: string;
  readonly model: string;
  
  /**
   * Send a chat completion request
   */
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

/**
 * Factory function type for creating LLM providers
 */
export type LLMProviderFactory = (model: string, apiKey?: string) => LLMProvider;
