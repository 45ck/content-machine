/**
 * Visual Matcher
 *
 * Matches script scenes to stock footage using keywords and LLM extraction.
 * Refactored to use Strategy pattern for providers and extracted modules.
 *
 * Based on SYSTEM-DESIGN §7.3 cm visuals command.
 */

import type { TimestampsOutput } from '../audio/schema.js';
import { createLogger } from '../core/logger.js';
import { CMError } from '../core/errors.js';
import {
  VisualsOutput,
  VisualsOutputSchema,
  VisualAssetInput,
  Keyword,
  PolicyGateResult,
  VISUALS_SCHEMA_VERSION,
  type MotionStrategyType,
  type VisualSource,
} from './schema.js';
import { extractKeywords, generateMockKeywords } from './keywords.js';
import {
  createAssetProvider,
  type AssetProvider,
  type AssetProviderName,
} from './providers/index.js';
import { createProviderRoutingPlan, type ProviderRoutingPolicy } from './provider-router.js';
import {
  isVisualObservabilityEnabled,
  readVisualsRoutingTelemetry,
  writeVisualAssetLineage,
  writeVisualsRoutingTelemetry,
  type ProviderAttemptTelemetry,
  type VisualAssetLineageRecord,
} from './observability.js';
import { recommendRoutingPolicy } from './evaluation.js';
import { selectGameplayClip } from './gameplay.js';
import { loadConfig } from '../core/config.js';
import { readFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, resolve } from 'node:path';
import { existsSync } from 'node:fs';

export type { VisualsOutput, VisualAsset } from './schema.js';
export type { VideoClip } from './schema.js'; // Deprecated re-export

export interface MatchVisualsOptions {
  timestamps: TimestampsOutput;
  provider?: AssetProviderName;
  /** Provider chain (primary first). If set, overrides provider + config fallbacks. */
  providers?: AssetProviderName[];
  /** Directory for the local provider (bring your own assets). */
  localDir?: string;
  /** Optional manifest JSON mapping `sceneId -> assetPath` for deterministic BYO visuals. */
  localManifest?: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  routingPolicy?: ProviderRoutingPolicy;
  maxGenerationCostUsd?: number;
  routingAdaptiveWindow?: number;
  routingAdaptiveMinRecords?: number;
  policyGates?: {
    enforce?: boolean;
    maxFallbackRate?: number;
    minProviderSuccessRate?: number;
  };
  pipelineId?: string;
  topic?: string;
  mock?: boolean;
  motionStrategy?: MotionStrategyType;
  gameplay?: {
    library?: string;
    style?: string;
    clip?: string;
    required?: boolean;
  };
  onProgress?: (event: VisualsProgressEvent) => void;
}

export interface VisualsProgressEvent {
  phase: 'mock' | 'keywords' | 'provider:search' | 'complete';
  progress: number;
  message?: string;
  completed?: number;
  total?: number;
}

interface VideoMatchResult {
  asset: VisualAssetInput;
  isFallback: boolean;
  attempts: ProviderAttemptTelemetry[];
  skippedProviders: Array<{ provider: string; reason: string }>;
}

interface SceneQuery {
  sceneId: string;
  stockQuery: string;
  /** For AI image providers; can be longer/more descriptive than stockQuery. */
  generationPrompt?: string;
  startTime: number;
  endTime: number;
}

function toVisualSource(provider: AssetProvider, resultType: 'video' | 'image'): VisualSource {
  if (provider.name === 'pexels') return 'stock-pexels';
  if (provider.name === 'pixabay') return 'stock-pixabay';
  if (provider.name === 'local') return 'user-footage';
  if (provider.name === 'localimage') return 'user-footage';
  if (provider.name === 'nanobanana') return 'generated-nanobanana';
  if (provider.name === 'dalle') return 'generated-dalle';
  if (provider.name === 'unsplash') return 'stock-unsplash';
  if (provider.name === 'mock') return 'mock';

  // Best-effort defaults to keep schema valid.
  return resultType === 'image' ? 'generated-nanobanana' : 'stock-pexels';
}

/**
 * Match a single scene to a visual asset using a provider chain.
 */
function queryForProvider(sceneQuery: SceneQuery, provider: AssetProvider): string {
  return provider.assetType === 'image'
    ? (sceneQuery.generationPrompt ?? sceneQuery.stockQuery)
    : sceneQuery.stockQuery;
}

function fallbackQueryForProvider(provider: AssetProvider): string {
  return provider.assetType === 'image'
    ? 'abstract cinematic background, no text'
    : 'abstract motion background';
}

// eslint-disable-next-line sonarjs/cognitive-complexity
async function matchSceneWithProviders(params: {
  sceneQuery: SceneQuery;
  providers: AssetProvider[];
  orientation: 'portrait' | 'landscape' | 'square';
  motionStrategy: MotionStrategyType;
  routingPolicy: ProviderRoutingPolicy;
  remainingGenerationBudgetUsd?: number;
  log: ReturnType<typeof createLogger>;
}): Promise<VideoMatchResult> {
  const {
    sceneQuery,
    providers,
    orientation,
    motionStrategy,
    routingPolicy,
    remainingGenerationBudgetUsd,
    log,
  } = params;
  const duration = sceneQuery.endTime - sceneQuery.startTime;
  const providerAttempts: string[] = [];
  const attempts: ProviderAttemptTelemetry[] = [];
  const routingPlan = createProviderRoutingPlan({
    providers,
    policy: routingPolicy,
    remainingGenerationBudgetUsd,
  });
  const routedProviders = routingPlan.orderedProviders;

  // 1) Try provider chain with the intended query.
  for (const provider of routedProviders) {
    const query = queryForProvider(sceneQuery, provider);
    providerAttempts.push(`${provider.name}:primary`);
    const started = Date.now();
    try {
      const results = await provider.search({ query, orientation, perPage: 5 });
      attempts.push({
        provider: provider.name,
        phase: 'primary',
        success: results.length > 0,
        durationMs: Date.now() - started,
      });
      if (!results.length) continue;

      const assetResult = results[0];
      const cacheHit =
        assetResult.type === 'image' ? Boolean(assetResult.metadata?.cacheHit) : false;
      const source = toVisualSource(provider, assetResult.type);

      return {
        asset: {
          sceneId: sceneQuery.sceneId,
          source,
          assetPath: assetResult.url,
          duration,
          assetType: assetResult.type,
          ...(assetResult.type === 'image'
            ? {
                motionStrategy,
                motionApplied: false,
                generationPrompt:
                  (assetResult.metadata?.prompt as string | undefined) ??
                  sceneQuery.generationPrompt ??
                  sceneQuery.stockQuery,
                generationModel: (assetResult.metadata?.model as string | undefined) ?? undefined,
                generationCost: cacheHit ? 0 : provider.costPerAsset,
              }
            : { motionStrategy: 'none' as const, motionApplied: false }),
          matchReasoning: {
            reasoning: `Found ${assetResult.type} from "${provider.name}" for "${sceneQuery.stockQuery}"`,
            conceptsMatched: [sceneQuery.stockQuery],
            selectedProvider: provider.name,
            providerAttempts,
            routingPolicy,
            routingRationale: routingPlan.rationale,
            skippedProviders: routingPlan.skippedProviders,
          },
        },
        isFallback: false,
        attempts,
        skippedProviders: routingPlan.skippedProviders,
      };
    } catch (error) {
      attempts.push({
        provider: provider.name,
        phase: 'primary',
        success: false,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });
      log.warn(
        { provider: provider.name, query: sceneQuery.stockQuery, error },
        'Provider search failed'
      );
      continue;
    }
  }

  // 2) Try generic fallback queries on the provider chain.
  for (const provider of routedProviders) {
    const query = fallbackQueryForProvider(provider);
    providerAttempts.push(`${provider.name}:fallback`);
    const started = Date.now();
    try {
      const results = await provider.search({ query, orientation, perPage: 3 });
      attempts.push({
        provider: provider.name,
        phase: 'fallback',
        success: results.length > 0,
        durationMs: Date.now() - started,
      });
      if (!results.length) continue;

      const assetResult = results[0];
      const cacheHit =
        assetResult.type === 'image' ? Boolean(assetResult.metadata?.cacheHit) : false;
      const source = toVisualSource(provider, assetResult.type);
      return {
        asset: {
          sceneId: sceneQuery.sceneId,
          source,
          assetPath: assetResult.url,
          duration,
          assetType: assetResult.type,
          ...(assetResult.type === 'image'
            ? {
                motionStrategy,
                motionApplied: false,
                generationPrompt: (assetResult.metadata?.prompt as string | undefined) ?? query,
                generationModel: (assetResult.metadata?.model as string | undefined) ?? undefined,
                generationCost: cacheHit ? 0 : provider.costPerAsset,
              }
            : { motionStrategy: 'none' as const, motionApplied: false }),
          matchReasoning: {
            reasoning: `Fallback query used after providers failed for "${sceneQuery.stockQuery}"`,
            conceptsMatched:
              assetResult.type === 'image'
                ? ['abstract', 'cinematic', 'background']
                : ['abstract', 'motion', 'background'],
            selectedProvider: provider.name,
            providerAttempts,
            routingPolicy,
            routingRationale: routingPlan.rationale,
            skippedProviders: routingPlan.skippedProviders,
          },
        },
        isFallback: true,
        attempts,
        skippedProviders: routingPlan.skippedProviders,
      };
    } catch (error) {
      attempts.push({
        provider: provider.name,
        phase: 'fallback',
        success: false,
        durationMs: Date.now() - started,
        error: error instanceof Error ? error.message : String(error),
      });
      log.debug({ provider: provider.name, error }, 'Fallback search failed');
      continue;
    }
  }

  // 3) Ultimate fallback: solid color
  return {
    asset: {
      sceneId: sceneQuery.sceneId,
      source: 'fallback-color',
      assetPath: '#1a1a2e',
      duration,
      assetType: 'video',
      motionStrategy: 'none',
      motionApplied: false,
      matchReasoning: {
        reasoning: `No asset found for "${sceneQuery.stockQuery}", using solid color fallback`,
        providerAttempts,
        routingPolicy,
        routingRationale: routingPlan.rationale,
        skippedProviders: routingPlan.skippedProviders,
      },
    },
    isFallback: true,
    attempts,
    skippedProviders: routingPlan.skippedProviders,
  };
}

/**
 * Safe progress emission wrapper
 */
function createProgressEmitter(
  onProgress: ((event: VisualsProgressEvent) => void) | undefined,
  log: ReturnType<typeof createLogger>
) {
  return (event: VisualsProgressEvent): void => {
    try {
      onProgress?.({
        ...event,
        progress: Math.min(1, Math.max(0, event.progress)),
      });
    } catch (error) {
      log.debug({ error }, 'Visuals progress callback failed');
    }
  };
}

async function mapWithConcurrency<T, R>(params: {
  items: T[];
  concurrency: number;
  fn: (item: T, index: number) => Promise<R>;
  onProgress?: (completed: number, total: number) => void;
}): Promise<R[]> {
  const { items, concurrency, fn, onProgress } = params;
  const total = items.length;
  if (total === 0) return [];

  const results: R[] = new Array(total);
  let nextIndex = 0;
  let completed = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = nextIndex;
      nextIndex++;
      if (index >= total) return;

      results[index] = await fn(items[index], index);
      completed++;
      onProgress?.(completed, total);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, total) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Generate mock visuals for testing
 */
function generateMockVisuals(options: MatchVisualsOptions): VisualsOutput {
  const scenes = options.timestamps.scenes ?? [];
  const keywords = generateMockKeywords(scenes);
  const palette = ['#0b1020', '#111827', '#0f172a', '#1f2937', '#111111'];

  const visualAssets: VisualAssetInput[] = scenes.map((scene, index) => ({
    sceneId: scene.sceneId,
    source: 'fallback-color' as const,
    assetPath: palette[index % palette.length],
    duration: scene.audioEnd - scene.audioStart,
    matchReasoning: {
      reasoning: `Mock fallback color for scene ${scene.sceneId}`,
      conceptsMatched: ['mock', 'test'],
    },
  }));

  return VisualsOutputSchema.parse({
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: 0,
    fromStock: 0,
    fallbacks: visualAssets.length,
    keywords,
    totalDuration: options.timestamps.totalDuration,
  });
}

function resolveVisualsConfig(params: {
  localDir?: string | null;
  localManifest?: string | null;
}): ReturnType<typeof loadConfig>['visuals'] {
  const { localDir, localManifest } = params;
  const config = loadConfig();
  if (!localDir && !localManifest) return config.visuals;

  return {
    ...config.visuals,
    local: {
      ...(config.visuals as any).local,
      ...(localDir ? { dir: localDir } : {}),
      ...(localManifest ? { manifest: localManifest } : {}),
    },
  } as typeof config.visuals;
}

function resolveProviderChain(params: {
  providerName: string;
  providers?: AssetProviderName[] | undefined;
  visualsConfig: unknown;
}): AssetProviderName[] {
  const { providerName, providers, visualsConfig } = params;
  const configuredFallbacks =
    ((visualsConfig as any).fallbackProviders as AssetProviderName[] | undefined) ?? [];
  const providerChain: AssetProviderName[] = providers?.length
    ? providers
    : [providerName as AssetProviderName, ...configuredFallbacks];
  const uniqueProviderChain = Array.from(
    new Set(providerChain.filter(Boolean) as AssetProviderName[])
  );
  if (uniqueProviderChain.length === 0) uniqueProviderChain.push('pexels');
  return uniqueProviderChain;
}

async function resolveKeywords(params: {
  hasVideoProvider: boolean;
  scenes: NonNullable<TimestampsOutput['scenes']>[number][];
  config: ReturnType<typeof loadConfig>;
  log: ReturnType<typeof createLogger>;
}): Promise<Keyword[]> {
  const { hasVideoProvider, scenes, config, log } = params;
  if (!hasVideoProvider) return [];

  try {
    return await extractKeywords({ scenes, config });
  } catch (error) {
    log.warn({ error }, 'Keyword extraction failed; falling back to naive per-scene keywords');
    return scenes.map((scene) => {
      const raw = scene.words
        .map((w) => w.word)
        .join(' ')
        .trim();
      const hint = raw.split(/\s+/).slice(0, 4).join(' ');
      return {
        keyword: hint || 'abstract background',
        sectionId: scene.sceneId,
        startTime: scene.audioStart,
        endTime: scene.audioEnd,
      };
    });
  }
}

function buildSceneQueries(params: {
  scenes: NonNullable<TimestampsOutput['scenes']>[number][];
  hasImageProvider: boolean;
  hasVideoProvider: boolean;
  keywords: Keyword[];
}): { sceneQueries: SceneQuery[]; keywordsForOutput: Keyword[] } {
  const { scenes, hasImageProvider, hasVideoProvider, keywords } = params;

  const keywordByScene = new Map<string, string>(keywords.map((k) => [k.sectionId, k.keyword]));
  const sceneQueries: SceneQuery[] = scenes.map((scene) => {
    const text = scene.words
      .map((w) => w.word)
      .join(' ')
      .trim();
    const generationPrompt = hasImageProvider
      ? text || 'abstract cinematic background, no text'
      : undefined;

    const stockQuery = hasVideoProvider
      ? (keywordByScene.get(scene.sceneId) ?? 'abstract motion background')
      : generationPrompt
        ? generationPrompt.split(/\s+/).slice(0, 6).join(' ')
        : 'abstract background';

    return {
      sceneId: scene.sceneId,
      stockQuery,
      generationPrompt,
      startTime: scene.audioStart,
      endTime: scene.audioEnd,
    };
  });

  const keywordsForOutput: Keyword[] = sceneQueries.map((q) => ({
    keyword: q.stockQuery,
    sectionId: q.sceneId,
    startTime: q.startTime,
    endTime: q.endTime,
  }));

  return { sceneQueries, keywordsForOutput };
}

function enforceGenerationCostBudget(params: {
  hasImageProvider: boolean;
  providers: AssetProvider[];
  sceneCount: number;
  maxGenerationCostUsd?: number;
  warnAtGenerationCostUsd?: number;
  providerChain: AssetProviderName[];
  log: ReturnType<typeof createLogger>;
}): void {
  const {
    hasImageProvider,
    providers,
    sceneCount,
    maxGenerationCostUsd,
    warnAtGenerationCostUsd,
    providerChain,
    log,
  } = params;
  if (!hasImageProvider) return;

  const estimatedWorstCase = Math.max(
    ...providers.filter((p) => p.assetType === 'image').map((p) => p.estimateCost(sceneCount)),
    0
  );
  const maxCost = maxGenerationCostUsd;
  const warnAt = warnAtGenerationCostUsd;

  if (typeof warnAt === 'number' && estimatedWorstCase > warnAt) {
    log.warn(
      { estimatedWorstCaseUsd: estimatedWorstCase, warnAtUsd: warnAt, scenes: sceneCount },
      'Estimated worst-case generation cost exceeds warning threshold'
    );
  }

  if (typeof maxCost === 'number' && estimatedWorstCase > maxCost) {
    throw new CMError(
      'COST_LIMIT',
      `Estimated worst-case generation cost $${estimatedWorstCase.toFixed(2)} exceeds max $${maxCost.toFixed(2)}`,
      {
        providers: providerChain,
        estimatedWorstCaseUsd: estimatedWorstCase,
        maxGenerationCostUsd: maxCost,
        scenes: sceneCount,
        fix: 'Reduce scene count, disable AI fallback, or raise visuals.max_generation_cost(_usd) in config.',
      }
    );
  }
}

function getConfiguredGenerationBudgetUsd(visualsConfig: unknown): number | undefined {
  return (
    ((visualsConfig as any).maxGenerationCostUsd as number | undefined) ??
    ((visualsConfig as any).maxGenerationCost as number | undefined)
  );
}

async function resolveEffectiveRoutingPolicy(params: {
  requestedPolicy: ProviderRoutingPolicy | 'adaptive';
  adaptiveWindow: number;
  adaptiveMinRecords: number;
  log: ReturnType<typeof createLogger>;
}): Promise<ProviderRoutingPolicy> {
  const { requestedPolicy, adaptiveWindow, adaptiveMinRecords, log } = params;
  if (requestedPolicy !== 'adaptive') return requestedPolicy;

  try {
    const telemetry = await readVisualsRoutingTelemetry();
    const recent = telemetry.slice(-adaptiveWindow);
    const recommendation = recommendRoutingPolicy({
      records: recent,
      minRecords: adaptiveMinRecords,
    });
    if (!recommendation) {
      log.info(
        { adaptiveWindow, adaptiveMinRecords, recentRecords: recent.length },
        'Adaptive routing has insufficient telemetry; using balanced policy'
      );
      return 'balanced';
    }
    log.info(
      {
        policy: recommendation.policy,
        confidence: recommendation.confidence,
        reason: recommendation.reason,
      },
      'Adaptive routing policy selected from telemetry'
    );
    return recommendation.policy;
  } catch (error) {
    log.warn({ error }, 'Adaptive routing evaluation failed; using balanced policy');
    return 'balanced';
  }
}

function resolveEffectiveConcurrency(params: {
  configuredConcurrency: number;
  hasImageProvider: boolean;
  maxGenerationCostUsd?: number;
  log: ReturnType<typeof createLogger>;
}): number {
  const { configuredConcurrency, hasImageProvider, maxGenerationCostUsd, log } = params;
  if (!hasImageProvider) return configuredConcurrency;
  if (typeof maxGenerationCostUsd !== 'number') return configuredConcurrency;
  if (configuredConcurrency <= 1) return configuredConcurrency;

  log.warn(
    {
      configuredConcurrency,
      enforcedConcurrency: 1,
      maxGenerationCostUsd,
    },
    'Using sequential generation to enforce hard generation budget deterministically'
  );
  return 1;
}

function summarizeMatchedAssets(params: { matchResults: VideoMatchResult[] }): {
  visualAssets: VisualAssetInput[];
  fallbacks: number;
  fromStock: number;
  fromGenerated: number;
  fromUserFootage: number;
  totalGenerationCost: number;
} {
  const { matchResults } = params;
  const visualAssets: VisualAssetInput[] = matchResults.map((r) => r.asset);
  const fallbacks = matchResults.filter((r) => r.isFallback).length;

  const fromStock = visualAssets.filter(
    (a) => a.source === 'stock-pexels' || a.source === 'stock-pixabay'
  ).length;
  const fromGenerated = visualAssets.filter(
    (a) => a.source === 'generated-nanobanana' || a.source === 'generated-dalle'
  ).length;
  const fromUserFootage = visualAssets.filter((a) => a.source === 'user-footage').length;
  const totalGenerationCost = visualAssets.reduce((sum, asset) => {
    if (typeof asset.generationCost === 'number') return sum + asset.generationCost;
    return sum;
  }, 0);

  return {
    visualAssets,
    fallbacks,
    fromStock,
    fromGenerated,
    fromUserFootage,
    totalGenerationCost,
  };
}

function extractAssetLineageRecords(params: {
  matchResults: VideoMatchResult[];
  routingPolicy: ProviderRoutingPolicy;
  pipelineId?: string;
  topic?: string;
}): VisualAssetLineageRecord[] {
  const { matchResults, routingPolicy, pipelineId, topic } = params;
  return matchResults.map((result) => {
    const asset = result.asset;
    const matchReasoning = asset.matchReasoning;
    return {
      schemaVersion: 1,
      recordedAt: new Date().toISOString(),
      pipelineId,
      topic,
      sceneId: asset.sceneId,
      assetPath: asset.assetPath,
      source: asset.source,
      assetType: asset.assetType ?? 'video',
      selectedProvider: matchReasoning?.selectedProvider,
      routingPolicy,
      generationModel: asset.generationModel,
      generationPrompt: asset.generationPrompt,
      generationCostUsd: asset.generationCost,
      isFallback: result.isFallback,
    };
  });
}

type LocalManifest = Record<string, string>;

function inferAssetTypeFromPath(path: string): 'image' | 'video' {
  const ext = extname(path).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) return 'image';
  return 'video';
}

function isRemoteUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

async function loadLocalManifest(params: {
  manifestPath: string;
  log: ReturnType<typeof createLogger>;
}): Promise<{ manifest: LocalManifest; baseDir: string } | null> {
  const { manifestPath, log } = params;
  const resolved = resolve(manifestPath);
  if (!existsSync(resolved)) {
    log.warn({ manifestPath: resolved }, 'Local manifest path does not exist; ignoring');
    return null;
  }

  try {
    const raw = await readFile(resolved, 'utf8');
    const json = JSON.parse(raw) as unknown;
    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      log.warn({ manifestPath: resolved }, 'Local manifest must be a JSON object; ignoring');
      return null;
    }
    return { manifest: json as LocalManifest, baseDir: dirname(resolved) };
  } catch (error) {
    log.warn({ manifestPath: resolved, error }, 'Failed to read/parse local manifest; ignoring');
    return null;
  }
}

/**
 * Match stock footage to script scenes
 *
 * Main orchestrator that uses Strategy pattern for providers.
 */
// eslint-disable-next-line max-lines-per-function, complexity, sonarjs/cognitive-complexity
export async function matchVisuals(options: MatchVisualsOptions): Promise<VisualsOutput> {
  const providerName = options.mock ? 'mock' : (options.provider ?? 'pexels');
  const log = createLogger({ module: 'visuals', provider: providerName });
  const orientation = options.orientation ?? 'portrait';
  const emit = createProgressEmitter(options.onProgress, log);
  const gameplay = options.gameplay;
  const config = loadConfig();
  const visualsConfig = resolveVisualsConfig({
    localDir: options.localDir,
    localManifest: options.localManifest,
  });
  const requestedRoutingPolicy: ProviderRoutingPolicy | 'adaptive' =
    options.routingPolicy ??
    ((visualsConfig as any).routingPolicy as ProviderRoutingPolicy | undefined) ??
    'configured';
  const routingPolicy = await resolveEffectiveRoutingPolicy({
    requestedPolicy: requestedRoutingPolicy,
    adaptiveWindow: options.routingAdaptiveWindow ?? 200,
    adaptiveMinRecords: options.routingAdaptiveMinRecords ?? 20,
    log,
  });

  const motionStrategy: MotionStrategyType =
    options.motionStrategy ?? (visualsConfig.motionStrategy as MotionStrategyType);
  const configuredGenerationConcurrency = (visualsConfig as any).generationConcurrency ?? 2;

  const gameplayClip = gameplay
    ? await selectGameplayClip({
        library: gameplay.library,
        style: gameplay.style,
        clip: gameplay.clip,
        targetDuration: options.timestamps.totalDuration,
        strict: Boolean(gameplay.required) && !options.mock,
      })
    : null;

  log.info(
    {
      sceneCount: options.timestamps.scenes?.length ?? 0,
      duration: options.timestamps.totalDuration,
      mock: options.mock,
      gameplay: gameplayClip ? { path: gameplayClip.path, style: gameplayClip.style } : null,
    },
    'Starting visual matching'
  );

  // Fast path for mock mode
  if (options.mock) {
    emit({ phase: 'mock', progress: 1, message: 'Mock visuals generated' });
    log.info(
      { assetCount: options.timestamps.scenes?.length ?? 0 },
      'Mock visual matching complete'
    );
    const output = generateMockVisuals(options);
    return VisualsOutputSchema.parse({
      ...output,
      ...(gameplayClip ? { gameplayClip } : {}),
    });
  }

  const uniqueProviderChain = resolveProviderChain({
    providerName,
    providers: options.providers,
    visualsConfig,
  });

  // Create the asset providers (Strategy pattern, supports hybrid chain)
  const providersAll = uniqueProviderChain.map((name) =>
    createAssetProvider(name, { visuals: visualsConfig as any })
  );
  const providers = providersAll.filter((p) => {
    try {
      const ok = p.isAvailable();
      if (!ok) log.warn({ provider: p.name }, 'Provider unavailable; skipping');
      return ok;
    } catch (error) {
      log.warn({ provider: p.name, error }, 'Provider availability check failed; skipping');
      return false;
    }
  });
  const scenes = options.timestamps.scenes ?? [];

  const hasImageProvider = providers.some((p) => p.assetType === 'image');
  const hasVideoProvider = providers.some((p) => p.assetType === 'video');

  if (hasImageProvider && motionStrategy !== 'none' && motionStrategy !== 'kenburns') {
    log.info(
      {
        motionStrategy,
        providers: uniqueProviderChain,
      },
      'Advanced motion strategy selected for image assets; media stage synthesis will resolve motion'
    );
  }
  const maxGenerationCostUsd = getConfiguredGenerationBudgetUsd(visualsConfig);
  const effectiveMaxGenerationCostUsd = options.maxGenerationCostUsd ?? maxGenerationCostUsd;
  const warnAtGenerationCostUsd =
    ((visualsConfig as any).warnAtGenerationCostUsd as number | undefined) ??
    ((visualsConfig as any).warnAtCost as number | undefined);
  const generationConcurrency = resolveEffectiveConcurrency({
    configuredConcurrency: configuredGenerationConcurrency,
    hasImageProvider,
    maxGenerationCostUsd: effectiveMaxGenerationCostUsd,
    log,
  });

  // Build per-scene queries:
  // - stockQuery comes from keyword extraction (if any video provider exists)
  // - generationPrompt uses full scene text (if any image provider exists)
  const keywords = await resolveKeywords({ hasVideoProvider, scenes, config, log });
  const { sceneQueries, keywordsForOutput } = buildSceneQueries({
    scenes,
    hasImageProvider,
    hasVideoProvider,
    keywords,
  });

  enforceGenerationCostBudget({
    hasImageProvider,
    providers,
    sceneCount: sceneQueries.length,
    maxGenerationCostUsd: effectiveMaxGenerationCostUsd,
    warnAtGenerationCostUsd,
    providerChain: uniqueProviderChain,
    log,
  });

  log.info(
    { keywordCount: keywordsForOutput.length, providers: uniqueProviderChain },
    'Scene queries prepared'
  );
  emit({
    phase: 'keywords',
    progress: 0,
    message: `Prepared ${keywordsForOutput.length} scene queries`,
    completed: 0,
    total: keywordsForOutput.length,
  });

  const manifestPath = (visualsConfig as any)?.local?.manifest as string | undefined;
  const manifestLoaded = manifestPath ? await loadLocalManifest({ manifestPath, log }) : null;
  let remainingGenerationBudgetUsd = effectiveMaxGenerationCostUsd;

  const matchResults = await mapWithConcurrency({
    items: sceneQueries,
    concurrency: generationConcurrency,
    fn: async (sceneQuery) => {
      // Deterministic BYO mapping wins (sceneId -> assetPath).
      const mapped = manifestLoaded?.manifest?.[sceneQuery.sceneId];
      if (mapped && typeof mapped === 'string') {
        const baseDir = manifestLoaded?.baseDir ?? process.cwd();
        const resolved = isAbsolute(mapped) ? mapped : resolve(baseDir, mapped);
        if (mapped.startsWith('#') || isRemoteUrl(mapped) || existsSync(resolved)) {
          const duration = sceneQuery.endTime - sceneQuery.startTime;
          const assetType = mapped.startsWith('#')
            ? 'video'
            : inferAssetTypeFromPath(isRemoteUrl(mapped) ? mapped : resolved);
          const asset: VisualAssetInput = {
            sceneId: sceneQuery.sceneId,
            source: mapped.startsWith('#')
              ? ('fallback-color' as const)
              : ('user-footage' as const),
            assetPath: mapped.startsWith('#') ? mapped : isRemoteUrl(mapped) ? mapped : resolved,
            duration,
            assetType,
            ...(assetType === 'image'
              ? { motionStrategy, motionApplied: false, generationCost: 0 }
              : { motionStrategy: 'none', motionApplied: false }),
            matchReasoning: {
              reasoning: `Mapped from local manifest (${manifestPath ?? 'manifest'})`,
              conceptsMatched: ['manifest'],
            },
          };
          return {
            asset,
            isFallback: mapped.startsWith('#'),
            attempts: [],
            skippedProviders: [],
          };
        }

        log.warn(
          { sceneId: sceneQuery.sceneId, mapped, resolved },
          'Local manifest mapped path does not exist; falling back to provider chain'
        );
      }

      const result = await matchSceneWithProviders({
        sceneQuery,
        providers,
        orientation,
        motionStrategy,
        routingPolicy,
        remainingGenerationBudgetUsd,
        log,
      });
      if (
        typeof remainingGenerationBudgetUsd === 'number' &&
        typeof result.asset.generationCost === 'number'
      ) {
        remainingGenerationBudgetUsd = Math.max(
          0,
          remainingGenerationBudgetUsd - result.asset.generationCost
        );
      }
      return result;
    },
    onProgress: (completed, total) => {
      emit({
        phase: 'provider:search',
        progress: total > 0 ? completed / total : 1,
        message: `Matched ${completed}/${total}`,
        completed,
        total,
      });
    },
  });

  const {
    visualAssets,
    fallbacks,
    fromStock,
    fromGenerated,
    fromUserFootage,
    totalGenerationCost,
  } = summarizeMatchedAssets({ matchResults });
  const gateResults: PolicyGateResult[] = [];
  const providerAttempts = matchResults.flatMap((result) => result.attempts);
  const skippedProviders = Array.from(
    new Map(
      matchResults
        .flatMap((result) => result.skippedProviders)
        .map((item) => [`${item.provider}:${item.reason}`, item])
    ).values()
  );
  const totalAssets = visualAssets.length;
  const fallbackRate = totalAssets > 0 ? fallbacks / totalAssets : 0;
  const providerAttemptCount = providerAttempts.length;
  const providerSuccessCount = providerAttempts.filter((attempt) => attempt.success).length;
  const providerSuccessRate =
    providerAttemptCount > 0 ? providerSuccessCount / providerAttemptCount : 1;
  const configuredGates = options.policyGates;

  if (typeof configuredGates?.maxFallbackRate === 'number') {
    const pass = fallbackRate <= configuredGates.maxFallbackRate;
    gateResults.push({
      id: 'visuals.max-fallback-rate',
      stage: 'post',
      status: pass ? 'pass' : 'fail',
      message: pass ? 'Fallback rate within threshold' : 'Fallback rate exceeds threshold',
      metric: fallbackRate,
      threshold: configuredGates.maxFallbackRate,
    });
  }

  if (typeof configuredGates?.minProviderSuccessRate === 'number') {
    const pass = providerSuccessRate >= configuredGates.minProviderSuccessRate;
    gateResults.push({
      id: 'visuals.min-provider-success-rate',
      stage: 'post',
      status: pass ? 'pass' : 'fail',
      message: pass
        ? 'Provider success rate meets threshold'
        : 'Provider success rate below threshold',
      metric: providerSuccessRate,
      threshold: configuredGates.minProviderSuccessRate,
    });
  }

  if (isVisualObservabilityEnabled()) {
    try {
      await writeVisualsRoutingTelemetry({
        pipelineId: options.pipelineId,
        topic: options.topic,
        routingPolicy,
        providerChain: uniqueProviderChain,
        sceneCount: sceneQueries.length,
        fromGenerated,
        fallbacks,
        totalGenerationCostUsd: totalGenerationCost,
        providerAttempts,
        skippedProviders,
      });
    } catch (error) {
      log.warn({ error }, 'Failed to persist visuals routing telemetry');
    }

    try {
      const lineageRecords = extractAssetLineageRecords({
        matchResults,
        routingPolicy,
        pipelineId: options.pipelineId,
        topic: options.topic,
      });
      await writeVisualAssetLineage({ records: lineageRecords });
    } catch (error) {
      log.warn({ error }, 'Failed to persist visual asset lineage records');
    }
  }

  const output = {
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage,
    fromStock,
    fallbacks,
    fromGenerated,
    totalGenerationCost,
    motionStrategy,
    providerRoutingPolicy: routingPolicy,
    providerChain: uniqueProviderChain,
    policyGates: gateResults,
    keywords: keywordsForOutput,
    totalDuration: options.timestamps.totalDuration,
    ...(gameplayClip ? { gameplayClip } : {}),
  };

  const validated = VisualsOutputSchema.parse(output);
  if (configuredGates?.enforce) {
    const failedGates = gateResults.filter((gate) => gate.status === 'fail');
    if (failedGates.length > 0) {
      throw new CMError('POLICY_GATE_FAILED', 'Visuals policy gate failure', {
        failedGates,
        fix: 'Loosen policy thresholds, improve provider chain quality, or disable enforce mode',
      });
    }
  }
  log.info(
    { assetCount: validated.scenes.length, fallbacks: validated.fallbacks },
    'Visual matching complete'
  );
  emit({ phase: 'complete', progress: 1, message: 'Visual matching complete' });

  return validated;
}
