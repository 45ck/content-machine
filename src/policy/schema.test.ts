import { describe, expect, it } from 'vitest';
import { GenerationPolicySchema, safeParseGenerationPolicy } from './schema';

describe('GenerationPolicySchema', () => {
  it('accepts adaptive visuals policy with gates', () => {
    const result = GenerationPolicySchema.safeParse({
      schemaVersion: 1,
      visuals: {
        providerChain: ['pexels', 'nanobanana'],
        routingPolicy: 'adaptive',
        maxGenerationCostUsd: 2,
        gates: {
          enforce: true,
          maxFallbackRate: 0.4,
          minProviderSuccessRate: 0.6,
        },
        evaluation: {
          adaptiveWindow: 100,
          minRecords: 10,
        },
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid gate ranges', () => {
    const result = GenerationPolicySchema.safeParse({
      schemaVersion: 1,
      visuals: {
        gates: {
          maxFallbackRate: 2,
        },
      },
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown policy keys to prevent silent typos', () => {
    const result = GenerationPolicySchema.safeParse({
      schemaVersion: 1,
      visuals: {
        routingPolicy: 'balanced',
        routngPolicy: 'cost-first',
      },
    });

    expect(result.success).toBe(false);
  });

  it('accepts legacy schemaVersion 1.0.0 and normalizes to 1', () => {
    const result = safeParseGenerationPolicy({
      schemaVersion: '1.0.0',
      visuals: {
        routingPolicy: 'adaptive',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.schemaVersion).toBe(1);
      expect(result.data.visuals?.routingPolicy).toBe('adaptive');
    }
  });
});
