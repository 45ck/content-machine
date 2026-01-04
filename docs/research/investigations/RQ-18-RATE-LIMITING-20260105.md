# RQ-18: Rate Limiting for Multiple API Providers

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P1  
**Question:** How do we handle rate limiting across multiple API providers?

---

## 1. Problem Statement

The pipeline calls multiple APIs with different rate limits:
- OpenAI: 60 RPM, 90,000 TPM (varies by tier)
- Pexels: 200 requests/hour
- ElevenLabs: varies by plan

We need:
- Per-provider rate limiting
- HTTP 429 detection and retry
- Token-per-minute tracking (not just requests)
- State persistence across CLI invocations

---

## 2. Vendor Evidence

### 2.1 p-limit Pattern (Remotion)

**Source:** [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer)

Remotion implements a custom p-limit for concurrency control:

```typescript
export const pLimit = (concurrency: number) => {
  const queue: Function[] = [];
  let activeCount = 0;

  const next = () => {
    activeCount--;
    if (queue.length > 0) queue.shift()?.();
  };

  return async <Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
    ...args: Args
  ): Promise<R> => {
    return new Promise((resolve) => {
      const run = async () => {
        activeCount++;
        const result = await fn(...args);
        resolve(result);
        next();
      };
      
      if (activeCount < concurrency) run();
      else queue.push(run);
    });
  };
};
```

### 2.2 OpenAI Rate Limit Headers

**Source:** [vendor/openai-agents-js](../../../vendor/openai-agents-js)

OpenAI returns rate limit info in headers:

```yaml
x-ratelimit-limit-requests: '10000'
x-ratelimit-limit-tokens: '10000000'
x-ratelimit-remaining-requests: '9999'
x-ratelimit-remaining-tokens: '9999991'
x-ratelimit-reset-requests: 6ms
x-ratelimit-reset-tokens: 0s
```

### 2.3 HTTP 429 Retry Patterns

**Pattern A: Simple recursive retry (shortrocity)**

```python
if response.status_code == 429:
    logger.info("Rate limited, waiting before retry")
    time.sleep(1)
    return run_remote(prompt)  # Recursive retry
```

**Pattern B: urllib3 Retry strategy (capcut-mate)**

```python
retry_strategy = Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=["GET", "HEAD"],
    raise_on_status=False
)
```

**Pattern C: Counter-based retry (short-video-maker-gyori)**

```typescript
async findVideo(searchTerms: string[], retryCounter: number = 0): Promise<Video> {
  try {
    return await this._findVideo(searchTerms);
  } catch (error) {
    if (retryCounter < 3) {
      await sleep(1000 * Math.pow(2, retryCounter));  // Exponential backoff
      return await this.findVideo(searchTerms, retryCounter + 1);
    }
    throw error;
  }
}
```

---

## 3. Recommended Implementation

### 3.1 Provider Configuration

```typescript
interface ProviderRateConfig {
  requestsPerMinute: number;
  tokensPerMinute?: number;  // For LLM APIs
  burstLimit?: number;       // Max concurrent
  retryConfig: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
  };
}

const PROVIDER_CONFIGS: Record<string, ProviderRateConfig> = {
  openai: {
    requestsPerMinute: 60,
    tokensPerMinute: 90_000,
    burstLimit: 5,
    retryConfig: {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 60_000,
      backoffMultiplier: 2,
    },
  },
  pexels: {
    requestsPerMinute: 3,  // 200/hour = ~3.3/min, be conservative
    burstLimit: 2,
    retryConfig: {
      maxRetries: 2,
      initialDelayMs: 5000,
      maxDelayMs: 30_000,
      backoffMultiplier: 2,
    },
  },
  elevenlabs: {
    requestsPerMinute: 10,
    burstLimit: 2,
    retryConfig: {
      maxRetries: 2,
      initialDelayMs: 2000,
      maxDelayMs: 30_000,
      backoffMultiplier: 2,
    },
  },
};
```

### 3.2 Rate Limiter Class

```typescript
import pLimit from 'p-limit';

interface RateLimitState {
  windowStart: number;
  requestCount: number;
  tokenCount: number;
}

class RateLimiter {
  private config: ProviderRateConfig;
  private state: RateLimitState;
  private limiter: ReturnType<typeof pLimit>;
  private queue: Array<() => void> = [];

  constructor(provider: string) {
    this.config = PROVIDER_CONFIGS[provider] ?? PROVIDER_CONFIGS.openai;
    this.state = {
      windowStart: Date.now(),
      requestCount: 0,
      tokenCount: 0,
    };
    this.limiter = pLimit(this.config.burstLimit ?? 5);
  }

  private resetWindowIfNeeded(): void {
    const now = Date.now();
    const windowMs = 60_000;  // 1 minute window
    
    if (now - this.state.windowStart > windowMs) {
      this.state = {
        windowStart: now,
        requestCount: 0,
        tokenCount: 0,
      };
    }
  }

  private async waitIfNeeded(estimatedTokens?: number): Promise<void> {
    this.resetWindowIfNeeded();

    // Check request limit
    if (this.state.requestCount >= this.config.requestsPerMinute) {
      const waitMs = 60_000 - (Date.now() - this.state.windowStart);
      if (waitMs > 0) {
        await sleep(waitMs);
        this.resetWindowIfNeeded();
      }
    }

    // Check token limit (for LLM APIs)
    if (
      this.config.tokensPerMinute &&
      estimatedTokens &&
      this.state.tokenCount + estimatedTokens > this.config.tokensPerMinute
    ) {
      const waitMs = 60_000 - (Date.now() - this.state.windowStart);
      if (waitMs > 0) {
        await sleep(waitMs);
        this.resetWindowIfNeeded();
      }
    }
  }

  async execute<T>(
    fn: () => Promise<T>,
    options?: { estimatedTokens?: number }
  ): Promise<T> {
    return this.limiter(async () => {
      await this.waitIfNeeded(options?.estimatedTokens);

      this.state.requestCount++;
      if (options?.estimatedTokens) {
        this.state.tokenCount += options.estimatedTokens;
      }

      return fn();
    });
  }
}
```

### 3.3 HTTP 429 Handler with Retry

```typescript
interface RetryOptions {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  let lastError: Error | null = null;
  let delay = options.initialDelayMs;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if retryable
      const status = error.status ?? error.response?.status;
      const isRateLimited = status === 429;
      const isServerError = status >= 500 && status < 600;

      if (!isRateLimited && !isServerError) {
        throw error;  // Not retryable
      }

      if (attempt < options.maxRetries) {
        // Check for Retry-After header
        const retryAfter = parseRetryAfter(error);
        const waitMs = retryAfter ?? delay;

        console.warn(
          `Rate limited (attempt ${attempt + 1}/${options.maxRetries + 1}), ` +
          `waiting ${waitMs}ms before retry`
        );

        await sleep(waitMs);
        delay = Math.min(delay * options.backoffMultiplier, options.maxDelayMs);
      }
    }
  }

  throw lastError;
}

function parseRetryAfter(error: any): number | null {
  const header = error.response?.headers?.['retry-after'];
  if (!header) return null;

  // Can be seconds or HTTP date
  const seconds = parseInt(header, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}
```

### 3.4 Unified API Client

```typescript
class ApiClient {
  private rateLimiters: Map<string, RateLimiter> = new Map();

  private getLimiter(provider: string): RateLimiter {
    if (!this.rateLimiters.has(provider)) {
      this.rateLimiters.set(provider, new RateLimiter(provider));
    }
    return this.rateLimiters.get(provider)!;
  }

  async callOpenAI<T>(
    fn: () => Promise<T>,
    estimatedTokens: number
  ): Promise<T> {
    const limiter = this.getLimiter('openai');
    const config = PROVIDER_CONFIGS.openai;

    return withRetry(
      () => limiter.execute(fn, { estimatedTokens }),
      config.retryConfig
    );
  }

  async callPexels<T>(fn: () => Promise<T>): Promise<T> {
    const limiter = this.getLimiter('pexels');
    const config = PROVIDER_CONFIGS.pexels;

    return withRetry(
      () => limiter.execute(fn),
      config.retryConfig
    );
  }
}
```

### 3.5 OpenAI Header-Based Adaptive Limiting

```typescript
class OpenAIRateLimiter extends RateLimiter {
  private remainingTokens: number = Infinity;
  private remainingRequests: number = Infinity;
  private resetAt: number = 0;

  updateFromHeaders(headers: Headers | Record<string, string>): void {
    const get = (key: string) => 
      headers instanceof Headers ? headers.get(key) : headers[key];

    const remaining = get('x-ratelimit-remaining-requests');
    if (remaining) this.remainingRequests = parseInt(remaining, 10);

    const tokens = get('x-ratelimit-remaining-tokens');
    if (tokens) this.remainingTokens = parseInt(tokens, 10);

    const reset = get('x-ratelimit-reset-requests');
    if (reset) {
      this.resetAt = Date.now() + parseResetTime(reset);
    }
  }

  async waitIfNeeded(estimatedTokens?: number): Promise<void> {
    // Use header-based limits if available
    if (this.remainingRequests <= 0 && Date.now() < this.resetAt) {
      const waitMs = this.resetAt - Date.now();
      await sleep(waitMs);
    }

    if (estimatedTokens && this.remainingTokens < estimatedTokens) {
      await sleep(1000);  // Brief pause for token refresh
    }

    // Fall back to window-based limiting
    await super.waitIfNeeded(estimatedTokens);
  }
}

function parseResetTime(value: string): number {
  // "6ms" -> 6, "1s" -> 1000
  const match = value.match(/^(\d+)(ms|s|m|h)?$/);
  if (!match) return 0;

  const num = parseInt(match[1], 10);
  const unit = match[2] ?? 'ms';

  switch (unit) {
    case 'ms': return num;
    case 's': return num * 1000;
    case 'm': return num * 60_000;
    case 'h': return num * 3_600_000;
    default: return num;
  }
}
```

---

## 4. State Persistence (Optional)

For long-running batch jobs, persist rate limit state:

```typescript
interface PersistedRateState {
  provider: string;
  windowStart: number;
  requestCount: number;
  tokenCount: number;
  updatedAt: number;
}

async function saveRateState(
  provider: string,
  state: RateLimitState
): Promise<void> {
  const stateFile = path.join(os.tmpdir(), 'cm-rate-limits.json');
  const existing = await loadRateStates();
  
  existing[provider] = {
    ...state,
    provider,
    updatedAt: Date.now(),
  };
  
  await fs.writeFile(stateFile, JSON.stringify(existing, null, 2));
}

async function loadRateStates(): Promise<Record<string, PersistedRateState>> {
  const stateFile = path.join(os.tmpdir(), 'cm-rate-limits.json');
  
  try {
    const content = await fs.readFile(stateFile, 'utf-8');
    const states = JSON.parse(content);
    
    // Expire old entries (>1 hour)
    const now = Date.now();
    for (const [key, state] of Object.entries(states)) {
      if (now - (state as any).updatedAt > 3_600_000) {
        delete states[key];
      }
    }
    
    return states;
  } catch {
    return {};
  }
}
```

---

## 5. Implementation Recommendations

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| Library | Custom p-limit + retry | Remotion pattern, minimal deps |
| Per-provider config | Yes | Different APIs, different limits |
| Token tracking | For LLM APIs only | Prevents expensive overages |
| Retry strategy | Exponential backoff | Industry standard |
| Retry-After header | Respect it | API's authoritative timing |
| State persistence | Optional, temp file | Helps batch jobs |

---

## 6. References

- [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer) — p-limit implementation
- [vendor/openai-agents-js](../../../vendor/openai-agents-js) — Rate limit headers
- [vendor/short-video-maker-gyori](../../../vendor/short-video-maker-gyori) — Retry patterns
- [OpenAI Rate Limits](https://platform.openai.com/docs/guides/rate-limits) — Official docs
