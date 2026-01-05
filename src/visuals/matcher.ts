/**
 * Visual Matcher
 * 
 * Matches script sections to stock footage using keywords and LLM extraction.
 */
import { TimestampsOutput, TranscriptSegment } from '../audio/schema';
import { createLLMProvider } from '../core/llm';
import { loadConfig, getApiKey } from '../core/config';
import { createLogger } from '../core/logger';
import { APIError, NotFoundError } from '../core/errors';
import { 
  VisualsOutput, 
  VisualsOutputSchema,
  VideoClip,
  Keyword 
} from './schema';
import { searchPexels, PexelsVideo } from './providers/pexels';

export type { VisualsOutput, VideoClip } from './schema';

export interface MatchVisualsOptions {
  timestamps: TimestampsOutput;
  provider?: 'pexels' | 'pixabay';
  orientation?: 'portrait' | 'landscape' | 'square';
}

/**
 * Match stock footage to script segments
 */
export async function matchVisuals(options: MatchVisualsOptions): Promise<VisualsOutput> {
  const log = createLogger({ module: 'visuals', provider: options.provider ?? 'pexels' });
  const config = await loadConfig();
  const provider = options.provider ?? 'pexels';
  const orientation = options.orientation ?? 'portrait';
  
  log.info({ 
    segmentCount: options.timestamps.segments.length, 
    duration: options.timestamps.duration 
  }, 'Starting visual matching');
  
  // Step 1: Extract keywords from segments
  const keywords = await extractKeywords(options.timestamps.segments, config);
  
  log.info({ keywordCount: keywords.length }, 'Keywords extracted');
  
  // Step 2: Search for videos for each keyword
  const clips: VideoClip[] = [];
  let fallbacksUsed = 0;
  
  for (const keyword of keywords) {
    try {
      const video = await findVideoForKeyword(keyword, provider, orientation);
      
      clips.push({
        id: `clip-${clips.length}`,
        url: video.url,
        thumbnailUrl: video.thumbnailUrl,
        duration: keyword.endTime - keyword.startTime,
        width: video.width,
        height: video.height,
        startTime: keyword.startTime,
        endTime: keyword.endTime,
        source: provider,
        sourceId: video.id,
        searchQuery: keyword.keyword,
        sectionId: keyword.sectionId,
      });
      
    } catch (error) {
      log.warn({ keyword: keyword.keyword, error }, 'Failed to find video, using fallback');
      
      // Try fallback search with simpler query
      try {
        const fallbackVideo = await findVideoForKeyword(
          { ...keyword, keyword: 'abstract motion background' },
          provider,
          orientation
        );
        
        clips.push({
          id: `clip-${clips.length}`,
          url: fallbackVideo.url,
          thumbnailUrl: fallbackVideo.thumbnailUrl,
          duration: keyword.endTime - keyword.startTime,
          width: fallbackVideo.width,
          height: fallbackVideo.height,
          startTime: keyword.startTime,
          endTime: keyword.endTime,
          source: provider,
          sourceId: fallbackVideo.id,
          searchQuery: 'abstract motion background (fallback)',
          sectionId: keyword.sectionId,
        });
        
        fallbacksUsed++;
        
      } catch {
        log.error({ keyword: keyword.keyword }, 'Fallback also failed');
        throw new NotFoundError(`No video found for: ${keyword.keyword}`);
      }
    }
  }
  
  // Sort clips by start time
  clips.sort((a, b) => a.startTime - b.startTime);
  
  const output: VisualsOutput = {
    clips,
    keywords,
    totalDuration: options.timestamps.duration,
    provider,
    fallbacksUsed,
  };
  
  // Validate output
  const validated = VisualsOutputSchema.parse(output);
  
  log.info({ 
    clipCount: validated.clips.length, 
    fallbacksUsed: validated.fallbacksUsed 
  }, 'Visual matching complete');
  
  return validated;
}

/**
 * Extract keywords from segments using LLM
 */
async function extractKeywords(
  segments: TranscriptSegment[],
  config: Awaited<ReturnType<typeof loadConfig>>
): Promise<Keyword[]> {
  const log = createLogger({ module: 'keywords' });
  
  const llm = createLLMProvider(config.llm.provider, config.llm.model);
  
  const segmentTexts = segments.map((s, i) => 
    `[${i}] (${s.start.toFixed(1)}s - ${s.end.toFixed(1)}s): ${s.text}`
  ).join('\n');
  
  const response = await llm.chat([
    {
      role: 'system',
      content: `You are a visual search keyword expert. Extract 1-3 word search queries that would find relevant stock footage for each video segment. Focus on visual concepts, not abstract ideas. Prefer concrete, filmable subjects.

Examples of GOOD keywords: "office laptop", "coffee shop", "running fitness", "city traffic"
Examples of BAD keywords: "productivity", "happiness", "success", "concept"`,
    },
    {
      role: 'user',
      content: `Extract video search keywords for each segment:

${segmentTexts}

Respond with JSON array:
[
  {"segmentIndex": 0, "keyword": "search query"},
  ...
]`,
    },
  ], {
    temperature: 0.3,
    maxTokens: 1000,
    jsonMode: true,
  });
  
  interface KeywordResponse {
    segmentIndex: number;
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
  return keywordResponses.map(kr => {
    const segment = segments[kr.segmentIndex];
    return {
      keyword: kr.keyword,
      sectionId: segment.id,
      startTime: segment.start,
      endTime: segment.end,
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
