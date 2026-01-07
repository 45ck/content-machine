/**
 * Keyword Extraction Module
 *
 * Extracts visual search keywords from scene timestamps using LLM.
 * Separated from matcher.ts for single responsibility principle.
 */

import type { SceneTimestamp } from '../audio/schema.js';
import { createLLMProvider } from '../core/llm/index.js';
import { loadConfig } from '../core/config.js';
import { createLogger } from '../core/logger.js';
import { APIError } from '../core/errors.js';
import type { Keyword } from './schema.js';

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
    log.debug('LLM returned result-wrapped array');
    return parsed.result;
  } else if (parsed && Array.isArray(parsed.data)) {
    log.debug('LLM returned data-wrapped array');
    return parsed.data;
  } else if (
    parsed &&
    typeof parsed === 'object' &&
    'sceneIndex' in parsed &&
    'keyword' in parsed
  ) {
    log.warn('LLM returned single object instead of array, wrapping');
    return [parsed as KeywordResponse];
  } else {
    log.error({ parsed }, 'Unexpected response format - expected array');
    throw new APIError('Unexpected keyword response format from LLM');
  }
}

/**
 * Fill missing keyword responses with defaults
 */
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

/**
 * Map keyword responses to Keyword objects with timing
 */
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
 * Build the LLM prompt for keyword extraction
 */
function buildKeywordPrompt(scenes: SceneTimestamp[]): string {
  const sceneTexts = scenes
    .map((s, i) => {
      const text = s.words.map((w) => w.word).join(' ');
      return `[${i}] (${s.audioStart.toFixed(1)}s - ${s.audioEnd.toFixed(1)}s): ${text}`;
    })
    .join('\n');

  return `You have ${scenes.length} scenes. Return a JSON array with EXACTLY ${scenes.length} keyword entries.

Scenes:
${sceneTexts}

Return ONLY a valid JSON array like this (with ${scenes.length} items):
[
${scenes.map((_, i) => `  {"sceneIndex": ${i}, "keyword": "your search term"}`).join(',\n')}
]`;
}

const SYSTEM_PROMPT = `You are a visual search keyword expert. Your task is to extract 1-3 word search queries that find relevant stock footage for video scenes.

RULES:
1. ALWAYS return a JSON array with EXACTLY the same number of entries as scenes provided
2. Focus on visual, concrete, filmable concepts (not abstract ideas)
3. Each keyword should be 1-3 words optimized for stock footage search

GOOD keywords: "laptop typing", "coffee shop", "city skyline", "person running"
BAD keywords: "productivity", "success", "happiness", "concept"`;

export interface ExtractKeywordsOptions {
  scenes: SceneTimestamp[];
  /** Override config for testing */
  config?: Awaited<ReturnType<typeof loadConfig>>;
}

/**
 * Extract keywords from scene timestamps using LLM
 */
export async function extractKeywords(options: ExtractKeywordsOptions): Promise<Keyword[]> {
  const log = createLogger({ module: 'keywords' });
  const { scenes } = options;

  if (scenes.length === 0) {
    log.warn('No scenes to extract keywords from');
    return [];
  }

  const config = options.config ?? (await loadConfig());
  const llm = createLLMProvider(config.llm.provider, config.llm.model);

  const response = await llm.chat(
    [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildKeywordPrompt(scenes) },
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

/**
 * Generate mock keywords for testing
 */
export function generateMockKeywords(scenes: SceneTimestamp[]): Keyword[] {
  return scenes.map((scene, index) => ({
    keyword: `mock keyword ${index + 1}`,
    sectionId: scene.sceneId,
    startTime: scene.audioStart,
    endTime: scene.audioEnd,
  }));
}
