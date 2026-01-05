# Implementation Phase 3: cm visuals — Visual Matching

**Phase:** 3  
**Duration:** Weeks 4-5  
**Status:** Not Started  
**Document ID:** IMPL-PHASE-3-VISUALS-20260105  
**Prerequisites:** Phase 2 complete (timestamps.json available)

---

## 1. Overview

Phase 3 implements the `cm visuals` command, which matches script scenes to stock footage using Pexels API. This bridges the audio pipeline to the rendering stage.

### 1.1 Goals

- ✅ `cm visuals --input timestamps.json` generates visuals.json
- ✅ Pexels API integration with keyword extraction
- ✅ LLM-powered search term generation
- ✅ Vertical video preference (9:16)
- ✅ Fallback handling for no-match queries

### 1.2 Non-Goals

- ❌ Semantic matching with embeddings — Post-MVP
- ❌ AI image generation — Post-MVP
- ❌ Screen recording capture — Post-MVP

---

## 2. Deliverables

### 2.1 File Structure

```
src/visuals/
├── matcher.ts            # Main matching logic
├── schema.ts             # VisualsOutput Zod schema
├── keywords.ts           # LLM keyword extraction
├── providers/
│   ├── provider.ts       # StockProvider interface
│   ├── pexels.ts         # Pexels implementation
│   └── factory.ts        # Provider factory
├── cache.ts              # Search result caching
└── __tests__/
    ├── matcher.test.ts
    ├── keywords.test.ts
    ├── pexels.test.ts
    └── schema.test.ts
```

### 2.2 Component Matrix

| Component | File                              | Interface                      | Test Coverage |
| --------- | --------------------------------- | ------------------------------ | ------------- |
| Schema    | `src/visuals/schema.ts`           | `VisualsOutput`, `SceneVisual` | 100%          |
| Matcher   | `src/visuals/matcher.ts`          | `VisualMatcher`                | 90%           |
| Keywords  | `src/visuals/keywords.ts`         | `extractKeywords()`            | 85%           |
| Pexels    | `src/visuals/providers/pexels.ts` | `PexelsProvider`               | 80%           |
| Cache     | `src/visuals/cache.ts`            | `SearchCache`                  | 90%           |
| CLI       | `src/cli/commands/visuals.ts`     | `cm visuals` command           | 80%           |

---

## 3. Implementation Details

### 3.1 Schema Definition

**Pattern from:** [SECTION-VISUAL-MATCHING-20260104.md](../research/sections/SECTION-VISUAL-MATCHING-20260104.md)

```typescript
// src/visuals/schema.ts
import { z } from 'zod';

export const VideoAssetSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  duration: z.number().positive(),
  source: z.enum(['pexels', 'pixabay', 'local']),
  attribution: z.string().optional(),
});

export const SceneVisualSchema = z.object({
  sceneId: z.number().int().positive(),
  searchTerms: z.array(z.string()),
  selectedAsset: VideoAssetSchema,
  alternativeAssets: z.array(VideoAssetSchema).optional(),
  clipStart: z.number().nonnegative(), // Where to start in the stock video
  clipEnd: z.number().positive(), // Where to end
  sceneDuration: z.number().positive(), // How long this scene plays
});

export const VisualsOutputSchema = z.object({
  scenes: z.array(SceneVisualSchema),
  totalDuration: z.number().positive(),
  assetCount: z.number().int().nonnegative(),
  metadata: z.object({
    provider: z.string(),
    orientation: z.enum(['portrait', 'landscape', 'square']),
    generatedAt: z.string().datetime(),
  }),
});

export type VideoAsset = z.infer<typeof VideoAssetSchema>;
export type SceneVisual = z.infer<typeof SceneVisualSchema>;
export type VisualsOutput = z.infer<typeof VisualsOutputSchema>;

// Validation helpers
export function validateVisualsOutput(data: unknown): VisualsOutput {
  return VisualsOutputSchema.parse(data);
}
```

### 3.2 Stock Provider Interface

```typescript
// src/visuals/providers/provider.ts
import { VideoAsset } from '../schema.js';

export interface SearchOptions {
  query: string;
  orientation?: 'portrait' | 'landscape' | 'square';
  minDuration?: number;
  maxResults?: number;
}

export interface SearchResult {
  assets: VideoAsset[];
  totalResults: number;
  page: number;
  hasMore: boolean;
}

export interface StockProvider {
  readonly name: string;

  searchVideos(options: SearchOptions): Promise<SearchResult>;
  getVideo(id: string): Promise<VideoAsset | null>;
}
```

### 3.3 Pexels Provider

**Pattern from:** [RQ-05-STOCK-FOOTAGE-20260104.md](../research/investigations/RQ-05-STOCK-FOOTAGE-20260104.md)

```typescript
// src/visuals/providers/pexels.ts
import { createClient, Videos } from 'pexels';
import { StockProvider, SearchOptions, SearchResult } from './provider.js';
import { VideoAsset } from '../schema.js';
import { logger } from '../../core/logger.js';
import { getApiKey } from '../../core/config.js';
import { RateLimitError } from '../../core/errors.js';

export class PexelsProvider implements StockProvider {
  readonly name = 'pexels';
  private client: ReturnType<typeof createClient>;

  constructor(apiKey?: string) {
    const key = apiKey ?? getApiKey('PEXELS_API_KEY');
    this.client = createClient(key);
  }

  async searchVideos(options: SearchOptions): Promise<SearchResult> {
    const { query, orientation = 'portrait', minDuration = 5, maxResults = 10 } = options;

    logger.debug({ query, orientation }, 'Searching Pexels');

    try {
      const response = (await this.client.videos.search({
        query,
        orientation,
        size: 'medium', // Balance quality and load time
        per_page: maxResults,
      })) as Videos;

      const assets: VideoAsset[] = response.videos
        .filter((v) => v.duration >= minDuration)
        .map((video) => this.mapToAsset(video));

      logger.info({ query, results: assets.length }, 'Pexels search complete');

      return {
        assets,
        totalResults: response.total_results,
        page: response.page,
        hasMore: response.page * maxResults < response.total_results,
      };
    } catch (error: any) {
      if (error.status === 429) {
        throw new RateLimitError('pexels', 60);
      }
      throw error;
    }
  }

  async getVideo(id: string): Promise<VideoAsset | null> {
    try {
      const video = await this.client.videos.show({ id });
      return this.mapToAsset(video);
    } catch {
      return null;
    }
  }

  private mapToAsset(video: any): VideoAsset {
    // Select best quality file that fits portrait
    const file =
      video.video_files
        .filter((f: any) => f.height > f.width) // Portrait
        .sort((a: any, b: any) => b.height - a.height)[0] ?? video.video_files[0];

    return {
      id: String(video.id),
      url: file.link,
      thumbnailUrl: video.image,
      width: file.width,
      height: file.height,
      duration: video.duration,
      source: 'pexels',
      attribution: `Video by ${video.user.name} from Pexels`,
    };
  }
}
```

### 3.4 Keyword Extraction

**Pattern from:** [RQ-06-VISUAL-KEYWORD-EXTRACTION-20260104.md](../research/investigations/RQ-06-VISUAL-KEYWORD-EXTRACTION-20260104.md)

```typescript
// src/visuals/keywords.ts
import { LLMProvider } from '../core/llm/provider.js';
import { z } from 'zod';
import { logger } from '../core/logger.js';

const KeywordResponseSchema = z.object({
  keywords: z.array(z.string()).min(1).max(5),
});

export interface KeywordExtractionOptions {
  narration: string;
  visualDirection: string;
  context?: string;
}

export async function extractKeywords(
  llm: LLMProvider,
  options: KeywordExtractionOptions
): Promise<string[]> {
  const { narration, visualDirection, context } = options;

  const prompt = `Extract 2-4 stock video search keywords from this scene.

NARRATION: "${narration}"
VISUAL DIRECTION: "${visualDirection}"
${context ? `CONTEXT: ${context}` : ''}

Return keywords that would find relevant B-roll footage on Pexels.
Prefer concrete, visual concepts over abstract ideas.

GOOD: "typing on laptop", "coffee shop working", "code on screen"
BAD: "productivity", "success", "innovation"

Output as JSON: { "keywords": ["keyword1", "keyword2"] }`;

  const response = await llm.chat([{ role: 'user', content: prompt }], { jsonMode: true });

  const parsed = JSON.parse(response.content);
  const validated = KeywordResponseSchema.parse(parsed);

  logger.debug(
    {
      narration: narration.substring(0, 30),
      keywords: validated.keywords,
    },
    'Keywords extracted'
  );

  return validated.keywords;
}

// Fallback keyword generation (no LLM)
export function extractKeywordsFallback(visualDirection: string): string[] {
  // Simple noun extraction
  const stopWords = new Set([
    'show',
    'display',
    'the',
    'a',
    'an',
    'of',
    'in',
    'on',
    'with',
    'for',
    'to',
    'and',
    'or',
    'is',
    'are',
    'that',
    'this',
    'it',
    'as',
    'by',
  ]);

  const words = visualDirection
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !stopWords.has(w));

  // Return unique words, max 3
  return [...new Set(words)].slice(0, 3);
}
```

### 3.5 Visual Matcher

```typescript
// src/visuals/matcher.ts
import { LLMProvider } from '../core/llm/provider.js';
import { StockProvider } from './providers/provider.js';
import { AudioOutput } from '../audio/schema.js';
import { ScriptOutput } from '../script/schema.js';
import { VisualsOutput, SceneVisual, VideoAsset } from './schema.js';
import { extractKeywords, extractKeywordsFallback } from './keywords.js';
import { SearchCache } from './cache.js';
import { logger } from '../core/logger.js';

export interface MatcherOptions {
  orientation?: 'portrait' | 'landscape' | 'square';
  fallbackQuery?: string;
  useCache?: boolean;
}

export class VisualMatcher {
  private cache: SearchCache;

  constructor(
    private readonly llm: LLMProvider,
    private readonly stock: StockProvider,
    cacheOptions?: { enabled: boolean; ttl?: number }
  ) {
    this.cache = new SearchCache(cacheOptions);
  }

  static create(config: VisualsConfig): VisualMatcher {
    const llm = createLLMProvider(config.llm);
    const stock = createStockProvider(config.stock);
    return new VisualMatcher(llm, stock);
  }

  async match(
    script: ScriptOutput,
    audio: AudioOutput,
    options: MatcherOptions = {}
  ): Promise<VisualsOutput> {
    const { orientation = 'portrait', fallbackQuery = 'abstract background' } = options;

    logger.info({ scenes: script.scenes.length }, 'Starting visual matching');

    const sceneVisuals: SceneVisual[] = [];

    for (const scene of script.scenes) {
      const audioScene = audio.scenes.find((s) => s.sceneId === scene.id);
      const sceneDuration = audioScene ? audioScene.audioEnd - audioScene.audioStart : 5; // Default 5 seconds

      // Extract keywords
      let keywords: string[];
      try {
        keywords = await extractKeywords(this.llm, {
          narration: scene.narration,
          visualDirection: scene.visualDirection,
        });
      } catch (error) {
        logger.warn({ error }, 'LLM keyword extraction failed, using fallback');
        keywords = extractKeywordsFallback(scene.visualDirection);
      }

      // Search for matching videos
      let asset = await this.findMatchingAsset(keywords, orientation, sceneDuration);

      // Fallback if no results
      if (!asset) {
        logger.warn({ keywords }, 'No results for keywords, using fallback');
        asset = await this.findMatchingAsset([fallbackQuery], orientation, sceneDuration);
      }

      if (!asset) {
        throw new Error(`No footage found for scene ${scene.id}`);
      }

      sceneVisuals.push({
        sceneId: scene.id,
        searchTerms: keywords,
        selectedAsset: asset,
        clipStart: 0,
        clipEnd: Math.min(asset.duration, sceneDuration + 2), // Add buffer
        sceneDuration,
      });
    }

    const totalDuration = sceneVisuals.reduce((sum, s) => sum + s.sceneDuration, 0);

    const output: VisualsOutput = {
      scenes: sceneVisuals,
      totalDuration,
      assetCount: sceneVisuals.length,
      metadata: {
        provider: this.stock.name,
        orientation,
        generatedAt: new Date().toISOString(),
      },
    };

    logger.info(
      {
        scenes: sceneVisuals.length,
        totalDuration,
      },
      'Visual matching complete'
    );

    return output;
  }

  private async findMatchingAsset(
    keywords: string[],
    orientation: 'portrait' | 'landscape' | 'square',
    minDuration: number
  ): Promise<VideoAsset | null> {
    // Try each keyword until we get results
    for (const keyword of keywords) {
      // Check cache first
      const cached = this.cache.get(keyword, orientation);
      if (cached) {
        const suitable = cached.filter((a) => a.duration >= minDuration);
        if (suitable.length > 0) {
          return this.selectBestAsset(suitable);
        }
      }

      // Search
      const result = await this.stock.searchVideos({
        query: keyword,
        orientation,
        minDuration,
        maxResults: 5,
      });

      // Cache results
      this.cache.set(keyword, orientation, result.assets);

      if (result.assets.length > 0) {
        return this.selectBestAsset(result.assets);
      }
    }

    return null;
  }

  private selectBestAsset(assets: VideoAsset[]): VideoAsset {
    // Prefer portrait videos with good resolution
    return assets.sort((a, b) => {
      // Score based on: aspect ratio match, resolution
      const aScore = this.scoreAsset(a);
      const bScore = this.scoreAsset(b);
      return bScore - aScore;
    })[0];
  }

  private scoreAsset(asset: VideoAsset): number {
    let score = 0;

    // Portrait aspect ratio
    if (asset.height > asset.width) score += 10;

    // Resolution (prefer 1080 width)
    if (asset.width >= 1080) score += 5;
    if (asset.width >= 720) score += 3;

    // Duration (longer = more flexible for clips)
    score += Math.min(asset.duration / 10, 5);

    return score;
  }
}
```

### 3.6 Search Cache

```typescript
// src/visuals/cache.ts
import { VideoAsset } from './schema.js';

interface CacheEntry {
  assets: VideoAsset[];
  timestamp: number;
}

export class SearchCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl: number;
  private readonly enabled: boolean;

  constructor(options?: { enabled?: boolean; ttl?: number }) {
    this.enabled = options?.enabled ?? true;
    this.ttl = options?.ttl ?? 3600000; // 1 hour default
  }

  private makeKey(query: string, orientation: string): string {
    return `${query.toLowerCase().trim()}:${orientation}`;
  }

  get(query: string, orientation: string): VideoAsset[] | null {
    if (!this.enabled) return null;

    const key = this.makeKey(query, orientation);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.assets;
  }

  set(query: string, orientation: string, assets: VideoAsset[]): void {
    if (!this.enabled) return;

    const key = this.makeKey(query, orientation);
    this.cache.set(key, {
      assets,
      timestamp: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}
```

### 3.7 CLI Command

```typescript
// src/cli/commands/visuals.ts
import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { VisualMatcher } from '../../visuals/matcher.js';
import { loadConfig } from '../../core/config.js';
import { validateScript } from '../../script/schema.js';
import { validateAudioOutput } from '../../audio/schema.js';
import { logger } from '../../core/logger.js';
import ora from 'ora';

export function createVisualsCommand(): Command {
  return new Command('visuals')
    .description('Match script scenes to stock footage')
    .option('-s, --script <path>', 'Input script.json path', 'script.json')
    .option('-a, --audio <path>', 'Input timestamps.json path', 'timestamps.json')
    .option('-o, --output <path>', 'Output file path', 'visuals.json')
    .option('--orientation <type>', 'Video orientation', 'portrait')
    .action(async (options) => {
      // Validate inputs exist
      for (const [name, path] of [
        ['script', options.script],
        ['audio', options.audio],
      ]) {
        if (!existsSync(path)) {
          console.error(`${name} file not found: ${path}`);
          process.exit(1);
        }
      }

      const spinner = ora('Matching visuals...').start();

      try {
        const config = loadConfig();
        const matcher = VisualMatcher.create(config.visuals);

        // Load inputs
        const script = validateScript(JSON.parse(readFileSync(options.script, 'utf-8')));
        const audio = validateAudioOutput(JSON.parse(readFileSync(options.audio, 'utf-8')));

        // Match visuals
        const result = await matcher.match(script, audio, {
          orientation: options.orientation,
        });

        // Save output
        const outputPath = resolve(options.output);
        writeFileSync(outputPath, JSON.stringify(result, null, 2));

        spinner.succeed(
          `Matched ${result.scenes.length} scenes (${result.totalDuration.toFixed(1)}s)`
        );
        console.log(`Saved to ${outputPath}`);
      } catch (error) {
        spinner.fail('Visual matching failed');
        console.error(error instanceof Error ? error.message : error);
        process.exit(1);
      }
    });
}
```

---

## 4. Tests to Write First (TDD)

### 4.1 Schema Tests

```typescript
// src/visuals/__tests__/schema.test.ts
import { describe, it, expect } from 'vitest';
import { VisualsOutputSchema, validateVisualsOutput } from '../schema';

describe('VisualsOutputSchema', () => {
  const validOutput = {
    scenes: [
      {
        sceneId: 1,
        searchTerms: ['coding', 'laptop'],
        selectedAsset: {
          id: '123',
          url: 'https://example.com/video.mp4',
          width: 1080,
          height: 1920,
          duration: 15,
          source: 'pexels',
        },
        clipStart: 0,
        clipEnd: 8,
        sceneDuration: 6,
      },
    ],
    totalDuration: 6,
    assetCount: 1,
    metadata: {
      provider: 'pexels',
      orientation: 'portrait',
      generatedAt: '2026-01-05T12:00:00Z',
    },
  };

  it('should validate correct output', () => {
    expect(() => validateVisualsOutput(validOutput)).not.toThrow();
  });

  it('should reject invalid asset URL', () => {
    const invalid = {
      ...validOutput,
      scenes: [
        {
          ...validOutput.scenes[0],
          selectedAsset: {
            ...validOutput.scenes[0].selectedAsset,
            url: 'not-a-url',
          },
        },
      ],
    };
    expect(() => validateVisualsOutput(invalid)).toThrow();
  });
});
```

### 4.2 Keyword Extraction Tests

```typescript
// src/visuals/__tests__/keywords.test.ts
import { describe, it, expect } from 'vitest';
import { extractKeywords, extractKeywordsFallback } from '../keywords';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';

describe('extractKeywords', () => {
  it('should extract keywords from LLM', async () => {
    const llm = new FakeLLMProvider();
    llm.queueJsonResponse({ keywords: ['laptop typing', 'code editor'] });

    const result = await extractKeywords(llm, {
      narration: 'Here is how you write TypeScript',
      visualDirection: 'Show code editor with TypeScript',
    });

    expect(result).toContain('laptop typing');
    expect(result).toContain('code editor');
  });
});

describe('extractKeywordsFallback', () => {
  it('should extract nouns from visual direction', () => {
    const result = extractKeywordsFallback('Show laptop with code editor open');

    expect(result).toContain('laptop');
    expect(result).toContain('code');
    expect(result).toContain('editor');
  });

  it('should filter stop words', () => {
    const result = extractKeywordsFallback('Show the computer on the desk');

    expect(result).not.toContain('show');
    expect(result).not.toContain('the');
    expect(result).toContain('computer');
    expect(result).toContain('desk');
  });
});
```

### 4.3 Matcher Tests

```typescript
// src/visuals/__tests__/matcher.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { VisualMatcher } from '../matcher';
import { FakeLLMProvider } from '../../test/stubs/fake-llm';
import { FakeStockProvider } from '../../test/stubs/fake-stock';

describe('VisualMatcher', () => {
  let llm: FakeLLMProvider;
  let stock: FakeStockProvider;
  let matcher: VisualMatcher;

  beforeEach(() => {
    llm = new FakeLLMProvider();
    stock = new FakeStockProvider();
    matcher = new VisualMatcher(llm, stock);
  });

  it('should match scenes to stock videos', async () => {
    llm.queueJsonResponse({ keywords: ['coding'] });
    llm.queueJsonResponse({ keywords: ['laptop'] });
    llm.queueJsonResponse({ keywords: ['terminal'] });

    stock.queueResult({
      assets: [
        {
          id: '1',
          url: 'https://example.com/video.mp4',
          width: 1080,
          height: 1920,
          duration: 15,
          source: 'pexels',
        },
      ],
      totalResults: 1,
      page: 1,
      hasMore: false,
    });

    const result = await matcher.match(mockScript, mockAudio);

    expect(result.scenes).toHaveLength(3);
    expect(result.scenes[0].selectedAsset.source).toBe('pexels');
  });

  it('should use fallback when no results', async () => {
    llm.queueJsonResponse({ keywords: ['obscure-term'] });
    stock.queueResult({ assets: [], totalResults: 0, page: 1, hasMore: false });
    stock.queueResult({
      assets: [
        {
          id: '2',
          url: 'https://example.com/fallback.mp4',
          width: 1080,
          height: 1920,
          duration: 10,
          source: 'pexels',
        },
      ],
      totalResults: 1,
      page: 1,
      hasMore: false,
    });

    const result = await matcher.match(mockScriptSingle, mockAudioSingle, {
      fallbackQuery: 'abstract background',
    });

    expect(result.scenes[0].selectedAsset.url).toContain('fallback');
  });
});
```

---

## 5. Test Stubs Required

```typescript
// src/test/stubs/fake-stock.ts
import { StockProvider, SearchOptions, SearchResult } from '../../visuals/providers/provider';

export class FakeStockProvider implements StockProvider {
  readonly name = 'fake';
  private results: SearchResult[] = [];
  private calls: SearchOptions[] = [];

  queueResult(result: SearchResult): void {
    this.results.push(result);
  }

  getCalls() {
    return this.calls;
  }

  async searchVideos(options: SearchOptions): Promise<SearchResult> {
    this.calls.push(options);

    const result = this.results.shift();
    if (!result) {
      return { assets: [], totalResults: 0, page: 1, hasMore: false };
    }
    return result;
  }

  async getVideo(id: string) {
    return null;
  }
}
```

---

## 6. Validation Checklist

### 6.1 Layer 1: Schema Validation

- [ ] `VisualsOutputSchema` validates all fields
- [ ] Asset URLs are valid
- [ ] Durations are positive
- [ ] Scene IDs match source scenes

### 6.2 Layer 2: Programmatic Checks

- [ ] Keywords extracted for each scene
- [ ] All scenes have matched assets
- [ ] Total duration calculated correctly
- [ ] Portrait videos prioritized

### 6.3 Layer 3: Visual Relevance (LLM-as-Judge)

- [ ] Run relevance eval on 10 samples
- [ ] Keyword → footage match score ≥0.80
- [ ] No obviously mismatched footage

### 6.4 Layer 4: Manual Review

- [ ] Review 5 matched scene sets
- [ ] Footage relates to narration
- [ ] Footage is high quality
- [ ] No inappropriate content

---

## 7. Research References

| Topic                        | Document                                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Visual matching architecture | [SECTION-VISUAL-MATCHING-20260104.md](../research/sections/SECTION-VISUAL-MATCHING-20260104.md)                       |
| Stock footage APIs           | [RQ-05-STOCK-FOOTAGE-20260104.md](../research/investigations/RQ-05-STOCK-FOOTAGE-20260104.md)                         |
| Keyword extraction           | [RQ-06-VISUAL-KEYWORD-EXTRACTION-20260104.md](../research/investigations/RQ-06-VISUAL-KEYWORD-EXTRACTION-20260104.md) |
| MoneyPrinter patterns        | [01-moneyprinter-turbo-20260102.md](../research/01-moneyprinter-turbo-20260102.md)                                    |

---

## 8. Definition of Done

Phase 3 is complete when:

- [ ] `cm visuals` outputs valid visuals.json
- [ ] Pexels API integration works
- [ ] Keyword extraction produces relevant terms
- [ ] Fallback handling works
- [ ] Unit tests pass with >80% coverage
- [ ] Visual relevance review passed

---

**Previous Phase:** [IMPL-PHASE-2-AUDIO-20260105.md](IMPL-PHASE-2-AUDIO-20260105.md)  
**Next Phase:** [IMPL-PHASE-4-RENDER-20260105.md](IMPL-PHASE-4-RENDER-20260105.md)
