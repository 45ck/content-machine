/**
 * @file Unit tests for LLM cost calculation
 */
import { describe, it, expect } from 'vitest';
import { calculateLLMCost, getModelCost, hasKnownPricing } from './costs.js';

describe('calculateLLMCost', () => {
  it('calculates cost for known OpenAI models', () => {
    // gpt-4o: $5 per 1M tokens
    expect(calculateLLMCost(1_000_000, 'gpt-4o')).toBe(5);
    expect(calculateLLMCost(500_000, 'gpt-4o')).toBe(2.5);

    // gpt-4o-mini: $0.15 per 1M tokens
    expect(calculateLLMCost(1_000_000, 'gpt-4o-mini')).toBe(0.15);
  });

  it('calculates cost for known Anthropic models', () => {
    // claude-3-5-sonnet: $3 per 1M tokens
    expect(calculateLLMCost(1_000_000, 'claude-3-5-sonnet-20241022')).toBe(3);

    // claude-3-haiku: $0.25 per 1M tokens
    expect(calculateLLMCost(1_000_000, 'claude-3-haiku-20240307')).toBe(0.25);
  });

  it('uses default cost for unknown models', () => {
    // Default: $5 per 1M tokens
    expect(calculateLLMCost(1_000_000, 'unknown-model')).toBe(5);
    expect(calculateLLMCost(1_000_000, 'my-custom-llm')).toBe(5);
  });

  it('returns 0 for 0 tokens', () => {
    expect(calculateLLMCost(0, 'gpt-4o')).toBe(0);
  });

  it('handles small token counts', () => {
    // 1000 tokens of gpt-4o: $0.005
    expect(calculateLLMCost(1000, 'gpt-4o')).toBeCloseTo(0.005, 6);
  });
});

describe('getModelCost', () => {
  it('returns cost per 1M tokens for known models', () => {
    expect(getModelCost('gpt-4o')).toBe(5);
    expect(getModelCost('gpt-4o-mini')).toBe(0.15);
    expect(getModelCost('claude-3-5-sonnet-20241022')).toBe(3);
  });

  it('returns default cost for unknown models', () => {
    expect(getModelCost('unknown')).toBe(5);
  });
});

describe('hasKnownPricing', () => {
  it('returns true for known models', () => {
    expect(hasKnownPricing('gpt-4o')).toBe(true);
    expect(hasKnownPricing('claude-3-haiku-20240307')).toBe(true);
  });

  it('returns false for unknown models', () => {
    expect(hasKnownPricing('unknown-model')).toBe(false);
    expect(hasKnownPricing('')).toBe(false);
  });
});
