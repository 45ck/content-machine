import { describe, expect, it } from 'vitest';
import { generatePublish } from './generator';
import type { ScriptOutput } from '../script/schema';
import { FakeLLMProvider } from '../test/stubs/fake-llm';

describe('generatePublish', () => {
  it('generates deterministic publish output without LLM', async () => {
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

    const out = await generatePublish({ script, mode: 'llm', llmProvider: llm, platform: 'tiktok' });
    expect(out.description).toBe('Short description');
    expect(out.hashtags).toEqual(['#redis']);
  });
});

