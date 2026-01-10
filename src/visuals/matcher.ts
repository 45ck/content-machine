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
} from './schema.js';
import { extractKeywords, generateMockKeywords } from './keywords.js';
import { createVideoProvider, type VideoProvider, type ProviderName } from './providers/index.js';
import { selectGameplayClip } from './gameplay.js';

export type { VisualsOutput, VisualAsset } from './schema.js';
export type { VideoClip } from './schema.js'; // Deprecated re-export

export interface MatchVisualsOptions {
  timestamps: TimestampsOutput;
  provider?: ProviderName;
  orientation?: 'portrait' | 'landscape' | 'square';
  mock?: boolean;
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
  fromStock: boolean;
  isFallback: boolean;
}

type AssetSource = 'user-footage' | 'stock-pexels' | 'stock-pixabay' | 'fallback-color' | 'mock';

/**
 * Match a single keyword to video footage
 */
async function matchKeywordToVideo(
  keyword: Keyword,
  videoProvider: VideoProvider,
  orientation: 'portrait' | 'landscape' | 'square',
  log: ReturnType<typeof createLogger>
): Promise<VideoMatchResult> {
  const source: AssetSource = `stock-${videoProvider.name}` as AssetSource;
  const duration = keyword.endTime - keyword.startTime;

  try {
    const results = await videoProvider.search({
      query: keyword.keyword,
      orientation,
      perPage: 5,
    });

    if (results.length === 0) {
      throw new NotFoundError(`No videos found for: ${keyword.keyword}`);
    }

    const video = results[0];
    return {
      asset: {
        sceneId: keyword.sectionId,
        source,
        assetPath: video.url,
        duration,
        matchReasoning: {
          reasoning: `Found video matching keyword "${keyword.keyword}"`,
          conceptsMatched: [keyword.keyword],
        },
      },
      fromStock: true,
      isFallback: false,
    };
  } catch (error) {
    log.warn({ keyword: keyword.keyword, error }, 'Failed to find video, using fallback');
    return tryFallbackVideo(keyword, videoProvider, orientation, duration, source, log);
  }
}

/**
 * Try fallback video search with generic query
 */
async function tryFallbackVideo(
  keyword: Keyword,
  videoProvider: VideoProvider,
  orientation: 'portrait' | 'landscape' | 'square',
  duration: number,
  source: AssetSource,
  log: ReturnType<typeof createLogger>
): Promise<VideoMatchResult> {
  try {
    const results = await videoProvider.search({
      query: 'abstract motion background',
      orientation,
      perPage: 3,
    });

    if (results.length > 0) {
      return {
        asset: {
          sceneId: keyword.sectionId,
          source,
          assetPath: results[0].url,
          duration,
          matchReasoning: {
            reasoning: `Fallback to abstract background - original query "${keyword.keyword}" failed`,
            conceptsMatched: ['abstract', 'motion', 'background'],
          },
        },
        fromStock: true,
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
      matchReasoning: {
        reasoning: `No video found for "${keyword.keyword}", using solid color fallback`,
      },
    },
    fromStock: false,
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

  const visualAssets: VisualAssetInput[] = scenes.map((scene, index) => ({
    sceneId: scene.sceneId,
    source: 'mock' as const,
    assetPath: `https://mock.pexels.com/video/${index + 1}.mp4`,
    duration: scene.audioEnd - scene.audioStart,
    matchReasoning: {
      reasoning: `Mock video for scene ${scene.sceneId}`,
      conceptsMatched: ['mock', 'test'],
    },
  }));

  return VisualsOutputSchema.parse({
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: 0,
    fromStock: visualAssets.length,
    fallbacks: 0,
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

  // Create the video provider (Strategy pattern)
  const videoProvider = createVideoProvider(providerName as ProviderName);
  const scenes = options.timestamps.scenes ?? [];

  // Extract keywords using LLM
  const keywords = await extractKeywords({ scenes });
  log.info({ keywordCount: keywords.length }, 'Keywords extracted');
  emit({
    phase: 'keywords',
    progress: 0,
    message: `Extracted ${keywords.length} keywords`,
    completed: 0,
    total: keywords.length,
  });

  // Match each keyword to video
  const visualAssets: VisualAssetInput[] = [];
  let fallbacks = 0;
  let fromStock = 0;

  for (let index = 0; index < keywords.length; index++) {
    const keyword = keywords[index];
    const result = await matchKeywordToVideo(keyword, videoProvider, orientation, log);
    visualAssets.push(result.asset);
    if (result.fromStock) fromStock++;
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

  const output = {
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: 0,
    fromStock,
    fallbacks,
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
