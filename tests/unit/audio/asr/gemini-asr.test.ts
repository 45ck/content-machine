import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function makeGeminiResponse(words: Array<{ word: string; start: number; end: number }>) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () =>
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: JSON.stringify(words) }] } }],
      }),
  };
}

describe('gemini-asr', () => {
  const originalGoogleKey = process.env.GOOGLE_API_KEY;
  const originalGeminiKey = process.env.GEMINI_API_KEY;

  let tmpDir: string;
  let audioPath: string;

  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    process.env.GOOGLE_API_KEY = 'test-google-key';
    delete process.env.GEMINI_API_KEY;

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cm-gemini-asr-'));
    audioPath = path.join(tmpDir, 'audio.wav');
    fs.writeFileSync(audioPath, Buffer.alloc(44)); // minimal WAV bytes
  });

  afterEach(() => {
    process.env.GOOGLE_API_KEY = originalGoogleKey;
    process.env.GEMINI_API_KEY = originalGeminiKey;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('happy path — returns words, duration, and text', async () => {
    const words = [
      { word: 'Hello', start: 0.0, end: 0.32 },
      { word: 'world.', start: 0.38, end: 0.71 },
    ];
    mockFetch.mockResolvedValueOnce(makeGeminiResponse(words));

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    const result = await transcribeWithGemini({ audioPath });

    expect(result.words).toHaveLength(2);
    expect(result.words[0]).toMatchObject({ word: 'Hello', start: 0.0, end: 0.32 });
    expect(result.words[1]).toMatchObject({ word: 'world.', start: 0.38, end: 0.71 });
    expect(result.duration).toBeCloseTo(0.71);
    expect(result.text).toBe('Hello world.');
  });

  it('strips markdown code fences from response', async () => {
    const words = [{ word: 'Test', start: 0.0, end: 0.5 }];
    const rawJson = '```json\n' + JSON.stringify(words) + '\n```';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: rawJson }] } }],
        }),
    });

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    const result = await transcribeWithGemini({ audioPath });

    expect(result.words).toHaveLength(1);
    expect(result.words[0].word).toBe('Test');
  });

  it('maps start_time/end_time alternate field names', async () => {
    const rawWords = [{ word: 'Alt', start_time: 0.1, end_time: 0.4 }];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(rawWords) }] } }],
        }),
    });

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    const result = await transcribeWithGemini({ audioPath });

    expect(result.words[0]).toMatchObject({ word: 'Alt', start: 0.1, end: 0.4 });
  });

  it('throws APIError on empty array response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: '[]' }] } }],
        }),
    });

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    await expect(transcribeWithGemini({ audioPath })).rejects.toMatchObject({
      name: 'APIError',
      message: expect.stringContaining('empty'),
    });
  });

  it('throws APIError when response has no JSON array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Here is my analysis of the audio.' }] } }],
        }),
    });

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    await expect(transcribeWithGemini({ audioPath })).rejects.toMatchObject({
      name: 'APIError',
      message: expect.stringContaining('did not contain a JSON array'),
    });
  });

  it('throws RateLimitError on HTTP 429 with retry-after header', async () => {
    // withRetry has maxRetries=2 (3 total attempts); mock all with retry-after:0 to avoid real waits
    const rate429 = {
      ok: false,
      status: 429,
      headers: { get: (h: string) => (h === 'retry-after' ? '0' : null) },
      text: async () => 'Too Many Requests',
    };
    mockFetch.mockResolvedValue(rate429); // same response for all retry attempts

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    await expect(transcribeWithGemini({ audioPath })).rejects.toMatchObject({
      name: 'RateLimitError',
    });
  }, 15_000);

  it('throws APIError with status on non-200 response', async () => {
    // 5xx is retryable — mock same error for all 3 attempts (initial + 2 retries)
    const err500 = {
      ok: false,
      status: 500,
      headers: { get: () => null },
      text: async () => JSON.stringify({ error: { message: 'Internal Server Error' } }),
    };
    mockFetch.mockResolvedValue(err500);

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    await expect(transcribeWithGemini({ audioPath })).rejects.toMatchObject({
      name: 'APIError',
      message: expect.stringContaining('Internal Server Error'),
    });
  });

  it('throws APIError when prompt is blocked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () =>
        JSON.stringify({
          promptFeedback: { blockReason: 'SAFETY' },
          candidates: [],
        }),
    });

    const { transcribeWithGemini } = await import('../../../../src/audio/asr/gemini-asr');
    await expect(transcribeWithGemini({ audioPath })).rejects.toMatchObject({
      name: 'APIError',
      message: expect.stringContaining('prompt blocked'),
    });
  });

  describe('isGeminiAsrAvailable', () => {
    it('returns true when GOOGLE_API_KEY is set', async () => {
      process.env.GOOGLE_API_KEY = 'test-key';
      const { isGeminiAsrAvailable } = await import('../../../../src/audio/asr/gemini-asr');
      expect(isGeminiAsrAvailable()).toBe(true);
    });

    it('returns true when GEMINI_API_KEY is set', async () => {
      delete process.env.GOOGLE_API_KEY;
      process.env.GEMINI_API_KEY = 'test-gemini-key';
      const { isGeminiAsrAvailable } = await import('../../../../src/audio/asr/gemini-asr');
      expect(isGeminiAsrAvailable()).toBe(true);
    });

    it('returns false when neither key is set', async () => {
      delete process.env.GOOGLE_API_KEY;
      delete process.env.GEMINI_API_KEY;
      const { isGeminiAsrAvailable } = await import('../../../../src/audio/asr/gemini-asr');
      expect(isGeminiAsrAvailable()).toBe(false);
    });
  });
});
