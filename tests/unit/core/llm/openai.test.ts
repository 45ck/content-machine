import { describe, it, expect, vi, beforeEach } from 'vitest';

class MockRateLimitError extends Error {}
class MockAPIError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

const createSpy = vi.fn();

vi.mock('openai', () => {
  return {
    default: class OpenAI {
      static RateLimitError = MockRateLimitError;
      static APIError = MockAPIError;
      chat = { completions: { create: createSpy } };
      constructor() {}
    },
  };
});

vi.mock('../../../../src/core/config', () => ({
  getApiKey: vi.fn(() => 'key'),
}));

vi.mock('../../../../src/core/retry', () => ({
  withRetry: vi.fn((fn) => fn()),
}));

describe('openai provider', () => {
  beforeEach(() => {
    createSpy.mockReset();
  });

  it('builds request params and parses response', async () => {
    createSpy.mockResolvedValue({
      model: 'gpt-4o',
      choices: [{ message: { content: 'Hello' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    });

    const { OpenAIProvider } = await import('../../../../src/core/llm/openai');
    const provider = new OpenAIProvider('gpt-4o', 'key');
    const result = await provider.chat([{ role: 'user', content: 'Hi' }], {
      temperature: 0.2,
      jsonMode: true,
      stopSequences: ['END'],
      maxTokens: 100,
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o',
        temperature: 0.2,
        max_tokens: 100,
        response_format: { type: 'json_object' },
        stop: ['END'],
      })
    );
    expect(result.content).toBe('Hello');
    expect(result.usage.totalTokens).toBe(3);
  });

  it('throws RateLimitError for rate limits', async () => {
    createSpy.mockRejectedValue(new MockRateLimitError('429'));
    const { OpenAIProvider } = await import('../../../../src/core/llm/openai');
    const provider = new OpenAIProvider('gpt-4o', 'key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({
      code: 'RATE_LIMIT',
    });
  });

  it('throws APIError for API failures', async () => {
    createSpy.mockRejectedValue(new MockAPIError('bad', 500));
    const { OpenAIProvider } = await import('../../../../src/core/llm/openai');
    const provider = new OpenAIProvider('gpt-4o', 'key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({
      code: 'API_ERROR',
    });
  });
});
