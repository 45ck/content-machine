import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SceneTimestamp } from '../../../src/audio/schema';

const chatMock = vi.fn();
const createLLMProviderMock = vi.fn(() => ({ chat: chatMock }));
const loadConfigMock = vi.fn();
const loggerMock = {
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
};
const createLoggerMock = vi.fn(() => loggerMock);

vi.mock('../../../src/core/llm/index.js', () => ({
  createLLMProvider: createLLMProviderMock,
}));

vi.mock('../../../src/core/config.js', () => ({
  loadConfig: loadConfigMock,
}));

vi.mock('../../../src/core/logger.js', () => ({
  createLogger: createLoggerMock,
}));

function baseScenes(): SceneTimestamp[] {
  return [
    {
      sceneId: 'scene-1',
      audioStart: 0,
      audioEnd: 2,
      words: [{ word: 'Hello', start: 0, end: 1, confidence: 0.9 }],
    },
    {
      sceneId: 'scene-2',
      audioStart: 2,
      audioEnd: 4,
      words: [{ word: 'World', start: 2, end: 3, confidence: 0.9 }],
    },
  ];
}

describe('extractKeywords', () => {
  beforeEach(() => {
    chatMock.mockReset();
    createLLMProviderMock.mockClear();
    loadConfigMock.mockResolvedValue({
      llm: { provider: 'mock', model: 'mock-model' },
    });
    loggerMock.debug.mockClear();
    loggerMock.warn.mockClear();
    loggerMock.error.mockClear();
    loggerMock.info.mockClear();
  });

  it('returns empty list for empty scenes', async () => {
    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const result = await extractKeywords({ scenes: [] });

    expect(result).toEqual([]);
    expect(chatMock).not.toHaveBeenCalled();
  });

  it('accepts array payloads from the LLM', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify([
        { sceneIndex: 0, keyword: 'coffee shop' },
        { sceneIndex: 1, keyword: 'city skyline' },
      ]),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const result = await extractKeywords({ scenes: baseScenes() });

    expect(result).toHaveLength(2);
    expect(result[0].keyword).toBe('coffee shop');
    expect(result[1].sectionId).toBe('scene-2');
  });

  it('unwraps result/data wrappers and fills missing scenes', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify({
        result: [{ sceneIndex: 0, keyword: 'laptop typing' }],
      }),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const result = await extractKeywords({ scenes: baseScenes() });

    expect(result).toHaveLength(2);
    expect(result[0].keyword).toBe('laptop typing');
    expect(result[1].keyword).toBe('abstract technology');
  });

  it('wraps single-object responses', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify({ sceneIndex: 0, keyword: 'sunrise' }),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const result = await extractKeywords({ scenes: baseScenes() });

    expect(result[0].keyword).toBe('sunrise');
    expect(result[1].keyword).toBe('abstract technology');
  });

  it('supports keywords and scenes wrappers', async () => {
    chatMock.mockResolvedValueOnce({
      content: JSON.stringify({
        keywords: [
          { sceneIndex: 0, keyword: 'studio lighting' },
          { sceneIndex: 1, keyword: 'city traffic' },
        ],
      }),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const keywordResult = await extractKeywords({ scenes: baseScenes() });
    expect(keywordResult[0].keyword).toBe('studio lighting');
    expect(keywordResult[1].keyword).toBe('city traffic');

    chatMock.mockResolvedValueOnce({
      content: JSON.stringify({
        scenes: [
          { sceneIndex: 0, keyword: 'coffee beans' },
          { sceneIndex: 1, keyword: 'typing hands' },
        ],
      }),
    });

    const sceneResult = await extractKeywords({ scenes: baseScenes() });
    expect(sceneResult[0].keyword).toBe('coffee beans');
    expect(sceneResult[1].keyword).toBe('typing hands');
  });

  it('uses data wrapper and preserves full scene count', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify({
        data: [
          { sceneIndex: 0, keyword: 'neon city' },
          { sceneIndex: 1, keyword: 'typing laptop' },
        ],
      }),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const result = await extractKeywords({ scenes: baseScenes() });

    expect(result).toHaveLength(2);
    expect(result[0].keyword).toBe('neon city');
    expect(result[1].keyword).toBe('typing laptop');
  });

  it('fills invalid scene indexes with fallback timing', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify([{ sceneIndex: 5, keyword: 'unknown scene' }]),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const result = await extractKeywords({ scenes: baseScenes() });

    expect(result[0].sectionId).toBe('scene-5');
    expect(result[0].startTime).toBe(0);
    expect(result[0].endTime).toBe(5);
  });

  it('throws a clear APIError for invalid payloads', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify({ unexpected: 'format' }),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    await expect(extractKeywords({ scenes: baseScenes() })).rejects.toMatchObject({
      name: 'APIError',
      message: 'Unexpected keyword response format from LLM',
    });
  });

  it('rejects partial objects missing required fields', async () => {
    chatMock.mockResolvedValueOnce({
      content: JSON.stringify({ sceneIndex: 0 }),
    });
    const { extractKeywords } = await import('../../../src/visuals/keywords');
    await expect(extractKeywords({ scenes: baseScenes() })).rejects.toMatchObject({
      name: 'APIError',
    });

    chatMock.mockResolvedValueOnce({
      content: JSON.stringify({ keyword: 'missing index' }),
    });
    await expect(extractKeywords({ scenes: baseScenes() })).rejects.toMatchObject({
      name: 'APIError',
    });
  });

  it('does not fill when counts already match', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify([
        { sceneIndex: 0, keyword: 'first' },
        { sceneIndex: 1, keyword: 'second' },
      ]),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    const result = await extractKeywords({ scenes: baseScenes() });

    expect(result).toHaveLength(2);
    expect(result.find((entry) => entry.keyword === 'abstract technology')).toBeUndefined();
    expect(loggerMock.warn).not.toHaveBeenCalled();
  });

  it('wraps non-API errors into APIError', async () => {
    chatMock.mockResolvedValue({
      content: '{invalid-json',
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    await expect(extractKeywords({ scenes: baseScenes() })).rejects.toMatchObject({
      name: 'APIError',
      message: 'Failed to extract keywords from LLM response',
    });
  });

  it('rejects primitive JSON responses', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify('not an object'),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    await expect(extractKeywords({ scenes: baseScenes() })).rejects.toMatchObject({
      name: 'APIError',
      message: 'Unexpected keyword response format from LLM',
    });
  });

  it('sends a structured prompt and config to the LLM', async () => {
    chatMock.mockResolvedValue({
      content: JSON.stringify([
        { sceneIndex: 0, keyword: 'test keyword' },
        { sceneIndex: 1, keyword: 'test keyword 2' },
      ]),
    });

    const { extractKeywords } = await import('../../../src/visuals/keywords');
    await extractKeywords({ scenes: baseScenes() });

    expect(chatMock).toHaveBeenCalledWith(
      [
        { role: 'system', content: expect.stringContaining('visual search keyword expert') },
        {
          role: 'user',
          content: expect.stringContaining('[0]'),
        },
      ],
      expect.objectContaining({ jsonMode: true })
    );

    const userPrompt = chatMock.mock.calls[0][0][1]?.content ?? '';
    expect(userPrompt).toContain('Hello');
    expect(userPrompt).toContain('World');
    expect(userPrompt).toContain('"sceneIndex": 0');
    expect(userPrompt).toContain('"sceneIndex": 1');
  });
});
