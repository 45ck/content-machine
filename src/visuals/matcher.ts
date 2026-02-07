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
import { NotFoundError } from '../core/errors.js';
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

export type { VisualsOutput, VisualAsset } from './schema.js';
export type { VideoClip } from './schema.js'; // Deprecated re-export

export interface MatchVisualsOptions {
  timestamps: TimestampsOutput;
  provider?: AssetProviderName;
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

function toVisualSource(provider: AssetProvider, resultType: 'video' | 'image'): VisualSource {
  if (provider.name === 'pexels') return 'stock-pexels';
  if (provider.name === 'pixabay') return 'stock-pixabay';
  if (provider.name === 'nanobanana') return 'generated-nanobanana';
  if (provider.name === 'dalle') return 'generated-dalle';
  if (provider.name === 'unsplash') return 'stock-unsplash';
  if (provider.name === 'mock') return 'mock';

  // Best-effort defaults to keep schema valid.
  return resultType === 'image' ? 'generated-nanobanana' : 'stock-pexels';
}

/**
 * Match a single keyword to a visual asset (video or image).
 */
async function matchKeywordToAsset(
  keyword: Keyword,
  provider: AssetProvider,
  orientation: 'portrait' | 'landscape' | 'square',
  motionStrategy: MotionStrategyType,
  log: ReturnType<typeof createLogger>
): Promise<VideoMatchResult> {
  const duration = keyword.endTime - keyword.startTime;

  try {
    const results = await provider.search({
      query: keyword.keyword,
      orientation,
      perPage: 5,
    });

    if (results.length === 0) {
      throw new NotFoundError(`No assets found for: ${keyword.keyword}`);
    }

    const assetResult = results[0];
    const source = toVisualSource(provider, assetResult.type);
    return {
      asset: {
        sceneId: keyword.sectionId,
        source,
        assetPath: assetResult.url,
        duration,
        assetType: assetResult.type,
        ...(assetResult.type === 'image'
          ? {
              motionStrategy,
              motionApplied: false,
              generationPrompt:
                (assetResult.metadata?.prompt as string | undefined) ?? keyword.keyword,
              generationModel: (assetResult.metadata?.model as string | undefined) ?? undefined,
              generationCost: provider.costPerAsset,
            }
          : { motionStrategy: 'none' as const, motionApplied: false }),
        matchReasoning: {
          reasoning: `Found ${assetResult.type} matching keyword "${keyword.keyword}"`,
          conceptsMatched: [keyword.keyword],
        },
      },
      isFallback: false,
    };
  } catch (error) {
    log.warn({ keyword: keyword.keyword, error }, 'Failed to find asset, using fallback');
    return tryFallbackAsset(keyword, provider, orientation, motionStrategy, duration, log);
  }
}

/**
 * Try fallback search with generic query.
 */
async function tryFallbackAsset(
  keyword: Keyword,
  provider: AssetProvider,
  orientation: 'portrait' | 'landscape' | 'square',
  motionStrategy: MotionStrategyType,
  duration: number,
  log: ReturnType<typeof createLogger>
): Promise<VideoMatchResult> {
  try {
    const results = await provider.search({
      query:
        provider.assetType === 'image'
          ? 'abstract cinematic background, no text'
          : 'abstract motion background',
      orientation,
      perPage: 3,
    });

    if (results.length > 0) {
      const assetResult = results[0];
      const source = toVisualSource(provider, assetResult.type);
      return {
        asset: {
          sceneId: keyword.sectionId,
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
                  'abstract cinematic background, no text',
                generationModel: (assetResult.metadata?.model as string | undefined) ?? undefined,
                generationCost: provider.costPerAsset,
              }
            : { motionStrategy: 'none' as const, motionApplied: false }),
          matchReasoning: {
            reasoning: `Fallback to abstract background - original query "${keyword.keyword}" failed`,
            conceptsMatched:
              assetResult.type === 'image'
                ? ['abstract', 'cinematic', 'background']
                : ['abstract', 'motion', 'background'],
          },
        },
        isFallback: true,
      };
    }
  } catch {
    log.error({ keyword: keyword.keyword }, 'Fallback search also failed');
  }

  // Ultimate fallback: solid color
  return {
    asset: {
      sceneId: keyword.sectionId,
      source: 'fallback-color',
      assetPath: '#1a1a2e',
      duration,
      assetType: 'video',
      motionStrategy: 'none',
      motionApplied: false,
      matchReasoning: {
        reasoning: `No asset found for "${keyword.keyword}", using solid color fallback`,
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
  const motionStrategy: MotionStrategyType =
    options.motionStrategy ?? (config.visuals.motionStrategy as MotionStrategyType);

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

  // Create the asset provider (Strategy pattern)
  const assetProvider = createAssetProvider(providerName as AssetProviderName, {
    visuals: config.visuals,
  });
  const scenes = options.timestamps.scenes ?? [];

  // Extract keywords using LLM
  let keywords: Keyword[];
  try {
    keywords = await extractKeywords({ scenes, config });
  } catch (error) {
    log.warn({ error }, 'Keyword extraction failed; falling back to naive per-scene keywords');
    keywords = scenes.map((scene) => {
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
  log.info({ keywordCount: keywords.length }, 'Keywords extracted');
  emit({
    phase: 'keywords',
    progress: 0,
    message: `Extracted ${keywords.length} keywords`,
    completed: 0,
    total: keywords.length,
  });

  // Match each keyword to an asset
  const visualAssets: VisualAssetInput[] = [];
  let fallbacks = 0;

  for (let index = 0; index < keywords.length; index++) {
    const keyword = keywords[index];
    const result = await matchKeywordToAsset(
      keyword,
      assetProvider,
      orientation,
      motionStrategy,
      log
    );
    visualAssets.push(result.asset);
    if (result.isFallback) fallbacks++;

    const completed = index + 1;
    const total = keywords.length;
    emit({
      phase: 'provider:search',
      progress: total > 0 ? completed / total : 1,
      message: `Matched ${completed}/${total}`,
      completed,
      total,
    });
  }

  const fromStock = visualAssets.filter(
    (a) => a.source === 'stock-pexels' || a.source === 'stock-pixabay'
  ).length;
  const fromGenerated = visualAssets.filter(
    (a) => a.source === 'generated-nanobanana' || a.source === 'generated-dalle'
  ).length;

  const output = {
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: 0,
    fromStock,
    fallbacks,
    fromGenerated,
    motionStrategy,
    keywords,
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
