import type { VisualsRoutingTelemetryRecord } from './observability';
import type { ProviderRoutingPolicy } from './provider-router';

export interface RoutingEvaluationInput {
  records: VisualsRoutingTelemetryRecord[];
  minRecords: number;
}

export interface RoutingRecommendation {
  policy: ProviderRoutingPolicy;
  confidence: number;
  reason: string;
  metrics: {
    records: number;
    sceneCount: number;
    fallbackRate: number;
    generatedCostPerSceneUsd: number;
    providerSuccessRate: number;
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

/**
 * Recommend a provider routing policy from historical visuals telemetry.
 */
export function recommendRoutingPolicy(
  input: RoutingEvaluationInput
): RoutingRecommendation | null {
  const records = input.records;
  if (records.length < input.minRecords) return null;

  const sceneCount = records.reduce((sum, record) => sum + record.sceneCount, 0);
  const fallbacks = records.reduce((sum, record) => sum + record.fallbacks, 0);
  const generationCostUsd = records.reduce((sum, record) => sum + record.totalGenerationCostUsd, 0);

  let attempts = 0;
  let successes = 0;
  for (const record of records) {
    for (const provider of record.providerSummary) {
      attempts += provider.attempts;
      successes += provider.successes;
    }
  }

  const fallbackRate = sceneCount > 0 ? fallbacks / sceneCount : 1;
  const generatedCostPerSceneUsd = sceneCount > 0 ? generationCostUsd / sceneCount : 0;
  const providerSuccessRate = attempts > 0 ? successes / attempts : 0;

  let policy: ProviderRoutingPolicy = 'balanced';
  let reason = 'Balanced default from telemetry trends';

  if (providerSuccessRate < 0.6 || fallbackRate > 0.35) {
    policy = 'quality-first';
    reason = 'High fallback rate or low provider success rate';
  } else if (generatedCostPerSceneUsd > 0.05) {
    policy = 'cost-first';
    reason = 'Generation cost per scene trending high';
  }

  const confidence = clamp01(records.length / Math.max(input.minRecords * 2, 1));

  return {
    policy,
    confidence,
    reason,
    metrics: {
      records: records.length,
      sceneCount,
      fallbackRate,
      generatedCostPerSceneUsd,
      providerSuccessRate,
    },
  };
}
