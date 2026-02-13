import { z } from 'zod';
import { PROVIDER_ROUTING_POLICIES, type ProviderRoutingPolicy } from '../visuals/provider-router';

const ProviderRoutingPolicyEnum = z.enum(
  PROVIDER_ROUTING_POLICIES as unknown as [ProviderRoutingPolicy, ...ProviderRoutingPolicy[]]
);

const VisualsPolicyGatesSchema = z
  .object({
    enforce: z.boolean().default(false),
    maxFallbackRate: z.number().min(0).max(1).optional(),
    minProviderSuccessRate: z.number().min(0).max(1).optional(),
  })
  .strict()
  .default({ enforce: false });

const VisualsPolicyEvaluationSchema = z
  .object({
    adaptiveWindow: z.number().int().positive().default(200),
    minRecords: z.number().int().positive().default(20),
  })
  .strict()
  .default({ adaptiveWindow: 200, minRecords: 20 });

export const VisualsPolicySchema = z
  .object({
    providerChain: z.array(z.string()).min(1).optional(),
    routingPolicy: z.union([ProviderRoutingPolicyEnum, z.literal('adaptive')]).optional(),
    maxGenerationCostUsd: z.number().nonnegative().optional(),
    gates: VisualsPolicyGatesSchema.optional(),
    evaluation: VisualsPolicyEvaluationSchema.optional(),
  })
  .strict();

export const GenerationPolicySchema = z
  .object({
    schemaVersion: z.literal(1).default(1),
    visuals: VisualsPolicySchema.optional(),
  })
  .strict();

const LegacyGenerationPolicySchema = z
  .object({
    schemaVersion: z.literal('1.0.0'),
    visuals: VisualsPolicySchema.optional(),
  })
  .strict();

const GenerationPolicyInputSchema = z.union([GenerationPolicySchema, LegacyGenerationPolicySchema]);

export type VisualsPolicyGates = z.infer<typeof VisualsPolicyGatesSchema>;
export type VisualsPolicyEvaluation = z.infer<typeof VisualsPolicyEvaluationSchema>;
export type VisualsPolicy = z.infer<typeof VisualsPolicySchema>;
export type GenerationPolicy = z.infer<typeof GenerationPolicySchema>;

/**
 * Parse a generation policy file (current or legacy) and normalize it into the current schema.
 *
 * Supports:
 * - `schemaVersion: 1` (current)
 * - `schemaVersion: "1.0.0"` (legacy, normalized to `1`)
 */
export function safeParseGenerationPolicy(
  value: unknown
): z.SafeParseReturnType<unknown, GenerationPolicy> {
  const parsed = GenerationPolicyInputSchema.safeParse(value);
  if (!parsed.success) return parsed;
  if (parsed.data.schemaVersion === '1.0.0') {
    return {
      success: true,
      data: {
        schemaVersion: 1,
        visuals: parsed.data.visuals,
      },
    };
  }
  return {
    success: true,
    data: parsed.data,
  };
}
