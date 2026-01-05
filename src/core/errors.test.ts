/**
 * Core Error Taxonomy Tests
 * TDD: Write tests FIRST, then implement
 */
import { describe, it, expect } from 'vitest';
import {
  CMError,
  ConfigError,
  APIError,
  RateLimitError,
  SchemaError,
  NotFoundError,
  RenderError,
  isCMError,
  isRetryable,
} from './errors';

describe('CMError', () => {
  it('should create base error with code and message', () => {
    const error = new CMError('TEST_ERROR', 'Test message');

    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('CMError');
    expect(error instanceof Error).toBe(true);
  });

  it('should include context when provided', () => {
    const error = new CMError('TEST_ERROR', 'Test message', { foo: 'bar' });

    expect(error.context).toEqual({ foo: 'bar' });
  });

  it('should wrap cause error', () => {
    const cause = new Error('Original error');
    const error = new CMError('TEST_ERROR', 'Wrapped', undefined, cause);

    expect(error.cause).toBe(cause);
  });
});

describe('ConfigError', () => {
  it('should create config error with CONFIG_ERROR code', () => {
    const error = new ConfigError('Missing API key');

    expect(error.code).toBe('CONFIG_ERROR');
    expect(error.message).toBe('Missing API key');
    expect(error.name).toBe('ConfigError');
  });
});

describe('APIError', () => {
  it('should include provider and status', () => {
    const error = new APIError('Rate limited', { provider: 'openai', status: 429 });

    expect(error.code).toBe('API_ERROR');
    expect(error.provider).toBe('openai');
    expect(error.status).toBe(429);
    expect(error.message).toBe('Rate limited');
  });

  it('should work without status', () => {
    const error = new APIError('Network error', { provider: 'pexels' });

    expect(error.status).toBeUndefined();
  });
});

describe('RateLimitError', () => {
  it('should include provider and retry after', () => {
    const error = new RateLimitError('openai', 60);

    expect(error.code).toBe('RATE_LIMIT');
    expect(error.provider).toBe('openai');
    expect(error.retryAfter).toBe(60);
    expect(error.message).toContain('openai');
    expect(error.message).toContain('60');
  });
});

describe('SchemaError', () => {
  it('should include validation message', () => {
    const error = new SchemaError('Validation failed: scenes Required, title Too short');

    expect(error.code).toBe('SCHEMA_ERROR');
    expect(error.message).toContain('scenes');
    expect(error.message).toContain('title');
  });
});

describe('NotFoundError', () => {
  it('should include resource type and identifier', () => {
    const error = new NotFoundError('file not found: /path/to/file.json', {
      resource: 'file',
      identifier: '/path/to/file.json',
    });

    expect(error.code).toBe('NOT_FOUND');
    expect(error.resource).toBe('file');
    expect(error.identifier).toBe('/path/to/file.json');
  });
});

describe('RenderError', () => {
  it('should create render-specific error', () => {
    const error = new RenderError('Frame 100 failed', { frame: 100 });

    expect(error.code).toBe('RENDER_ERROR');
    expect(error.context).toEqual({ frame: 100 });
  });
});

describe('isCMError', () => {
  it('should return true for CMError instances', () => {
    expect(isCMError(new CMError('TEST', 'msg'))).toBe(true);
    expect(isCMError(new ConfigError('msg'))).toBe(true);
    expect(isCMError(new APIError('msg'))).toBe(true);
  });

  it('should return false for regular errors', () => {
    expect(isCMError(new Error('msg'))).toBe(false);
    expect(isCMError(null)).toBe(false);
    expect(isCMError('error')).toBe(false);
  });
});

describe('isRetryable', () => {
  it('should return true for rate limit errors', () => {
    expect(isRetryable(new RateLimitError('openai', 60))).toBe(true);
  });

  it('should return true for 429 API errors', () => {
    expect(isRetryable(new APIError('Rate limited', { provider: 'openai', status: 429 }))).toBe(
      true
    );
  });

  it('should return true for 5xx API errors', () => {
    expect(isRetryable(new APIError('Server error', { provider: 'openai', status: 500 }))).toBe(
      true
    );
    expect(isRetryable(new APIError('Server error', { provider: 'openai', status: 503 }))).toBe(
      true
    );
  });

  it('should return false for 4xx errors (except 429)', () => {
    expect(isRetryable(new APIError('Bad request', { provider: 'openai', status: 400 }))).toBe(
      false
    );
    expect(isRetryable(new APIError('Unauthorized', { provider: 'openai', status: 401 }))).toBe(
      false
    );
  });

  it('should return false for config errors', () => {
    expect(isRetryable(new ConfigError('Missing key'))).toBe(false);
  });
});
