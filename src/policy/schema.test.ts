import { describe, expect, it } from 'vitest';
import { GenerationPolicySchema } from './schema';

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
});
