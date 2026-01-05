/**
 * Visual Matcher
 *
 * Matches script scenes to stock footage using keywords and LLM extraction.
 * Based on SYSTEM-DESIGN §7.3 cm visuals command.
 */
import { TimestampsOutput, SceneTimestamp } from '../audio/schema';
import { createLLMProvider } from '../core/llm';
import { loadConfig } from '../core/config';
import { createLogger } from '../core/logger';
import { APIError, NotFoundError } from '../core/errors';
import {
  VisualsOutput,
  VisualsOutputSchema,
  VisualAsset,
  Keyword,
  VISUALS_SCHEMA_VERSION,
} from './schema';
import { searchPexels } from './providers/pexels';

export type { VisualsOutput, VisualAsset } from './schema';
// Re-export deprecated type for backward compatibility
export type { VideoClip } from './schema';

export interface MatchVisualsOptions {
  timestamps: TimestampsOutput;
  provider?: 'pexels' | 'pixabay';
  orientation?: 'portrait' | 'landscape' | 'square';
  /** Use mock mode for testing without real API calls */
  mock?: boolean;
}

interface VideoMatchResult {
  asset: VisualAsset;
  fromStock: boolean;
  isFallback: boolean;
}

/**
 * Match a single keyword to video footage
 */
async function matchKeywordToVideo(
  keyword: Keyword,
  provider: 'pexels' | 'pixabay',
  orientation: 'portrait' | 'landscape' | 'square',
  log: ReturnType<typeof createLogger>
): Promise<VideoMatchResult> {
  const source = provider === 'pexels' ? 'stock-pexels' : 'stock-pixabay';
  const duration = keyword.endTime - keyword.startTime;

  try {
    const video = await findVideoForKeyword(keyword, provider, orientation);
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
    return tryFallbackVideo(keyword, provider, orientation, duration, source, log);
  }
}

/** Valid asset source types */
type AssetSource = 'user-footage' | 'stock-pexels' | 'stock-pixabay' | 'fallback-color' | 'mock';

/**
 * Try fallback video search
 */
async function tryFallbackVideo(
  keyword: Keyword,
  provider: 'pexels' | 'pixabay',
  orientation: 'portrait' | 'landscape' | 'square',
  duration: number,
  source: AssetSource,
  log: ReturnType<typeof createLogger>
): Promise<VideoMatchResult> {
  try {
    const fallbackVideo = await findVideoForKeyword(
      { ...keyword, keyword: 'abstract motion background' },
      provider,
      orientation
    );
    return {
      asset: {
        sceneId: keyword.sectionId,
        source,
        assetPath: fallbackVideo.url,
        duration,
        matchReasoning: {
          reasoning: `Fallback to abstract background - original query "${keyword.keyword}" failed`,
          conceptsMatched: ['abstract', 'motion', 'background'],
        },
      },
      fromStock: true,
      isFallback: true,
    };
  } catch {
    log.error({ keyword: keyword.keyword }, 'Fallback also failed');
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
}

/**
 * Match stock footage to script scenes
 */
export async function matchVisuals(options: MatchVisualsOptions): Promise<VisualsOutput> {
  const log = createLogger({ module: 'visuals', provider: options.provider ?? 'pexels' });
  const config = await loadConfig();
  const provider = options.provider ?? 'pexels';
  const orientation = options.orientation ?? 'portrait';

  log.info(
    { sceneCount: options.timestamps.scenes?.length ?? 0, duration: options.timestamps.totalDuration, mock: options.mock },
    'Starting visual matching'
  );

  if (options.mock) {
    return generateMockVisuals(options);
  }

  const scenes = options.timestamps.scenes ?? [];
  const keywords = await extractKeywords(scenes, config);
  log.info({ keywordCount: keywords.length }, 'Keywords extracted');

  const visualAssets: VisualAsset[] = [];
  let fallbacks = 0;
  let fromStock = 0;

  for (const keyword of keywords) {
    const result = await matchKeywordToVideo(keyword, provider, orientation, log);
    visualAssets.push(result.asset);
    if (result.fromStock) fromStock++;
    if (result.isFallback) fallbacks++;
  }

  const output: VisualsOutput = {
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: 0,
    fromStock,
    fallbacks,
    keywords,
    totalDuration: options.timestamps.totalDuration,
  };

  const validated = VisualsOutputSchema.parse(output);
  log.info({ assetCount: validated.scenes.length, fallbacks: validated.fallbacks }, 'Visual matching complete');
  return validated;
}

/**
 * Extract keywords from scene timestamps using LLM
 */
async function extractKeywords(
  scenes: SceneTimestamp[],
  config: Awaited<ReturnType<typeof loadConfig>>
): Promise<Keyword[]> {
  const log = createLogger({ module: 'keywords' });

  if (scenes.length === 0) {
    log.warn('No scenes to extract keywords from');
    return [];
  }

  const llm = createLLMProvider(config.llm.provider, config.llm.model);

  const sceneTexts = scenes
    .map((s, i) => {
      const text = s.words.map((w) => w.word).join(' ');
      return `[${i}] (${s.audioStart.toFixed(1)}s - ${s.audioEnd.toFixed(1)}s): ${text}`;
    })
    .join('\n');

  const response = await llm.chat(
    [
      {
        role: 'system',
        content: `You are a visual search keyword expert. Extract 1-3 word search queries that would find relevant stock footage for each video scene. Focus on visual concepts, not abstract ideas. Prefer concrete, filmable subjects.

Examples of GOOD keywords: "office laptop", "coffee shop", "running fitness", "city traffic"
Examples of BAD keywords: "productivity", "happiness", "success", "concept"`,
      },
      {
        role: 'user',
        content: `Extract video search keywords for each scene:

${sceneTexts}

Respond with JSON array:
[
  {"sceneIndex": 0, "keyword": "search query"},
  ...
]`,
      },
    ],
    {
      temperature: 0.3,
      maxTokens: 1000,
      jsonMode: true,
    }
  );

  interface KeywordResponse {
    sceneIndex: number;
    keyword: string;
  }

  let keywordResponses: KeywordResponse[];
  try {
    keywordResponses = JSON.parse(response.content);
  } catch {
    log.error({ content: response.content }, 'Failed to parse keyword response');
    throw new APIError('Failed to extract keywords from LLM response');
  }

  // Map to our Keyword format
  return keywordResponses.map((kr) => {
    const scene = scenes[kr.sceneIndex];
    return {
      keyword: kr.keyword,
      sectionId: scene.sceneId,
      startTime: scene.audioStart,
      endTime: scene.audioEnd,
    };
  });
}

interface VideoSearchResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
}

/**
 * Find a video for a keyword
 */
async function findVideoForKeyword(
  keyword: Keyword,
  provider: 'pexels' | 'pixabay',
  orientation: 'portrait' | 'landscape' | 'square'
): Promise<VideoSearchResult> {
  if (provider === 'pexels') {
    const results = await searchPexels({
      query: keyword.keyword,
      orientation,
      perPage: 5,
    });

    if (results.length === 0) {
      throw new NotFoundError(`No Pexels videos found for: ${keyword.keyword}`);
    }

    // Return first result
    const video = results[0];
    return {
      id: String(video.id),
      url: video.url,
      thumbnailUrl: video.thumbnailUrl,
      width: video.width,
      height: video.height,
    };
  }

  // Add other providers here
  throw new APIError(`Unsupported provider: ${provider}`);
}

/**
 * Generate mock visuals for testing
 */
function generateMockVisuals(options: MatchVisualsOptions): VisualsOutput {
  const log = createLogger({ module: 'visuals', mock: true });

  const scenes = options.timestamps.scenes ?? [];

  const visualAssets: VisualAsset[] = scenes.map((scene, index) => ({
    sceneId: scene.sceneId,
    source: 'mock',
    assetPath: `https://mock.pexels.com/video/${index + 1}.mp4`,
    duration: scene.audioEnd - scene.audioStart,
    matchReasoning: {
      reasoning: `Mock video for scene ${scene.sceneId}`,
      conceptsMatched: ['mock', 'test'],
    },
  }));

  const keywords: Keyword[] = scenes.map((scene, index) => ({
    keyword: `mock keyword ${index + 1}`,
    sectionId: scene.sceneId,
    startTime: scene.audioStart,
    endTime: scene.audioEnd,
  }));

  const output: VisualsOutput = {
    schemaVersion: VISUALS_SCHEMA_VERSION,
    scenes: visualAssets,
    totalAssets: visualAssets.length,
    fromUserFootage: 0,
    fromStock: visualAssets.length,
    fallbacks: 0,
    keywords,
    totalDuration: options.timestamps.totalDuration,
  };

  log.info(
    {
      assetCount: output.scenes.length,
    },
    'Mock visual matching complete'
  );

  return VisualsOutputSchema.parse(output);
}
