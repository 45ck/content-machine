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
    {
      sceneCount: options.timestamps.scenes?.length ?? 0,
      duration: options.timestamps.totalDuration,
      mock: options.mock,
    },
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
  log.info(
    { assetCount: validated.scenes.length, fallbacks: validated.fallbacks },
    'Visual matching complete'
  );
  return validated;
}

/** Keyword response from LLM */
interface KeywordResponse {
  sceneIndex: number;
  keyword: string;
}

/**
 * Parse LLM response for keywords, handling various formats
 */
function parseKeywordResponse(
  content: string,
  log: ReturnType<typeof createLogger>
): KeywordResponse[] {
  const parsed = JSON.parse(content);
  // Handle various response formats from LLM
  if (Array.isArray(parsed)) {
    return parsed;
  } else if (parsed && Array.isArray(parsed.keywords)) {
    return parsed.keywords;
  } else if (parsed && Array.isArray(parsed.scenes)) {
    return parsed.scenes;
  } else if (parsed && Array.isArray(parsed.result)) {
    // Handle { "result": [...] } format
    log.debug('LLM returned result-wrapped array');
    return parsed.result;
  } else if (parsed && Array.isArray(parsed.data)) {
    // Handle { "data": [...] } format
    log.debug('LLM returned data-wrapped array');
    return parsed.data;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    'sceneIndex' in parsed &&
    'keyword' in parsed
  ) {
    // Single object response - wrap in array
    log.warn('LLM returned single object instead of array, wrapping');
    return [parsed as KeywordResponse];
  } else {
    log.error({ parsed }, 'Unexpected response format - expected array');
    throw new APIError('Unexpected keyword response format from LLM');
  }
}

function fillMissingKeywordResponses(
  keywordResponses: KeywordResponse[],
  sceneCount: number,
  log: ReturnType<typeof createLogger>
): KeywordResponse[] {
  if (keywordResponses.length >= sceneCount) return keywordResponses;

  log.warn(
    { expected: sceneCount, got: keywordResponses.length },
    'LLM returned fewer keywords than scenes, filling gaps'
  );

  const filled = [...keywordResponses];
  for (let i = filled.length; i < sceneCount; i++) {
    filled.push({ sceneIndex: i, keyword: 'abstract technology' });
  }
  return filled;
}

function mapKeywordResponsesToKeywords(
  keywordResponses: KeywordResponse[],
  scenes: SceneTimestamp[],
  log: ReturnType<typeof createLogger>
): Keyword[] {
  return keywordResponses.map((kr) => {
    const scene = scenes[kr.sceneIndex];
    if (!scene) {
      log.warn({ sceneIndex: kr.sceneIndex }, 'Invalid scene index in keyword response');
      return {
        keyword: kr.keyword,
        sectionId: `scene-${kr.sceneIndex}`,
        startTime: 0,
        endTime: 5,
      };
    }
    return {
      keyword: kr.keyword,
      sectionId: scene.sceneId,
      startTime: scene.audioStart,
      endTime: scene.audioEnd,
    };
  });
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
        content: `You are a visual search keyword expert. Your task is to extract 1-3 word search queries that find relevant stock footage for video scenes.

RULES:
1. ALWAYS return a JSON array with EXACTLY the same number of entries as scenes provided
2. Focus on visual, concrete, filmable concepts (not abstract ideas)
3. Each keyword should be 1-3 words optimized for stock footage search

GOOD keywords: "laptop typing", "coffee shop", "city skyline", "person running"
BAD keywords: "productivity", "success", "happiness", "concept"`,
      },
      {
        role: 'user',
        content: `You have ${scenes.length} scenes. Return a JSON array with EXACTLY ${scenes.length} keyword entries.

Scenes:
${sceneTexts}

Return ONLY a valid JSON array like this (with ${scenes.length} items):
[
${scenes.map((_, i) => `  {"sceneIndex": ${i}, "keyword": "your search term"}`).join(',\n')}
]`,
      },
    ],
    {
      temperature: 0.3,
      maxTokens: 1000,
      jsonMode: true,
    }
  );

  let keywordResponses: KeywordResponse[];
  try {
    keywordResponses = parseKeywordResponse(response.content, log);
  } catch (error) {
    if (error instanceof APIError) throw error;
    log.error({ content: response.content }, 'Failed to parse keyword response');
    throw new APIError('Failed to extract keywords from LLM response');
  }

  keywordResponses = fillMissingKeywordResponses(keywordResponses, scenes.length, log);
  return mapKeywordResponsesToKeywords(keywordResponses, scenes, log);
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
