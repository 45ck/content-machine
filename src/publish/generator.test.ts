import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScriptOutput } from '../domain';
import { FakeLLMProvider } from '../test/stubs/fake-llm';

describe('generatePublish', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock('../core/llm');
    vi.unmock('../core/config');
  });

  it('generates deterministic publish output without LLM', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      title: 'Redis caching',
      hook: 'Stop doing this',
      cta: 'Follow for more',
      hashtags: ['#redis', '#backend'],
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const out = await generatePublish({ script, mode: 'deterministic', platform: 'tiktok' });
    expect(out.title).toBe('Redis caching');
    expect(out.hashtags).toEqual(['#redis', '#backend']);
    expect(out.checklist.length).toBeGreaterThan(0);
  });

  it('generates publish output in LLM mode with a fake provider', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      title: 'Redis caching',
      hook: 'Stop doing this',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const llm = new FakeLLMProvider();
    llm.queueResponse({
      content: JSON.stringify({
        description: 'Short description',
        hashtags: ['#redis'],
        checklist: [{ id: 'x', label: 'y', required: true }],
      }),
      model: 'fake',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    const out = await generatePublish({
      script,
      mode: 'llm',
      llmProvider: llm,
      platform: 'tiktok',
    });
    expect(out.description).toBe('Short description');
    expect(out.hashtags).toEqual(['#redis']);
  });

  it('uses packaging title + cover text when script title is missing', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const out = await generatePublish({
      script,
      mode: 'deterministic',
      packaging: { selected: { title: 'Packaged title', coverText: 'Cover text' } } as any,
    });

    expect(out.title).toBe('Packaged title');
    expect(out.coverText).toBe('Cover text');
  });

  it('defaults to "Untitled" when no title is provided', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const out = await generatePublish({ script, mode: 'deterministic' });
    expect(out.title).toBe('Untitled');
  });

  it('throws SchemaError when deterministic output fails validation', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      title: '',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    await expect(generatePublish({ script, mode: 'deterministic' })).rejects.toMatchObject({
      code: 'SCHEMA_ERROR',
    });
  });

  it('falls back to deterministic checklist when LLM response does not include one', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      title: 'Redis caching',
      hook: 'Stop doing this',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const llm = new FakeLLMProvider();
    llm.queueResponse({
      content: JSON.stringify({
        description: 'Short description',
        hashtags: ['#redis'],
      }),
      model: 'fake',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    const out = await generatePublish({
      script,
      mode: 'llm',
      llmProvider: llm,
    });

    expect(out.checklist.length).toBeGreaterThan(0);
    expect(out.checklist.some((item) => item.id === 'render-quality')).toBe(true);
  });

  it('defaults checklist required=true when LLM omits it', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      title: 'Redis caching',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const llm = new FakeLLMProvider();
    llm.queueResponse({
      content: JSON.stringify({
        description: 'Short description',
        checklist: [{ id: 'x', label: 'y' }],
      }),
      model: 'fake',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    const out = await generatePublish({
      script,
      mode: 'llm',
      llmProvider: llm,
      platform: 'tiktok',
    });

    expect(out.checklist[0]?.required).toBe(true);
  });

  it('throws SchemaError when LLM returns invalid JSON', async () => {
    const { generatePublish } = await import('./generator');
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      title: 'Redis caching',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const llm = new FakeLLMProvider();
    llm.queueResponse({
      content: 'not-json',
      model: 'fake',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    await expect(generatePublish({ script, mode: 'llm', llmProvider: llm })).rejects.toMatchObject({
      code: 'SCHEMA_ERROR',
    });
  });

  it('uses createLLMProvider when llmProvider is not supplied', async () => {
    const script: ScriptOutput = {
      schemaVersion: '1.0.0',
      scenes: [{ id: 'scene-001', text: 'Hello', visualDirection: 'text' }],
      reasoning: 'n/a',
      title: 'Redis caching',
      meta: {
        archetype: 'listicle',
        topic: 'redis',
        generatedAt: new Date().toISOString(),
      },
    };

    const llm = new FakeLLMProvider();
    llm.queueResponse({
      content: JSON.stringify({
        description: 'Short description',
        checklist: [{ id: 'x', label: 'y', required: true }],
      }),
      model: undefined,
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    const createLLMProviderMock = vi.fn(() => llm);
    const calculateLLMCostMock = vi.fn(() => 0.123);

    vi.doMock('../core/llm', () => ({
      createLLMProvider: createLLMProviderMock,
      calculateLLMCost: calculateLLMCostMock,
    }));
    vi.doMock('../core/config', () => ({
      loadConfig: async () =>
        ({
          llm: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.2 },
        }) as any,
    }));

    const { generatePublish } = await import('./generator');
    const out = await generatePublish({ script, mode: 'llm' });

    expect(createLLMProviderMock).toHaveBeenCalledWith('openai', 'gpt-4o-mini');
    expect(out.description).toBe('Short description');
    expect(out.platform).toBe('tiktok');
    expect(out.meta?.llmCost).toBeCloseTo(0.123, 5);
  });
});
