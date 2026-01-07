/**
 * Decorator Pattern Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LoggingLLMProvider,
  CachingLLMProvider,
  InMemoryLLMCache,
  RetryLLMProvider,
} from '../../../../src/core/providers/decorators.js';
import { FakeLLMProvider } from '../../../../src/test/stubs/fake-llm.js';
import { RateLimitError } from '../../../../src/core/errors.js';
import pino from 'pino';

describe('LoggingLLMProvider', () => {
  let inner: FakeLLMProvider;
  let logger: ReturnType<typeof pino>;
  let logged: LoggingLLMProvider;
  let logOutput: Array<{ msg: string; [key: string]: unknown }>;

  beforeEach(() => {
    inner = new FakeLLMProvider();
    logOutput = [];
    logger = pino(
      { level: 'debug' },
      {
        write: (chunk: string) => {
          logOutput.push(JSON.parse(chunk));
        },
      }
    );
    logged = new LoggingLLMProvider(inner, logger);
  });

  it('should pass through to inner provider', async () => {
    inner.queueResponse({
      content: 'Hello',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });

    const result = await logged.chat([{ role: 'user', content: 'Hi' }]);

    expect(result.content).toBe('Hello');
  });

  it('should log request details', async () => {
    inner.queueResponse({
      content: 'Hello',
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    });

    await logged.chat([{ role: 'user', content: 'Hi' }]);

    expect(logOutput.some((log) => log.msg?.includes('LLM request completed'))).toBe(true);
  });

  it('should log errors', async () => {
    inner.queueError(new Error('API error'));

    await expect(logged.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('API error');

    expect(logOutput.some((log) => log.msg?.includes('failed'))).toBe(true);
  });
});

describe('CachingLLMProvider', () => {
  let inner: FakeLLMProvider;
  let cache: InMemoryLLMCache;
  let cached: CachingLLMProvider;

  const defaultUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };

  beforeEach(() => {
    inner = new FakeLLMProvider();
    cache = new InMemoryLLMCache();
    cached = new CachingLLMProvider(inner, cache);
  });

  it('should cache responses for identical requests', async () => {
    inner.queueResponse({ content: 'Response 1', usage: defaultUsage });

    const messages = [{ role: 'user' as const, content: 'Hello' }];

    await cached.chat(messages);
    const result2 = await cached.chat(messages);

    expect(result2.content).toBe('Response 1');
    expect(inner.getCalls()).toHaveLength(1); // Only one call to inner
  });

  it('should not cache different requests', async () => {
    inner.queueResponse({ content: 'Response 1', usage: defaultUsage });
    inner.queueResponse({ content: 'Response 2', usage: defaultUsage });

    await cached.chat([{ role: 'user', content: 'Hello' }]);
    await cached.chat([{ role: 'user', content: 'Goodbye' }]);

    expect(inner.getCalls()).toHaveLength(2);
  });

  it('should bypass cache when option set', async () => {
    inner.queueResponse({ content: 'Response 1', usage: defaultUsage });
    inner.queueResponse({ content: 'Response 2', usage: defaultUsage });

    const messages = [{ role: 'user' as const, content: 'Hello' }];

    await cached.chat(messages);
    await cached.chat(messages, { bypassCache: true });

    expect(inner.getCalls()).toHaveLength(2);
  });

  it('should respect TTL', async () => {
    const shortCache = new InMemoryLLMCache(50); // 50ms TTL
    cached = new CachingLLMProvider(inner, shortCache);

    inner.queueResponse({ content: 'Response 1', usage: defaultUsage });
    inner.queueResponse({ content: 'Response 2', usage: defaultUsage });

    const messages = [{ role: 'user' as const, content: 'Hello' }];

    await cached.chat(messages);

    await new Promise((r) => setTimeout(r, 100)); // Wait for expiry

    await cached.chat(messages);

    expect(inner.getCalls()).toHaveLength(2);
  });
});

describe('RetryLLMProvider', () => {
  let inner: FakeLLMProvider;
  let retry: RetryLLMProvider;

  const defaultUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };

  beforeEach(() => {
    vi.useFakeTimers();
    inner = new FakeLLMProvider();
    // Short delays for testing
    retry = new RetryLLMProvider(inner, {
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 500,
      jitter: false, // Disable jitter for predictable tests
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should pass through on success', async () => {
    inner.queueResponse({ content: 'Success', usage: defaultUsage });

    const result = await retry.chat([{ role: 'user', content: 'Hi' }]);

    expect(result.content).toBe('Success');
  });

  it('should retry on retryable errors', async () => {
    inner.queueError(new RateLimitError('Rate limited', 0));
    inner.queueResponse({ content: 'Success after retry', usage: defaultUsage });

    const resultPromise = retry.chat([{ role: 'user', content: 'Hi' }]);

    // Advance timer to trigger retry
    await vi.advanceTimersByTimeAsync(200);

    const result = await resultPromise;

    expect(result.content).toBe('Success after retry');
    expect(inner.getCalls()).toHaveLength(2);
  });

  it('should not retry non-retryable errors', async () => {
    inner.queueError(new Error('Validation error'));

    await expect(retry.chat([{ role: 'user', content: 'Hi' }])).rejects.toThrow('Validation error');

    expect(inner.getCalls()).toHaveLength(1);
  });

  it('should give up after max attempts', async () => {
    inner.queueError(new RateLimitError('Rate limited', 0));
    inner.queueError(new RateLimitError('Rate limited', 0));
    inner.queueError(new RateLimitError('Rate limited', 0));

    // Capture the promise and its rejection
    let caughtError: Error | undefined;
    const resultPromise = retry.chat([{ role: 'user', content: 'Hi' }]).catch((err) => {
      caughtError = err;
    });

    // Advance timer to trigger all retries
    await vi.runAllTimersAsync();

    await resultPromise;

    expect(caughtError).toBeDefined();
    expect(caughtError?.message).toContain('Rate limited');
    expect(inner.getCalls()).toHaveLength(3);
  });

  it('should use exponential backoff', async () => {
    inner.queueError(new RateLimitError('Rate limited', 0));
    inner.queueError(new RateLimitError('Rate limited', 0));
    inner.queueResponse({ content: 'Success', usage: defaultUsage });

    const resultPromise = retry.chat([{ role: 'user', content: 'Hi' }]);

    // First retry after 100ms
    await vi.advanceTimersByTimeAsync(100);
    expect(inner.getCalls()).toHaveLength(2);

    // Second retry after 200ms (100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);
    expect(inner.getCalls()).toHaveLength(3);

    const result = await resultPromise;
    expect(result.content).toBe('Success');
  });

  it('should call onRetry callback when retrying', async () => {
    const onRetry = vi.fn();
    const retryWithCallback = new RetryLLMProvider(inner, {
      maxAttempts: 3,
      initialDelayMs: 100,
      maxDelayMs: 500,
      jitter: false,
      onRetry,
    });

    inner.queueError(new RateLimitError('Rate limited', 0));
    inner.queueResponse({ content: 'Success', usage: defaultUsage });

    const resultPromise = retryWithCallback.chat([{ role: 'user', content: 'Hi' }]);

    await vi.advanceTimersByTimeAsync(200);

    await resultPromise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), 100);
  });
});

describe('InMemoryLLMCache', () => {
  it('should store and retrieve entries', () => {
    const cache = new InMemoryLLMCache();
    const entry = {
      response: {
        content: 'test',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      },
      timestamp: Date.now(),
    };

    cache.set('key1', entry);

    expect(cache.get('key1')).toEqual(entry);
    expect(cache.has('key1')).toBe(true);
  });

  it('should return undefined for missing keys', () => {
    const cache = new InMemoryLLMCache();

    expect(cache.get('missing')).toBeUndefined();
    expect(cache.has('missing')).toBe(false);
  });

  it('should delete entries', () => {
    const cache = new InMemoryLLMCache();
    cache.set('key1', {
      response: {
        content: 'test',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      },
      timestamp: Date.now(),
    });

    cache.delete('key1');

    expect(cache.has('key1')).toBe(false);
  });

  it('should clear all entries', () => {
    const cache = new InMemoryLLMCache();
    cache.set('key1', {
      response: {
        content: 'test',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      },
      timestamp: Date.now(),
    });
    cache.set('key2', {
      response: {
        content: 'test2',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      },
      timestamp: Date.now(),
    });

    cache.clear();

    expect(cache.size).toBe(0);
  });

  it('should report correct size', () => {
    const cache = new InMemoryLLMCache();

    expect(cache.size).toBe(0);

    cache.set('key1', {
      response: {
        content: 'test',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      },
      timestamp: Date.now(),
    });

    expect(cache.size).toBe(1);
  });
});

describe('CachingLLMProvider statistics', () => {
  it('should track cache hit/miss statistics', async () => {
    const inner = new FakeLLMProvider();
    const cache = new InMemoryLLMCache();
    const cached = new CachingLLMProvider(inner, cache);
    const defaultUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };

    inner.queueResponse({ content: 'Response 1', usage: defaultUsage });

    const messages = [{ role: 'user' as const, content: 'Hello' }];

    // First call - miss
    await cached.chat(messages);
    // Second call - hit
    await cached.chat(messages);
    // Third call - hit
    await cached.chat(messages);

    const stats = cached.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBeCloseTo(0.667, 2);
  });

  it('should clear cache via clearCache method', async () => {
    const inner = new FakeLLMProvider();
    const cache = new InMemoryLLMCache();
    const cached = new CachingLLMProvider(inner, cache);
    const defaultUsage = { promptTokens: 10, completionTokens: 5, totalTokens: 15 };

    inner.queueResponse({ content: 'Response 1', usage: defaultUsage });
    inner.queueResponse({ content: 'Response 2', usage: defaultUsage });

    const messages = [{ role: 'user' as const, content: 'Hello' }];

    await cached.chat(messages);
    cached.clearCache();
    const result = await cached.chat(messages);

    expect(result.content).toBe('Response 2');
    expect(inner.getCalls()).toHaveLength(2);
  });
});
