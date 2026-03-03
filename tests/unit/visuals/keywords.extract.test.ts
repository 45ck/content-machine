import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SceneTimestamp } from '../../../src/audio/schema.js';
import { ConfigSchema, type Config } from '../../../src/core/config.js';
import type { LLMProvider } from '../../../src/core/llm/provider.js';
import { FakeLLMProvider } from '../../../src/test/stubs/fake-llm.js';

vi.mock('../../../src/core/llm/index.js', () => ({
  createLLMProvider: vi.fn(),
}));

function makeConfig(overrides: Partial<Config> = {}): Config {
  return ConfigSchema.parse({
    llm: { provider: 'openai', model: 'gpt-4o' },
    visuals: { provider: 'pexels' },
    ...overrides,
  });
}

function makeScene(params: {
  sceneId: string;
  audioStart: number;
  audioEnd: number;
  words: string[];
}): SceneTimestamp {
  return {
    sceneId: params.sceneId,
    audioStart: params.audioStart,
    audioEnd: params.audioEnd,
    words: params.words.map((word, i) => ({ word, start: i, end: i + 0.1 })),
  };
}

async function configureFakeLlm(fake: FakeLLMProvider): Promise<void> {
  const { createLLMProvider } = await import('../../../src/core/llm/index.js');
  (createLLMProvider as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    fake as unknown as LLMProvider
  );
}

describe('extractKeywords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns [] and does not call LLM for empty scenes', async () => {
    const fake = new FakeLLMProvider();
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const keywords = await extractKeywords({ scenes: [], config: makeConfig() });

    expect(keywords).toEqual([]);
    expect(fake.getCalls()).toHaveLength(0);
  });

  it('maps an array response to keywords with timing + sectionId', async () => {
    const fake = new FakeLLMProvider();
    fake.queueJsonResponse([
      { sceneIndex: 0, keyword: 'laptop typing' },
      { sceneIndex: 1, keyword: 'coffee shop' },
    ]);
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({ sceneId: 's1', audioStart: 0, audioEnd: 2.5, words: ['hello'] }),
      makeScene({ sceneId: 's2', audioStart: 2.5, audioEnd: 5, words: ['world'] }),
    ];

    const keywords = await extractKeywords({ scenes, config: makeConfig() });

    expect(keywords).toHaveLength(2);
    expect(keywords[0]).toMatchObject({
      keyword: 'laptop typing',
      sectionId: 's1',
      startTime: 0,
      endTime: 2.5,
    });
    expect(keywords[1]).toMatchObject({
      keyword: 'coffee shop',
      sectionId: 's2',
      startTime: 2.5,
      endTime: 5,
    });
  });

  it('accepts a keywords-wrapped response object', async () => {
    const fake = new FakeLLMProvider();
    fake.queueJsonResponse({
      keywords: [{ sceneIndex: 0, keyword: 'city skyline' }],
    });
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({ sceneId: 'intro', audioStart: 0, audioEnd: 1, words: ['intro'] }),
    ];
    const keywords = await extractKeywords({ scenes, config: makeConfig() });

    expect(keywords).toHaveLength(1);
    expect(keywords[0]).toMatchObject({
      keyword: 'city skyline',
      sectionId: 'intro',
      startTime: 0,
      endTime: 1,
    });
  });

  it('accepts a single-object response by wrapping into an array', async () => {
    const fake = new FakeLLMProvider();
    fake.queueJsonResponse({ sceneIndex: 0, keyword: 'robot face' });
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({ sceneId: 's', audioStart: 1, audioEnd: 2, words: ['ai'] }),
    ];
    const keywords = await extractKeywords({ scenes, config: makeConfig() });

    expect(keywords).toHaveLength(1);
    expect(keywords[0].keyword).toBe('robot face');
  });

  it('fills missing scenes with fallback keywords (stopwords + numeric filtering)', async () => {
    const fake = new FakeLLMProvider();
    fake.queueJsonResponse([{ sceneIndex: 0, keyword: 'custom keyword' }]);
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({ sceneId: 's1', audioStart: 0, audioEnd: 1, words: ['first'] }),
      // Stopwords should be removed so fallback starts with "cat runs" not "the cat"
      makeScene({
        sceneId: 's2',
        audioStart: 1,
        audioEnd: 2,
        words: ['the', 'cat', 'runs', '2024'],
      }),
    ];

    const keywords = await extractKeywords({ scenes, config: makeConfig() });

    expect(keywords).toHaveLength(2);
    expect(keywords[0].keyword).toBe('custom keyword');
    expect(keywords[1]).toMatchObject({
      keyword: 'cat runs',
      sectionId: 's2',
      startTime: 1,
      endTime: 2,
    });
  });

  it('uses heuristic fallbacks for common non-visual topics', async () => {
    const fake = new FakeLLMProvider();
    fake.queueJsonResponse([]);
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({
        sceneId: 'redis',
        audioStart: 0,
        audioEnd: 1,
        words: ['redis', 'database', 'cache'],
      }),
      makeScene({ sceneId: 'ai', audioStart: 1, audioEnd: 2, words: ['ai', 'llm', 'openai'] }),
    ];

    const keywords = await extractKeywords({ scenes, config: makeConfig() });

    expect(keywords).toHaveLength(2);
    expect(keywords[0].keyword).toBe('coding laptop');
    expect(keywords[1].keyword).toBe('robot face');
  });

  it('maps invalid sceneIndex to a safe default timing + section id', async () => {
    const fake = new FakeLLMProvider();
    fake.queueJsonResponse([{ sceneIndex: 99, keyword: 'oops' }]);
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({ sceneId: 's1', audioStart: 0, audioEnd: 1, words: ['x'] }),
    ];
    const keywords = await extractKeywords({ scenes, config: makeConfig() });

    expect(keywords).toHaveLength(1);
    expect(keywords[0]).toMatchObject({
      keyword: 'oops',
      sectionId: 'scene-99',
      startTime: 0,
      endTime: 5,
    });
  });

  it('throws a helpful error on invalid JSON content', async () => {
    const fake = new FakeLLMProvider();
    fake.queueResponse({
      content: 'not-json',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({ sceneId: 's1', audioStart: 0, audioEnd: 1, words: ['x'] }),
    ];

    await expect(extractKeywords({ scenes, config: makeConfig() })).rejects.toMatchObject({
      name: 'APIError',
      message: 'Failed to extract keywords from LLM response',
    });
  });

  it('throws a helpful error on unexpected response format', async () => {
    const fake = new FakeLLMProvider();
    fake.queueJsonResponse({ foo: 'bar' });
    await configureFakeLlm(fake);

    const { extractKeywords } = await import('../../../src/visuals/keywords.js');

    const scenes: SceneTimestamp[] = [
      makeScene({ sceneId: 's1', audioStart: 0, audioEnd: 1, words: ['x'] }),
    ];

    await expect(extractKeywords({ scenes, config: makeConfig() })).rejects.toMatchObject({
      name: 'APIError',
      message: 'Unexpected keyword response format from LLM',
    });
  });
});
