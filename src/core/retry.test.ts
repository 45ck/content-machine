/**
 * Retry Utility Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { withRetry } from './retry';
import { RateLimitError, APIError } from './errors';

describe('Retry', () => {
  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new RateLimitError('test', 0))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should exhaust retries and throw', async () => {
      const error = new RateLimitError('test', 0);
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow(
        RateLimitError
      );

      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const error = new Error('Not retryable');
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow('Not retryable');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on 5xx API errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new APIError('Server error', { status: 500 }))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 2, baseDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 4xx API errors', async () => {
      const error = new APIError('Client error', { status: 400 });
      const fn = vi.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 2 })).rejects.toThrow(APIError);

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use rate limit retry-after for delay', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new RateLimitError('test', 1)) // 1 second
        .mockResolvedValue('success');

      const start = Date.now();
      await withRetry(fn, { maxRetries: 2 });
      const elapsed = Date.now() - start;

      // Should wait approximately 1 second (1000ms)
      expect(elapsed).toBeGreaterThanOrEqual(900);
    });

    it('should support custom retryable check', async () => {
      const error = new Error('Custom retryable');
      const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 2,
        baseDelayMs: 10,
        isRetryable: (e) => e instanceof Error && e.message === 'Custom retryable',
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
