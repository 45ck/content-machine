import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SceneTimestamp } from '../../../src/audio/schema';

const chatMock = vi.fn();
const createLLMProviderMock = vi.fn(() => ({ chat: chatMock }));
const loadConfigMock = vi.fn();

vi.mock('../../../src/core/llm/index.js', () => ({
  createLLMProvider: createLLMProviderMock,
}));

vi.mock('../../../src/core/config.js', () => ({
  loadConfig: loadConfigMock,
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
});
