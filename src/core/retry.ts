/**
 * Retry Utilities
 *
 * Exponential backoff retry logic for API calls.
 * Based on SYSTEM-DESIGN §4 LLMConfigSchema.maxRetries
 */
import { createLogger } from './logger';
import { RateLimitError, APIError } from './errors';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries?: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 to add randomness (default: 0.1) */
  jitterFactor?: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: unknown) => boolean;
  /** Optional logger context */
  context?: Record<string, unknown>;
}

/**
 * Default retryable error check
 */
function defaultIsRetryable(error: unknown): boolean {
  // Rate limit errors are retryable
  if (error instanceof RateLimitError) {
    return true;
  }

  // API errors with 5xx status are retryable
  if (error instanceof APIError) {
    const status = error.context?.status;
    return typeof status === 'number' && status >= 500 && status < 600;
  }

  // Network errors (fetch failures) are retryable
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('network') ||
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('socket')
    );
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitterFactor: number
): number {
  // Exponential backoff: delay = base * 2^attempt
  const exponentialDelay = baseDelayMs * Math.pow(2, attempt);
  
  // Cap at max delay
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);
  
  // Add jitter to prevent thundering herd
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
  
  return Math.max(0, cappedDelay + jitter);
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    jitterFactor = 0.1,
    isRetryable = defaultIsRetryable,
    context = {},
  } = options;

  const log = createLogger({ module: 'retry', ...context });

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt >= maxRetries || !isRetryable(error)) {
        log.error(
          { attempt, maxRetries, error },
          'Retry exhausted or error not retryable'
        );
        throw error;
      }

      // Calculate delay
      let delayMs: number;
      
      // Use rate limit retry-after if available
      if (error instanceof RateLimitError && error.retryAfterSeconds) {
        delayMs = error.retryAfterSeconds * 1000;
      } else {
        delayMs = calculateDelay(attempt, baseDelayMs, maxDelayMs, jitterFactor);
      }

      log.warn(
        { attempt, maxRetries, delayMs, error },
        `Retrying after ${delayMs}ms`
      );

      await sleep(delayMs);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Create a retry wrapper for a specific function
 */
export function createRetryWrapper<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options: RetryOptions = {}
): T {
  return ((...args: Parameters<T>) => withRetry(() => fn(...args), options)) as T;
}
