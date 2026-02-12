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
  .default({ enforce: false });

const VisualsPolicyEvaluationSchema = z
  .object({
    adaptiveWindow: z.number().int().positive().default(200),
    minRecords: z.number().int().positive().default(20),
  })
  .default({ adaptiveWindow: 200, minRecords: 20 });

export const VisualsPolicySchema = z.object({
  providerChain: z.array(z.string()).min(1).optional(),
  routingPolicy: z.union([ProviderRoutingPolicyEnum, z.literal('adaptive')]).optional(),
  maxGenerationCostUsd: z.number().nonnegative().optional(),
  gates: VisualsPolicyGatesSchema.optional(),
  evaluation: VisualsPolicyEvaluationSchema.optional(),
});

export const GenerationPolicySchema = z.object({
  schemaVersion: z.literal(1).default(1),
  visuals: VisualsPolicySchema.optional(),
});

export type VisualsPolicyGates = z.infer<typeof VisualsPolicyGatesSchema>;
export type VisualsPolicyEvaluation = z.infer<typeof VisualsPolicyEvaluationSchema>;
export type VisualsPolicy = z.infer<typeof VisualsPolicySchema>;
export type GenerationPolicy = z.infer<typeof GenerationPolicySchema>;
