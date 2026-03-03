import type { AssetProvider } from './providers/types.js';

export const PROVIDER_ROUTING_POLICIES = [
  'configured',
  'balanced',
  'cost-first',
  'quality-first',
] as const;

export type ProviderRoutingPolicy = (typeof PROVIDER_ROUTING_POLICIES)[number];

/**
 * Type guard for valid provider routing policy identifiers.
 */
export function isProviderRoutingPolicy(value: unknown): value is ProviderRoutingPolicy {
  return (
    typeof value === 'string' && (PROVIDER_ROUTING_POLICIES as readonly string[]).includes(value)
  );
}

export interface ProviderRoutingPlan {
  orderedProviders: AssetProvider[];
  skippedProviders: Array<{ provider: string; reason: string }>;
  rationale: string;
}

const QUALITY_HINTS: Record<string, number> = {
  pexels: 90,
  pixabay: 80,
  local: 75,
  localimage: 75,
  nanobanana: 70,
  dalle: 75,
  unsplash: 65,
  mock: 10,
};

function qualityScore(provider: AssetProvider): number {
  const score = QUALITY_HINTS[provider.name];
  return typeof score === 'number' ? score : 50;
}

function compareByPolicy(
  a: AssetProvider,
  b: AssetProvider,
  policy: ProviderRoutingPolicy
): number {
  if (policy === 'configured') return 0;

  if (policy === 'cost-first') {
    if (a.costPerAsset !== b.costPerAsset) return a.costPerAsset - b.costPerAsset;
    if (a.assetType !== b.assetType) return a.assetType === 'video' ? -1 : 1;
    return qualityScore(b) - qualityScore(a);
  }

  if (policy === 'quality-first') {
    if (a.assetType !== b.assetType) return a.assetType === 'video' ? -1 : 1;
    if (qualityScore(a) !== qualityScore(b)) return qualityScore(b) - qualityScore(a);
    return a.costPerAsset - b.costPerAsset;
  }

  // balanced
  if (a.assetType !== b.assetType) return a.assetType === 'video' ? -1 : 1;
  if (a.costPerAsset !== b.costPerAsset) return a.costPerAsset - b.costPerAsset;
  return qualityScore(b) - qualityScore(a);
}

/**
 * Create an ordered provider plan from policy and budget constraints.
 */
export function createProviderRoutingPlan(params: {
  providers: AssetProvider[];
  policy: ProviderRoutingPolicy;
  remainingGenerationBudgetUsd?: number;
}): ProviderRoutingPlan {
  const { providers, policy, remainingGenerationBudgetUsd } = params;
  const withIndex = providers.map((provider, index) => ({ provider, index }));

  const skippedProviders: Array<{ provider: string; reason: string }> = [];
  const allowed = withIndex.filter(({ provider }) => {
    if (
      typeof remainingGenerationBudgetUsd === 'number' &&
      provider.assetType === 'image' &&
      provider.costPerAsset > remainingGenerationBudgetUsd
    ) {
      skippedProviders.push({
        provider: provider.name,
        reason: `cost $${provider.costPerAsset.toFixed(2)} exceeds remaining budget $${remainingGenerationBudgetUsd.toFixed(2)}`,
      });
      return false;
    }
    return true;
  });

  const sorted = [...allowed].sort((a, b) => {
    const byPolicy = compareByPolicy(a.provider, b.provider, policy);
    if (byPolicy !== 0) return byPolicy;
    return a.index - b.index;
  });

  const orderedProviders = sorted.map((item) => item.provider);
  const rationale =
    policy === 'configured'
      ? 'Using configured provider order'
      : `Applied ${policy} routing policy`;

  return {
    orderedProviders,
    skippedProviders,
    rationale,
  };
}
