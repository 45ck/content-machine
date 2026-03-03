/**
 * Package Generator Tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FakeLLMProvider } from '../test/stubs';
import { SchemaError } from '../core/errors';

// Mock config module before other imports
vi.mock('../core/config', async () => {
  const { z } = await import('zod');
  return {
    loadConfig: vi.fn().mockResolvedValue({
      llm: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
      },
    }),
    ArchetypeEnum: z.string().min(1),
  };
});

// Mock the LLM factory to prevent loading OpenAI when llmProvider is omitted
vi.mock('../core/llm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../core/llm')>();
  return {
    createLLMProvider: vi.fn(),
    calculateLLMCost: actual.calculateLLMCost,
  };
});

import { generatePackage } from './generator';

describe('Package Generator', () => {
  let fakeLLM: FakeLLMProvider;

  beforeEach(() => {
    fakeLLM = new FakeLLMProvider();
  });

  it('should generate variants and select the best one', async () => {
    fakeLLM.queueJsonResponse({
      variants: [
        {
          title: 'Redis vs Postgres: caching speed explained in 60 seconds',
          coverText: 'Redis vs Postgres',
          onScreenHook: 'Caching mistake?',
        },
        {
          title: 'Which is better for caching: Redis or PostgreSQL? (Do this)',
          coverText: 'Redis or Postgres?',
          onScreenHook: 'This changes everything',
        },
        {
          title:
            'Redis vs PostgreSQL for caching: a detailed, comprehensive technical comparison you must watch',
          coverText: 'Redis vs PostgreSQL for caching',
          onScreenHook: 'Don’t miss this',
        },
      ],
    });

    const result = await generatePackage({
      topic: 'Redis vs PostgreSQL for caching',
      platform: 'tiktok',
      variants: 3,
      llmProvider: fakeLLM,
    });

    expect(result.variants).toHaveLength(3);
    expect(result.selectedIndex).toBeGreaterThanOrEqual(0);
    expect(result.selected).toEqual(result.variants[result.selectedIndex]);
    expect(result.topic).toBe('Redis vs PostgreSQL for caching');
  });

  it('should throw SchemaError on invalid JSON', async () => {
    fakeLLM.queueResponse({
      content: 'this is not json',
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
    });

    await expect(
      generatePackage({
        topic: 'test',
        platform: 'tiktok',
        variants: 3,
        llmProvider: fakeLLM,
      })
    ).rejects.toBeInstanceOf(SchemaError);
  });
});
