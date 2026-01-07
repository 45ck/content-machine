# DP-02: Decorator Pattern for Cross-Cutting Concerns

**Date:** 2026-01-07  
**Status:** Research Complete  
**Category:** Design Patterns  
**Priority:** P1 (Important)  
**Pattern Type:** GoF Decorator

---

## 1. Executive Summary

The **Decorator Pattern** enables adding behavior (logging, caching, retry, rate limiting, telemetry) to providers without modifying their code. This research document analyzes cross-cutting concerns in content-machine and proposes a decorator architecture that composes behaviors at runtime.

---

## 2. Problem Statement

### 2.1 Current Scattered Concerns

Cross-cutting concerns are currently scattered throughout the codebase:

```typescript
// src/audio/tts/index.ts - Logging mixed with business logic
export async function synthesizeSpeech(options: TTSOptions): Promise<TTSResult> {
  const log = createLogger({ module: 'tts', voice: options.voice });
  log.info({ textLength: options.text.length }, 'Starting TTS synthesis');

  try {
    // ... business logic ...
    log.info({ duration, outputPath }, 'TTS synthesis complete');
  } catch (error) {
    log.error({ error }, 'TTS synthesis failed');  // <-- Mixed
    throw new APIError(...);
  }
}
```

```typescript
// src/visuals/providers/pexels.ts - Caching mixed with API calls
let cachedClient: ReturnType<typeof createClient> | null = null; // <-- Singleton cache

function getClient(): ReturnType<typeof createClient> {
  if (!cachedClient) {
    const apiKey = getApiKey('PEXELS_API_KEY');
    cachedClient = createClient(apiKey); // <-- Cache logic mixed
  }
  return cachedClient;
}
```

```typescript
// src/core/retry.ts - Retry is separate but must be manually wrapped
const result = await withRetry(() => provider.synthesize(text), options); // <-- Manual wrapping
```

### 2.2 Issues with Current Approach

| Issue                        | Impact                                       |
| ---------------------------- | -------------------------------------------- |
| **Tight coupling**           | Can't add logging without modifying provider |
| **Testing difficulty**       | Must mock logger, cache separately           |
| **Inconsistent application** | Some providers logged, some not              |
| **Configuration overhead**   | Each concern configured differently          |
| **Composition complexity**   | Manually combining retry + logging + caching |

---

## 3. Decorator Pattern Solution

### 3.1 Core Concept

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Code                                  │
│                         │                                        │
│                         ▼                                        │
│   ┌─────────────────────────────────────────┐                   │
│   │         LoggingDecorator                 │                   │
│   │  logs before/after, wraps:               │                   │
│   │    ┌─────────────────────────────────┐  │                   │
│   │    │      CachingDecorator            │  │                   │
│   │    │  caches results, wraps:          │  │                   │
│   │    │    ┌─────────────────────────┐  │  │                   │
│   │    │    │    RetryDecorator        │  │  │                   │
│   │    │    │  retries on failure:     │  │  │                   │
│   │    │    │    ┌─────────────────┐  │  │  │                   │
│   │    │    │    │  RealProvider    │  │  │  │                   │
│   │    │    │    │  (OpenAI, etc.)  │  │  │  │                   │
│   │    │    │    └─────────────────┘  │  │  │                   │
│   │    │    └─────────────────────────┘  │  │                   │
│   │    └─────────────────────────────────┘  │                   │
│   └─────────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Interface Requirement

Decorators work because they implement the **same interface** as the decorated object:

```typescript
// All decorators and real providers implement LLMProvider
interface LLMProvider {
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}

class OpenAIProvider implements LLMProvider { ... }
class LoggingLLMDecorator implements LLMProvider { ... }
class CachingLLMDecorator implements LLMProvider { ... }
class RetryLLMDecorator implements LLMProvider { ... }
```

---

## 4. Vendor Evidence

### 4.1 OpenAI Agents SDK Pattern

```typescript
// vendor/openai-agents-js/packages/agents-core/src/tracing/...
// Uses decorators for telemetry without modifying agent logic

class TracingSpan {
  wrap<T>(fn: () => Promise<T>, metadata: SpanMetadata): Promise<T>;
}
```

### 4.2 Weaviate Rate Limiting

```go
// vendor/storage/weaviate/usecases/modulecomponents/clients/voyageai/voyageai.go
func (c *Client) GetVectorizerRateLimit(ctx context.Context, ...) *modulecomponents.RateLimits {
  // Rate limiting as a separate concern, injected into client
}
```

### 4.3 Our Existing Retry Pattern

```typescript
// src/core/retry.ts - Already decorator-like but function-based
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  // Wraps any async function with retry logic
}
```

---

## 5. Proposed Implementation

### 5.1 Base Decorator Class

```typescript
// src/core/decorators/base.ts

/**
 * Base decorator that delegates to inner provider
 */
export abstract class LLMProviderDecorator implements LLMProvider {
  constructor(protected readonly inner: LLMProvider) {}

  get name(): string {
    return this.inner.name;
  }

  get model(): string {
    return this.inner.model;
  }

  abstract chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
}
```

### 5.2 Logging Decorator

```typescript
// src/core/decorators/logging-decorator.ts

export class LoggingLLMDecorator extends LLMProviderDecorator {
  private readonly log: Logger;

  constructor(inner: LLMProvider, logger?: Logger) {
    super(inner);
    this.log = logger ?? createLogger({ module: 'llm', provider: inner.name });
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    this.log.debug({ messageCount: messages.length, model: this.model }, 'LLM request starting');

    try {
      const response = await this.inner.chat(messages, options);

      this.log.info(
        {
          durationMs: Date.now() - startTime,
          promptTokens: response.usage?.promptTokens,
          completionTokens: response.usage?.completionTokens,
        },
        'LLM request completed'
      );

      return response;
    } catch (error) {
      this.log.error({ error, durationMs: Date.now() - startTime }, 'LLM request failed');
      throw error;
    }
  }
}
```

### 5.3 Caching Decorator

```typescript
// src/core/decorators/caching-decorator.ts

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class CachingLLMDecorator extends LLMProviderDecorator {
  private cache = new Map<string, CacheEntry<LLMResponse>>();
  private readonly ttlMs: number;

  constructor(inner: LLMProvider, options: { ttlMs?: number } = {}) {
    super(inner);
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000; // 5 minutes default
  }

  private getCacheKey(messages: LLMMessage[], options?: LLMOptions): string {
    return JSON.stringify({ messages, options, model: this.model });
  }

  private isExpired(entry: CacheEntry<LLMResponse>): boolean {
    return Date.now() > entry.expiresAt;
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const key = this.getCacheKey(messages, options);

    // Check cache
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return { ...cached.value, cached: true };
    }

    // Fetch and cache
    const response = await this.inner.chat(messages, options);

    this.cache.set(key, {
      value: response,
      expiresAt: Date.now() + this.ttlMs,
    });

    return response;
  }

  clearCache(): void {
    this.cache.clear();
  }
}
```

### 5.4 Retry Decorator

```typescript
// src/core/decorators/retry-decorator.ts

export class RetryLLMDecorator extends LLMProviderDecorator {
  private readonly maxRetries: number;
  private readonly baseDelayMs: number;
  private readonly log: Logger;

  constructor(inner: LLMProvider, options: { maxRetries?: number; baseDelayMs?: number } = {}) {
    super(inner);
    this.maxRetries = options.maxRetries ?? 3;
    this.baseDelayMs = options.baseDelayMs ?? 1000;
    this.log = createLogger({ module: 'retry', provider: inner.name });
  }

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.inner.chat(messages, options);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (!isRetryable(error) || attempt >= this.maxRetries) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, error);
        this.log.warn(
          { attempt, maxRetries: this.maxRetries, delayMs: delay },
          'Retrying after error'
        );

        await sleep(delay);
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number, error: unknown): number {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000;
    }
    return this.baseDelayMs * Math.pow(2, attempt);
  }
}
```

### 5.5 Cost Tracking Decorator

```typescript
// src/core/decorators/cost-tracking-decorator.ts

export interface CostTracker {
  totalCost: number;
  totalTokens: number;
  calls: number;
}

export class CostTrackingLLMDecorator extends LLMProviderDecorator {
  private readonly tracker: CostTracker = {
    totalCost: 0,
    totalTokens: 0,
    calls: 0,
  };

  private readonly costPer1MTokens: Record<string, number> = {
    'gpt-4o': 5,
    'gpt-4o-mini': 0.15,
    'claude-3-5-sonnet-20241022': 3,
    'claude-3-haiku-20240307': 0.25,
  };

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const response = await this.inner.chat(messages, options);

    this.tracker.calls++;
    this.tracker.totalTokens += response.usage?.totalTokens ?? 0;
    this.tracker.totalCost += this.calculateCost(response);

    return response;
  }

  private calculateCost(response: LLMResponse): number {
    const tokens = response.usage?.totalTokens ?? 0;
    const costPer1M = this.costPer1MTokens[this.model] ?? 5;
    return (tokens / 1_000_000) * costPer1M;
  }

  getStats(): CostTracker {
    return { ...this.tracker };
  }

  reset(): void {
    this.tracker.totalCost = 0;
    this.tracker.totalTokens = 0;
    this.tracker.calls = 0;
  }
}
```

### 5.6 Decorator Composition Helper

```typescript
// src/core/decorators/compose.ts

type Decorator<T> = (inner: T) => T;

/**
 * Compose multiple decorators (applied right-to-left)
 */
export function composeDecorators<T>(...decorators: Decorator<T>[]): Decorator<T> {
  return (base: T) => decorators.reduceRight((acc, decorator) => decorator(acc), base);
}

/**
 * Create a fully-decorated LLM provider
 */
export function createDecoratedLLMProvider(
  base: LLMProvider,
  options: {
    logging?: boolean;
    caching?: { ttlMs: number };
    retry?: { maxRetries: number };
    costTracking?: boolean;
  } = {}
): LLMProvider {
  let provider = base;

  // Order matters: innermost (retry) → outermost (logging)
  if (options.retry) {
    provider = new RetryLLMDecorator(provider, options.retry);
  }

  if (options.caching) {
    provider = new CachingLLMDecorator(provider, options.caching);
  }

  if (options.costTracking) {
    provider = new CostTrackingLLMDecorator(provider);
  }

  if (options.logging !== false) {
    provider = new LoggingLLMDecorator(provider);
  }

  return provider;
}

// Usage
const provider = createDecoratedLLMProvider(new OpenAIProvider('gpt-4o'), {
  logging: true,
  retry: { maxRetries: 3 },
  caching: { ttlMs: 60_000 },
  costTracking: true,
});
```

---

## 6. Application to Other Providers

### 6.1 TTS Decorators

```typescript
// Same pattern applies to TTS
class LoggingTTSDecorator implements TTSProvider {
  constructor(private inner: TTSProvider) {}

  async synthesize(text: string, options: TTSOptions): Promise<TTSResult> {
    const log = createLogger({ module: 'tts' });
    log.info({ textLength: text.length, voice: options.voice }, 'TTS starting');
    const result = await this.inner.synthesize(text, options);
    log.info({ duration: result.duration }, 'TTS complete');
    return result;
  }
}

class CachingTTSDecorator implements TTSProvider {
  // Cache by text hash + voice
}

class RetryTTSDecorator implements TTSProvider {
  // Retry on API failures
}
```

### 6.2 Stock Provider Decorators

```typescript
class RateLimitingStockDecorator implements StockProvider {
  constructor(
    private inner: StockProvider,
    private limiter: RateLimiter
  ) {}

  async search(query: string, options: StockSearchOptions): Promise<StockAsset[]> {
    await this.limiter.acquire();
    return this.inner.search(query, options);
  }
}
```

---

## 7. Configuration-Driven Decoration

```toml
# .content-machine.toml
[providers.llm]
provider = "openai"
model = "gpt-4o"

[providers.llm.decorators]
logging = true
retry = { maxRetries = 3, baseDelayMs = 1000 }
caching = { ttlMs = 300000 }
costTracking = true
rateLimiting = { requestsPerMinute = 60 }
```

```typescript
// Apply decorators from config
function createProviderFromConfig(config: ProviderConfig): LLMProvider {
  let provider = createLLMProvider(config.provider, config.model);

  if (config.decorators?.retry) {
    provider = new RetryLLMDecorator(provider, config.decorators.retry);
  }
  // ... apply other decorators

  return provider;
}
```

---

## 8. Testing Benefits

```typescript
// Tests can inject non-decorated fake providers
describe('Script Generator', () => {
  it('should generate script without logging noise', async () => {
    const fakeProvider = new FakeLLMProvider();
    fakeProvider.queueJsonResponse({ scenes: [...] });

    // No decorators = clean test output
    const result = await generateScript({
      topic: 'test',
      llmProvider: fakeProvider,  // No logging decorator
    });

    expect(result.scenes).toHaveLength(5);
  });
});

// Integration tests can use decorated providers
describe('Full Pipeline', () => {
  it('should track costs', async () => {
    const costTracker = new CostTrackingLLMDecorator(new FakeLLMProvider());

    await runPipeline({ llmProvider: costTracker });

    expect(costTracker.getStats().calls).toBe(2);
  });
});
```

---

## 9. Implementation Priority

| Decorator                 | Priority | Benefit                       |
| ------------------------- | -------- | ----------------------------- |
| **RetryDecorator**        | P0       | Essential for API reliability |
| **LoggingDecorator**      | P1       | Observability, debugging      |
| **CostTrackingDecorator** | P1       | Budget management             |
| **CachingDecorator**      | P2       | Performance, cost reduction   |
| **RateLimitingDecorator** | P2       | API compliance                |
| **TelemetryDecorator**    | P3       | Production monitoring         |

---

## 10. Related Documents

- [DP-01-PROVIDER-ABSTRACTION-STRATEGY-20260107.md](./DP-01-PROVIDER-ABSTRACTION-STRATEGY-20260107.md)
- [RQ-18-RATE-LIMITING-20260105.md](../investigations/RQ-18-RATE-LIMITING-20260105.md)
- [src/core/retry.ts](../../../src/core/retry.ts) — Existing retry utility

---

**Next Step:** Proceed to implementation plan IMPL-DP-02-DECORATOR-PATTERN-20260107.md
