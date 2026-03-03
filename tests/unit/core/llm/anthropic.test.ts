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

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    static RateLimitError = MockRateLimitError;
    static APIError = MockAPIError;
    messages = { create: createSpy };
    constructor() {}
  },
}));

vi.mock('../../../../src/core/config', () => ({
  getApiKey: vi.fn(() => 'key'),
}));

vi.mock('../../../../src/core/retry', () => ({
  withRetry: vi.fn((fn) => fn()),
}));

describe('anthropic provider', () => {
  beforeEach(() => {
    createSpy.mockReset();
  });

  it('builds system content and transforms response', async () => {
    createSpy.mockResolvedValue({
      model: 'claude',
      content: [{ type: 'text', text: 'Hello' }],
      usage: { input_tokens: 1, output_tokens: 2 },
      stop_reason: 'stop',
    });

    const { AnthropicProvider } = await import('../../../../src/core/llm/anthropic');
    const provider = new AnthropicProvider('claude', 'key');
    const result = await provider.chat(
      [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hi' },
      ],
      { jsonMode: true, maxTokens: 100 }
    );

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        system: expect.stringContaining('You MUST respond with valid JSON only'),
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hi' }],
      })
    );
    expect(result.content).toBe('Hello');
    expect(result.usage.totalTokens).toBe(3);
  });

  it('throws RateLimitError on rate limit', async () => {
    createSpy.mockRejectedValue(new MockRateLimitError('429'));
    const { AnthropicProvider } = await import('../../../../src/core/llm/anthropic');
    const provider = new AnthropicProvider('claude', 'key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({
      code: 'RATE_LIMIT',
    });
  });

  it('throws APIError on API failure', async () => {
    createSpy.mockRejectedValue(new MockAPIError('bad', 500));
    const { AnthropicProvider } = await import('../../../../src/core/llm/anthropic');
    const provider = new AnthropicProvider('claude', 'key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({
      code: 'API_ERROR',
    });
  });
});
