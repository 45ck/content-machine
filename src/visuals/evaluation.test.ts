import { describe, expect, it } from 'vitest';
import { recommendRoutingPolicy } from './evaluation';

function record(input: {
  sceneCount: number;
  fallbacks: number;
  totalGenerationCostUsd: number;
  attempts: number;
  successes: number;
}) {
  return {
    schemaVersion: 1 as const,
    recordedAt: new Date().toISOString(),
    routingPolicy: 'balanced' as const,
    providerChain: ['pexels'],
    sceneCount: input.sceneCount,
    fromGenerated: 0,
    fallbacks: input.fallbacks,
    totalGenerationCostUsd: input.totalGenerationCostUsd,
    providerSummary: [
      {
        provider: 'pexels',
        attempts: input.attempts,
        successes: input.successes,
        failures: Math.max(0, input.attempts - input.successes),
        avgLatencyMs: 10,
      },
    ],
    skippedProviders: [],
  };
}

describe('recommendRoutingPolicy', () => {
  it('returns null when not enough records', () => {
    const recommendation = recommendRoutingPolicy({
      records: [
        record({
          sceneCount: 10,
          fallbacks: 1,
          totalGenerationCostUsd: 0.1,
          attempts: 10,
          successes: 9,
        }),
      ],
      minRecords: 5,
    });

    expect(recommendation).toBeNull();
  });

  it('recommends quality-first on low success/high fallback', () => {
    const records = Array.from({ length: 10 }, () =>
      record({
        sceneCount: 10,
        fallbacks: 5,
        totalGenerationCostUsd: 0.1,
        attempts: 10,
        successes: 4,
      })
    );
    const recommendation = recommendRoutingPolicy({ records, minRecords: 5 });

    expect(recommendation?.policy).toBe('quality-first');
  });

  it('recommends cost-first on high cost trend with stable success', () => {
    const records = Array.from({ length: 10 }, () =>
      record({
        sceneCount: 10,
        fallbacks: 1,
        totalGenerationCostUsd: 1,
        attempts: 10,
        successes: 9,
      })
    );
    const recommendation = recommendRoutingPolicy({ records, minRecords: 5 });

    expect(recommendation?.policy).toBe('cost-first');
  });
});
