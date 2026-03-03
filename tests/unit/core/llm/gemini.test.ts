import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMessageSpy = vi.fn();
const startChatSpy = vi.fn(() => ({ sendMessage: sendMessageSpy }));
const getGenerativeModelSpy = vi.fn(() => ({ startChat: startChatSpy }));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    getGenerativeModel = getGenerativeModelSpy;
    constructor() {}
  },
}));

vi.mock('../../../../src/core/config', () => ({
  getApiKey: vi.fn(() => 'key'),
  getOptionalApiKey: vi.fn(() => undefined),
}));

vi.mock('../../../../src/core/retry', () => ({
  withRetry: vi.fn((fn) => fn()),
}));

describe('gemini provider', () => {
  beforeEach(() => {
    sendMessageSpy.mockReset();
    startChatSpy.mockClear();
    getGenerativeModelSpy.mockClear();
  });

  it('prepends system content to first user message', async () => {
    sendMessageSpy.mockResolvedValue({
      response: {
        text: () => 'Hi',
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2, totalTokenCount: 3 },
        candidates: [{ finishReason: 'stop' }],
      },
    });

    const { GeminiProvider } = await import('../../../../src/core/llm/gemini');
    const provider = new GeminiProvider('gemini', 'key');
    const result = await provider.chat(
      [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ],
      { jsonMode: true, maxTokens: 100 }
    );

    expect(getGenerativeModelSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseMimeType: 'application/json',
        }),
      })
    );
    expect(sendMessageSpy).toHaveBeenCalledWith(expect.stringContaining('You are helpful'));
    expect(result.content).toBe('Hi');
  });

  it('throws ConfigError when api key missing', async () => {
    const { getApiKey } = await import('../../../../src/core/config');
    (getApiKey as unknown as ReturnType<typeof vi.fn>).mockReturnValue('');

    const { GeminiProvider } = await import('../../../../src/core/llm/gemini');
    expect(() => new GeminiProvider('gemini', undefined as any)).toThrow(/GOOGLE_API_KEY/i);
  });

  it('throws RateLimitError on quota errors', async () => {
    sendMessageSpy.mockRejectedValue(new Error('quota exceeded'));
    const { GeminiProvider } = await import('../../../../src/core/llm/gemini');
    const provider = new GeminiProvider('gemini', 'key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({
      code: 'RATE_LIMIT',
    });
  });

  it('throws ConfigError on invalid key errors', async () => {
    sendMessageSpy.mockRejectedValue(new Error('invalid key'));
    const { GeminiProvider } = await import('../../../../src/core/llm/gemini');
    const provider = new GeminiProvider('gemini', 'key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({
      code: 'CONFIG_ERROR',
    });
  });

  it('throws APIError on generic errors', async () => {
    sendMessageSpy.mockRejectedValue(new Error('boom'));
    const { GeminiProvider } = await import('../../../../src/core/llm/gemini');
    const provider = new GeminiProvider('gemini', 'key');
    await expect(provider.chat([{ role: 'user', content: 'Hi' }])).rejects.toMatchObject({
      code: 'API_ERROR',
    });
  });
});
