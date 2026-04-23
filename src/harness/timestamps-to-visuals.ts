import { resolve } from 'node:path';
import { z } from 'zod';
import { TimestampsOutputSchema, VisualsOutputSchema } from '../domain';
import {
  MOTION_STRATEGIES,
  SUPPORTED_VISUALS_PROVIDER_IDS,
  type RepoFactsMotionStrategyId,
} from '../domain/repo-facts.generated';
import { OrientationEnum } from '../core/config';
import { PROVIDER_ROUTING_POLICIES, type ProviderRoutingPolicy } from '../visuals/provider-router';
import { matchVisuals } from '../visuals/matcher';
import { readJsonArtifact, writeJsonArtifact } from './artifacts';
import { artifactFile, type HarnessToolResult } from './json-stdio';
import type { AssetProviderName } from '../visuals/providers';

const assetProviderNames = [...SUPPORTED_VISUALS_PROVIDER_IDS, 'dalle', 'unsplash', 'mock'];
const routingPolicies = [...PROVIDER_ROUTING_POLICIES, 'adaptive'];
const motionStrategyIds = MOTION_STRATEGIES.map((strategy) => strategy.id);

const AssetProviderEnum = z.enum(assetProviderNames as [AssetProviderName, ...AssetProviderName[]]);
const MotionStrategyEnum = z.enum(
  motionStrategyIds as [RepoFactsMotionStrategyId, ...RepoFactsMotionStrategyId[]]
);
const RoutingPolicyEnum = z.enum(
  routingPolicies as [(typeof routingPolicies)[number], ...(typeof routingPolicies)[number][]]
);

export const TimestampsToVisualsRequestSchema = z
  .object({
    timestampsPath: z.string().min(1),
    outputPath: z.string().min(1).default('output/harness/visuals/visuals.json'),
    provider: AssetProviderEnum.optional(),
    providers: z.array(AssetProviderEnum).min(1).optional(),
    localDir: z.string().min(1).optional(),
    localManifest: z.string().min(1).optional(),
    orientation: OrientationEnum.default('portrait'),
    routingPolicy: RoutingPolicyEnum.optional(),
    maxGenerationCostUsd: z.number().nonnegative().optional(),
    mock: z.boolean().default(false),
    motionStrategy: MotionStrategyEnum.optional(),
    topic: z.string().min(1).optional(),
    gameplay: z
      .object({
        library: z.string().min(1).optional(),
        style: z.string().min(1).optional(),
        clip: z.string().min(1).optional(),
        required: z.boolean().default(false),
      })
      .optional(),
  })
  .strict();

export type TimestampsToVisualsRequest = z.input<typeof TimestampsToVisualsRequestSchema>;

/** Generate a visuals artifact from an existing timestamps artifact. */
export async function runTimestampsToVisuals(request: TimestampsToVisualsRequest): Promise<
  HarnessToolResult<{
    outputPath: string;
    sceneCount: number;
    fallbacks: number;
    fromStock: number;
    fromGenerated: number;
    fromUserFootage: number;
    gameplayClip: string | null;
  }>
> {
  const normalized = TimestampsToVisualsRequestSchema.parse(request);
  const timestamps = await readJsonArtifact(
    normalized.timestampsPath,
    TimestampsOutputSchema,
    'timestamps artifact'
  );
  const outputPath = resolve(normalized.outputPath);
  const providerChain = normalized.providers?.length
    ? normalized.providers
    : normalized.provider
      ? [normalized.provider]
      : undefined;

  const visuals = VisualsOutputSchema.parse(
    await matchVisuals({
      timestamps,
      provider: providerChain?.[0],
      providers: providerChain,
      localDir: normalized.localDir ? resolve(normalized.localDir) : undefined,
      localManifest: normalized.localManifest ? resolve(normalized.localManifest) : undefined,
      orientation: normalized.orientation,
      routingPolicy: normalized.routingPolicy as ProviderRoutingPolicy | 'adaptive' | undefined,
      maxGenerationCostUsd: normalized.maxGenerationCostUsd,
      topic: normalized.topic,
      mock: normalized.mock,
      motionStrategy: normalized.motionStrategy,
      gameplay: normalized.gameplay,
    })
  );

  await writeJsonArtifact(outputPath, visuals);

  return {
    result: {
      outputPath,
      sceneCount: visuals.scenes.length,
      fallbacks: visuals.fallbacks,
      fromStock: visuals.fromStock,
      fromGenerated: visuals.fromGenerated,
      fromUserFootage: visuals.fromUserFootage,
      gameplayClip: visuals.gameplayClip?.path ?? null,
    },
    artifacts: [artifactFile(outputPath, 'Generated visuals artifact')],
  };
}
