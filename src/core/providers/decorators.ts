/**
 * LLM Provider Decorators - Decorator Pattern Implementation
 *
 * Provides cross-cutting concerns:
 * - LoggingLLMProvider: Request/response logging
 * - CachingLLMProvider: Response caching with TTL
 * - RetryLLMProvider: Exponential backoff retry
 */

import type { Logger } from 'pino';
import type { LLMProvider, LLMMessage, LLMOptions, LLMResponse } from '../llm/provider.js';
import { isRetryable } from '../errors.js';

// ============================================================================
// Logging Decorator
// ============================================================================

export class LoggingLLMProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private inner: LLMProvider;
  private logger: Logger;

  constructor(inner: LLMProvider, logger: Logger) {
    this.inner = inner;
    this.logger = logger;
    this.name = inner.name;
    this.model = inner.model;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const response = await this.inner.chat(messages, options);
      const durationMs = Date.now() - startTime;

      this.logger.debug({
        msg: 'LLM request completed',
        provider: this.name,
        model: this.model,
        durationMs,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      this.logger.error({
        msg: 'LLM request failed',
        provider: this.name,
        model: this.model,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}

// ============================================================================
// Caching
// ============================================================================

export interface LLMCacheEntry {
  response: LLMResponse;
  timestamp: number;
}

export interface LLMCache {
  get(key: string): LLMCacheEntry | undefined;
  set(key: string, entry: LLMCacheEntry): void;
  has(key: string): boolean;
  delete(key: string): void;
  clear(): void;
  readonly size: number;
}

export class InMemoryLLMCache implements LLMCache {
  private cache = new Map<string, LLMCacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = 3600000) {
    // Default 1 hour
    this.ttlMs = ttlMs;
  }

  get(key: string): LLMCacheEntry | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    return entry;
  }

  set(key: string, entry: LLMCacheEntry): void {
    this.cache.set(key, entry);
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

export interface CachingOptions extends LLMOptions {
  bypassCache?: boolean;
}

export class CachingLLMProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private inner: LLMProvider;
  private cache: LLMCache;
  private hits = 0;
  private misses = 0;

  constructor(inner: LLMProvider, cache: LLMCache) {
    this.inner = inner;
    this.cache = cache;
    this.name = inner.name;
    this.model = inner.model;
  }

  async chat(messages: LLMMessage[], options?: CachingOptions): Promise<LLMResponse> {
    const bypassCache = options?.bypassCache ?? false;
    const key = this.createCacheKey(messages, options);

    if (!bypassCache) {
      const cached = this.cache.get(key);

      if (cached) {
        this.hits++;
        return cached.response;
      }
    }

    this.misses++;
    const response = await this.inner.chat(messages, options);

    if (!bypassCache) {
      this.cache.set(key, { response, timestamp: Date.now() });
    }

    return response;
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  private createCacheKey(messages: LLMMessage[], options?: LLMOptions): string {
    return JSON.stringify({
      provider: this.name,
      model: this.model,
      messages,
      options: {
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
        jsonMode: options?.jsonMode,
      },
    });
  }
}

// ============================================================================
// Retry Decorator
// ============================================================================

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

export class RetryLLMProvider implements LLMProvider {
  readonly name: string;
  readonly model: string;
  private inner: LLMProvider;
  private maxAttempts: number;
  private initialDelayMs: number;
  private maxDelayMs: number;
  private jitter: boolean;
  private onRetry?: (attempt: number, error: Error, delayMs: number) => void;

  constructor(inner: LLMProvider, options: RetryOptions = {}) {
    this.inner = inner;
    this.name = inner.name;
    this.model = inner.model;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.initialDelayMs = options.initialDelayMs ?? 1000;
    this.maxDelayMs = options.maxDelayMs ?? 30000;
    this.jitter = options.jitter ?? true;
    this.onRetry = options.onRetry;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.inner.chat(messages, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry non-retryable errors
        if (!isRetryable(error)) {
          throw lastError;
        }

        // Don't retry if this was the last attempt
        if (attempt === this.maxAttempts) {
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);

        // Notify retry callback if provided
        if (this.onRetry) {
          this.onRetry(attempt, lastError, delay);
        }

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff: initialDelay * 2^(attempt-1)
    let delay = this.initialDelayMs * Math.pow(2, attempt - 1);

    // Cap at max delay
    delay = Math.min(delay, this.maxDelayMs);

    // Add jitter if enabled (+/- 25%)
    if (this.jitter) {
      const jitterRange = delay * 0.25;
      delay += (Math.random() - 0.5) * 2 * jitterRange;
    }

    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
