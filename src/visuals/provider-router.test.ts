import { describe, expect, it } from 'vitest';
import { createProviderRoutingPlan, isProviderRoutingPolicy } from './provider-router';
import type { AssetProvider, AssetSearchOptions, VisualAssetResult } from './providers/types';

function provider(input: {
  name: string;
  assetType: 'video' | 'image';
  costPerAsset: number;
}): AssetProvider {
  return {
    name: input.name,
    assetType: input.assetType,
    costPerAsset: input.costPerAsset,
    requiresMotion: input.assetType === 'image',
    isAvailable: () => true,
    estimateCost: (count: number) => count * input.costPerAsset,
    async search(_options: AssetSearchOptions): Promise<VisualAssetResult[]> {
      return [];
    },
  };
}

describe('createProviderRoutingPlan', () => {
  it('validates routing policy identifiers', () => {
    expect(isProviderRoutingPolicy('balanced')).toBe(true);
    expect(isProviderRoutingPolicy('adaptive')).toBe(false);
    expect(isProviderRoutingPolicy(42)).toBe(false);
  });

  it('preserves order for configured policy', () => {
    const plan = createProviderRoutingPlan({
      providers: [
        provider({ name: 'nanobanana', assetType: 'image', costPerAsset: 0.04 }),
        provider({ name: 'pexels', assetType: 'video', costPerAsset: 0 }),
      ],
      policy: 'configured',
    });

    expect(plan.orderedProviders.map((p) => p.name)).toEqual(['nanobanana', 'pexels']);
    expect(plan.rationale).toContain('configured');
  });

  it('puts cheapest providers first for cost-first policy', () => {
    const plan = createProviderRoutingPlan({
      providers: [
        provider({ name: 'nanobanana', assetType: 'image', costPerAsset: 0.04 }),
        provider({ name: 'pexels', assetType: 'video', costPerAsset: 0 }),
        provider({ name: 'dalle', assetType: 'image', costPerAsset: 0.08 }),
      ],
      policy: 'cost-first',
    });

    expect(plan.orderedProviders.map((p) => p.name)).toEqual(['pexels', 'nanobanana', 'dalle']);
  });

  it('prefers video providers for quality-first policy', () => {
    const plan = createProviderRoutingPlan({
      providers: [
        provider({ name: 'nanobanana', assetType: 'image', costPerAsset: 0.04 }),
        provider({ name: 'local', assetType: 'video', costPerAsset: 0 }),
      ],
      policy: 'quality-first',
    });

    expect(plan.orderedProviders.map((p) => p.name)[0]).toBe('local');
  });

  it('filters image providers that exceed remaining generation budget', () => {
    const plan = createProviderRoutingPlan({
      providers: [
        provider({ name: 'nanobanana', assetType: 'image', costPerAsset: 0.04 }),
        provider({ name: 'pexels', assetType: 'video', costPerAsset: 0 }),
      ],
      policy: 'balanced',
      remainingGenerationBudgetUsd: 0.01,
    });

    expect(plan.orderedProviders.map((p) => p.name)).toEqual(['pexels']);
    expect(plan.skippedProviders).toHaveLength(1);
    expect(plan.skippedProviders[0]?.provider).toBe('nanobanana');
  });
});
