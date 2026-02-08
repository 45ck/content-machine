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

async function matchSceneWithProviders(params: {
  sceneQuery: SceneQuery;
  providers: AssetProvider[];
  orientation: 'portrait' | 'landscape' | 'square';
  motionStrategy: MotionStrategyType;
  log: ReturnType<typeof createLogger>;
}): Promise<VideoMatchResult> {
  const { sceneQuery, providers, orientation, motionStrategy, log } = params;
  const duration = sceneQuery.endTime - sceneQuery.startTime;

  // 1) Try provider chain with the intended query.
  for (const provider of providers) {
    const query = queryForProvider(sceneQuery, provider);
    try {
      const results = await provider.search({ query, orientation, perPage: 5 });
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
          },
        },
        isFallback: false,
      };
    } catch (error) {
      log.warn(
        { provider: provider.name, query: sceneQuery.stockQuery, error },
        'Provider search failed'
      );
      continue;
    }
  }

  // 2) Try generic fallback queries on the provider chain.
  for (const provider of providers) {
    const query = fallbackQueryForProvider(provider);
    try {
      const results = await provider.search({ query, orientation, perPage: 3 });
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
          },
        },
        isFallback: true,
      };
    } catch (error) {
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
      },
    },
    isFallback: true,
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

function assertMotionStrategySupportedForProviders(params: {
  hasImageProvider: boolean;
  motionStrategy: MotionStrategyType;
  providerChain: AssetProviderName[];
}): void {
  const { hasImageProvider, motionStrategy, providerChain } = params;
  if (!hasImageProvider) return;

  if (motionStrategy === 'kenburns' || motionStrategy === 'none') return;

  throw new CMError(
    'UNSUPPORTED_OPTION',
    `Motion strategy "${motionStrategy}" is not supported for image providers yet`,
    {
      motionStrategy,
      providers: providerChain,
      fix: 'Use --motion-strategy kenburns (or none). depthflow/veo require additional integrations.',
    }
  );
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
  visualsConfig: unknown;
  providerChain: AssetProviderName[];
  log: ReturnType<typeof createLogger>;
}): void {
  const { hasImageProvider, providers, sceneCount, visualsConfig, providerChain, log } = params;
  if (!hasImageProvider) return;

  const estimatedWorstCase = Math.max(
    ...providers.filter((p) => p.assetType === 'image').map((p) => p.estimateCost(sceneCount)),
    0
  );
  const maxCost =
    ((visualsConfig as any).maxGenerationCostUsd as number | undefined) ??
    ((visualsConfig as any).maxGenerationCost as number | undefined);
  const warnAt =
    ((visualsConfig as any).warnAtGenerationCostUsd as number | undefined) ??
    ((visualsConfig as any).warnAtCost as number | undefined);

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

  const motionStrategy: MotionStrategyType =
    options.motionStrategy ?? (visualsConfig.motionStrategy as MotionStrategyType);
  const generationConcurrency = (visualsConfig as any).generationConcurrency ?? 2;

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

  assertMotionStrategySupportedForProviders({
    hasImageProvider,
    motionStrategy,
    providerChain: uniqueProviderChain,
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
    visualsConfig,
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
          return { asset, isFallback: mapped.startsWith('#') };
        }

        log.warn(
          { sceneId: sceneQuery.sceneId, mapped, resolved },
          'Local manifest mapped path does not exist; falling back to provider chain'
        );
      }

      return matchSceneWithProviders({ sceneQuery, providers, orientation, motionStrategy, log });
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
    keywords: keywordsForOutput,
    totalDuration: options.timestamps.totalDuration,
    ...(gameplayClip ? { gameplayClip } : {}),
  };

  const validated = VisualsOutputSchema.parse(output);
  log.info(
    { assetCount: validated.scenes.length, fallbacks: validated.fallbacks },
    'Visual matching complete'
  );
  emit({ phase: 'complete', progress: 1, message: 'Visual matching complete' });

  return validated;
}
