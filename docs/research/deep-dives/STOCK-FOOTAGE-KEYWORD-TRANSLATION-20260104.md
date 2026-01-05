# Stock Footage Keyword Translation: Visual Descriptions → API Keywords

**Date:** 2026-01-04  
**Status:** Research Complete  
**Scope:** How vendored repos translate semantic visual directions to stock footage API search terms

---

## Executive Summary

Across the vendored repos, there are **two primary approaches** to translating visual descriptions into stock footage keywords:

1. **LLM-Based Generation** (MoneyPrinterTurbo, ShortGPT, MoneyPrinter) - Uses prompts to extract 1-3 word search terms from scripts/captions
2. **Pre-defined Arrays** (short-video-maker-gyori) - Expects keywords provided directly in scene input, with static fallback terms

**Key Finding:** All repos use LLMs to generate keywords from descriptions. None use keyword extraction libraries, synonym databases, or query expansion APIs.

---

## Pattern 1: LLM-Based Keyword Generation

### MoneyPrinterTurbo - `app/services/llm.py`

**The most complete implementation** - uses LLM to generate search terms from video subject + script.

```python
# vendor/MoneyPrinterTurbo/app/services/llm.py (lines 395-430)

def generate_terms(video_subject: str, video_script: str, amount: int = 5) -> List[str]:
    prompt = f"""
# Role: Video Search Terms Generator

## Goals:
Generate {amount} search terms for stock videos, depending on the subject of a video.

## Constrains:
1. the search terms are to be returned as a json-array of strings.
2. each search term should consist of 1-3 words, always add the main subject of the video.
3. you must only return the json-array of strings. you must not return anything else. you must not return the script.
4. the search terms must be related to the subject of the video.
5. reply with english search terms only.

## Output Example:
["search term 1", "search term 2", "search term 3","search term 4","search term 5"]

## Context:
### Video Subject
{video_subject}

### Video Script
{video_script}

Please note that you must use English for generating video search terms; Chinese is not accepted.
""".strip()
```

**Key Design Decisions:**

- Forces **1-3 words per term** (Pexels works best with short queries)
- Requires **English only** - handles internationalization by translating at LLM level
- Returns **JSON array** - structured output for parsing
- Includes **video script context** - LLM can extract key visual concepts
- Generates **5 terms by default** - multiple fallback options

---

### ShortGPT - `shortGPT/gpt/gpt_editing.py` + `prompt_templates/editing_generate_videos.yaml`

**Timed search query generation** - generates queries per caption segment.

```yaml
# vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_videos.yaml

system_prompt: |
  You are an AI specialized in generating precise video search queries for video editing. 
  You must output ONLY valid JSON in the specified format, with no additional text.

chat_prompt: |
  You are a video editor specializing in creating engaging visual content. 
  Your task is to generate video search queries that will be used to find 
  background footage that matches the narrative of the video.

  For each time segment (4-5 seconds long), you need to suggest 3 alternative 
  search queries that could be used to find appropriate video footage. 
  Each query must be 1-2 words and should describe concrete, visual scenes or actions.

  Guidelines for queries:
  1. Use ONLY English words
  2. Keep queries between 1-2 words
  3. Focus on visual, concrete objects or actions
  4. Avoid abstract concepts
  5. Include both static and dynamic scenes
  6. Ensure queries are family-friendly and safe for monetization

  Good examples:
  - "ocean waves"
  - "typing keyboard"
  - "city traffic"

  Bad examples:
  - "feeling sad" (abstract)
  - "beautiful nature landscape morning sun" (too many words)
  - "confused thoughts" (not visual)

  The output must be valid JSON in this format:
  {
    "video_segments": [
      {
        "time_range": [0.0, 4.324],
        "queries": ["coffee steam", "hot drink", "morning breakfast"]
      },
      {
        "time_range": [4.324, 9.56],
        "queries": ["office work", "desk computer", "typing hands"]
      }
    ]
  }
```

**Key Design Decisions:**

- **1-2 words only** - even stricter than MoneyPrinterTurbo
- **3 alternatives per segment** - built-in fallback strategy
- **Concrete, visual terms** - explicitly avoids abstract concepts
- **Time-aligned** - queries map to specific caption segments
- **Monetization-safe** - filters inappropriate content at prompt level

---

### MoneyPrinter (Original) - `Backend/gpt.py`

```python
# vendor/MoneyPrinter/Backend/gpt.py (lines 159-231)

def get_search_terms(video_subject: str, amount: int, script: str, ai_model: str) -> List[str]:
    prompt = f"""
    Generate {amount} search terms for stock videos,
    depending on the subject of a video.
    Subject: {video_subject}

    The search terms are to be returned as
    a JSON-Array of strings.

    Each search term should consist of 1-3 words,
    always add the main subject of the video.

    YOU MUST ONLY RETURN THE JSON-ARRAY OF STRINGS.
    YOU MUST NOT RETURN ANYTHING ELSE.
    YOU MUST NOT RETURN THE SCRIPT.

    The search terms must be related to the subject of the video.
    Here is an example of a JSON-Array of strings:
    ["search term 1", "search term 2", "search term 3"]

    For context, here is the full text:
    {script}
    """
```

**Same pattern** as MoneyPrinterTurbo, simpler prompt structure.

---

### viralfactory - `engines/Pipelines/prompts/long_form.yaml`

**Hybrid approach** - LLM decides between AI-generated images vs stock footage.

```yaml
# vendor/viralfactory/src/engines/Pipelines/prompts/long_form.yaml (imager section)

Your goal is to create assets for the video. For this, you will be able to
choose between AI generated assets, and stock assets.

Here is when to USE stock assets:
- To illustrate a specific information
- To show specific people, places or things (AI is not good at this)
- Simple actions (eating, walking, etc)

Here is how your output should look like:
{
    "assets": [
        {   // if using stock
            "start": float,
            "end": float,
            "type": "stock",
            "query": "one word to two MAXIMUM words query for the stock asset",
        },
    ]
}
```

**Key insight:** viralfactory explicitly limits stock queries to **1-2 words MAXIMUM**.

---

## Pattern 2: Pre-defined Keywords with Fallbacks

### short-video-maker-gyori - `src/short-creator/libraries/Pexels.ts`

**Does NOT use LLM for keyword generation** - expects keywords in input, uses static fallbacks.

```typescript
// vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts

const jokerTerms: string[] = ["nature", "globe", "space", "ocean"];
const durationBufferSeconds = 3;
const defaultTimeoutMs = 5000;
const retryTimes = 3;

// ...

async findVideo(
  searchTerms: string[],  // ← Keywords provided by caller
  minDurationSeconds: number,
  excludeIds: string[] = [],
  orientation: OrientationEnum = OrientationEnum.portrait,
  timeout: number = defaultTimeoutMs,
  retryCounter: number = 0,
): Promise<Video> {
  // shuffle the search terms to randomize the search order
  const shuffledJokerTerms = jokerTerms.sort(() => Math.random() - 0.5);
  const shuffledSearchTerms = searchTerms.sort(() => Math.random() - 0.5);

  // Try user terms first, then fallback to joker terms
  for (const searchTerm of [...shuffledSearchTerms, ...shuffledJokerTerms]) {
    try {
      return await this._findVideo(
        searchTerm,
        minDurationSeconds,
        excludeIds,
        orientation,
        timeout,
      );
    } catch (error: unknown) {
      // ... retry logic
    }
  }
}
```

**Schema expects keywords pre-generated:**

```typescript
// vendor/short-video-maker-gyori/src/types/shorts.ts

export const sceneInput = z.object({
  text: z.string().describe('Text to be spoken in the video'),
  searchTerms: z
    .array(z.string())
    .describe(
      'Search term for video, 1 word, and at least 2-3 search terms should be provided for each scene.'
    ),
});
```

**Fallback Strategy:**

1. Shuffle user-provided `searchTerms`
2. Try each term in random order
3. If all fail, try `jokerTerms` (nature, globe, space, ocean)
4. Return first successful match

---

## Pattern 3: Multi-Query Fallback Strategy

### ShortGPT - `shortGPT/engine/content_video_engine.py`

```python
# vendor/ShortGPT/shortGPT/engine/content_video_engine.py (lines 84-96)

def _generateVideoUrls(self):
    timed_video_searches = self._db_timed_video_searches
    timed_video_urls = []
    used_links = []

    for (t1, t2), search_terms in timed_video_searches:
        url = ""
        # Try queries in REVERSE order (most specific first? or LLM ordering preference)
        for query in reversed(search_terms):
            url = getBestVideo(query, orientation_landscape=not self._db_format_vertical, used_vids=used_links)
            if url:
                used_links.append(url.split('.hd')[0])
                break
        timed_video_urls.append([[t1, t2], url])
```

**Key Design:**

- Tries **3 alternative queries** per segment
- Iterates in **reverse order** (last query first - unclear why)
- Tracks **used videos** to avoid duplicates

### Faceless-short - `utility/background_video_generator.py`

```python
# vendor/Faceless-short/utility/background_video_generator.py

def generate_video_url(timed_video_searches, video_server):
    timed_video_urls = []
    if video_server == "pexel":
        used_links = []
        for (t1, t2), search_terms in timed_video_searches:
            url = ""
            for query in search_terms:  # ← Normal order (first query first)
                url = getBestVideo(query, orientation_landscape=True, used_vids=used_links)
                if url:
                    used_links.append(url.split('.hd')[0])
                    break
            timed_video_urls.append([[t1, t2], url])
```

**Same pattern**, but iterates in normal order.

---

## Pexels API Integration Patterns

### Query Handling

All repos use **direct string queries** to Pexels - no preprocessing:

```python
# vendor/ShortGPT/shortGPT/api_utils/pexels_api.py

def search_videos(query_string, orientation_landscape=True):
    url = "https://api.pexels.com/videos/search"
    headers = {"Authorization": ApiKeyManager.get_api_key("PEXELS_API_KEY")}
    params = {
        "query": query_string,  # ← Direct pass-through
        "orientation": "landscape" if orientation_landscape else "portrait",
        "per_page": 15
    }
    response = requests.get(url, headers=headers, params=params)
    return response.json()
```

```typescript
// vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts

const response = await fetch(
  `https://api.pexels.com/videos/search?orientation=${orientation}&size=medium&per_page=80&query=${encodeURIComponent(searchTerm)}`
  // ...
);
```

### Query Length Handling

**No explicit handling** - all repos rely on LLM prompts to enforce 1-3 word limits:

| Repo                    | Prompt Constraint   | Actual Enforcement     |
| ----------------------- | ------------------- | ---------------------- |
| MoneyPrinterTurbo       | "1-3 words"         | None (trusts LLM)      |
| ShortGPT                | "1-2 words"         | None (trusts LLM)      |
| viralfactory            | "1-2 words MAXIMUM" | None (trusts LLM)      |
| short-video-maker-gyori | "1 word" in schema  | None (schema doc only) |

**Pexels actual limit:** Not documented, but testing shows queries >5 words often return empty results.

---

## Answers to Specific Questions

### 1. Does anyone use LLM to generate keywords from descriptions?

**YES** - This is the **dominant pattern**:

| Repo                    | LLM Generation | Method                         |
| ----------------------- | -------------- | ------------------------------ |
| MoneyPrinterTurbo       | ✅ Yes         | `generate_terms()` function    |
| ShortGPT                | ✅ Yes         | `getVideoSearchQueriesTimed()` |
| MoneyPrinter            | ✅ Yes         | `get_search_terms()`           |
| viralfactory            | ✅ Yes         | Inline in pipeline prompt      |
| short-video-maker-gyori | ❌ No          | Expects pre-defined input      |

### 2. How do they handle Pexels query length limits?

**Via LLM prompts only** - no runtime validation:

```yaml
# ShortGPT prompt
"Each query must be 1-2 words"

# MoneyPrinterTurbo prompt
"Each search term should consist of 1-3 words"

# viralfactory prompt
"one word to two MAXIMUM words query"
```

**No truncation, no word splitting, no fallback shortening.**

### 3. What happens when primary query returns no results?

**Fallback strategies vary:**

| Repo                    | Fallback Strategy                                         |
| ----------------------- | --------------------------------------------------------- |
| short-video-maker-gyori | `jokerTerms` array: ["nature", "globe", "space", "ocean"] |
| ShortGPT                | Try next of 3 alternative queries (reverse order)         |
| Faceless-short          | Try next of 3 alternative queries (normal order)          |
| MoneyPrinterTurbo       | None - returns empty list, caller handles                 |

**short-video-maker-gyori's joker terms** is the only "generic fallback" pattern found:

```typescript
const jokerTerms: string[] = ['nature', 'globe', 'space', 'ocean'];
```

---

## Missing Patterns (Opportunities)

None of the repos implement:

1. **Synonym expansion** - e.g., "happy" → ["happy", "joyful", "cheerful"]
2. **Query simplification** - e.g., "beautiful sunset over mountains" → "sunset mountains"
3. **Semantic similarity search** - finding related terms via embeddings
4. **Query term ranking** - prioritizing more visually concrete terms
5. **Category-based fallbacks** - e.g., "cooking" fails → try "food", "kitchen"
6. **Historical success tracking** - learning which terms yield good results

---

## Recommended Architecture for content-machine

Based on this research, here's a proposed keyword translation pipeline:

```typescript
interface VisualDescription {
  text: string; // "A developer typing code on a laptop in a coffee shop"
  context: string; // Scene context from script
  duration: number; // How long the clip needs to be
}

interface StockQuery {
  terms: string[]; // ["coding laptop", "developer typing", "coffee shop work"]
  fallbacks: string[]; // ["technology", "workspace", "computer"]
  priority: number; // 1 = most relevant
}

async function translateToKeywords(description: VisualDescription): Promise<StockQuery> {
  // Step 1: LLM extraction (following proven pattern)
  const llmTerms = await generateSearchTerms({
    prompt: `Generate 3 stock video search terms for: "${description.text}"
             Rules: 1-2 words each, concrete/visual, English only.
             Output: JSON array of strings.`,
    maxTokens: 100,
  });

  // Step 2: Category fallbacks (new pattern)
  const category = await classifyVisualCategory(description.text);
  const categoryFallbacks = CATEGORY_FALLBACKS[category]; // e.g., "technology" → ["computer", "office", "screen"]

  // Step 3: Static joker fallbacks (from short-video-maker-gyori)
  const jokerFallbacks = ['nature', 'abstract', 'motion', 'technology'];

  return {
    terms: llmTerms,
    fallbacks: [...categoryFallbacks, ...jokerFallbacks],
    priority: 1,
  };
}
```

---

## File References

| Pattern                      | File Path                                                                                                                                                 | Lines      |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| LLM term generation          | [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)                                                     | 395-466    |
| Video search prompt template | [vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_videos.yaml](../../../vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_videos.yaml) | Full file  |
| Timed query generation       | [vendor/ShortGPT/shortGPT/gpt/gpt_editing.py](../../../vendor/ShortGPT/shortGPT/gpt/gpt_editing.py)                                                       | 51-92      |
| Joker fallback terms         | [vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts)     | 6, 137-180 |
| Multi-query fallback         | [vendor/ShortGPT/shortGPT/engine/content_video_engine.py](../../../vendor/ShortGPT/shortGPT/engine/content_video_engine.py)                               | 84-96      |
| Pexels API wrapper           | [vendor/ShortGPT/shortGPT/api_utils/pexels_api.py](../../../vendor/ShortGPT/shortGPT/api_utils/pexels_api.py)                                             | Full file  |
| Stock/AI hybrid prompts      | [vendor/viralfactory/src/engines/Pipelines/prompts/long_form.yaml](../../../vendor/viralfactory/src/engines/Pipelines/prompts/long_form.yaml)             | 140-175    |
| Schema definition            | [vendor/short-video-maker-gyori/src/types/shorts.ts](../../../vendor/short-video-maker-gyori/src/types/shorts.ts)                                         | 35-40      |

---

## Conclusion

The vendored repos consistently use **LLM prompting** as the primary method for translating visual descriptions to stock footage keywords. The pattern is:

1. **Prompt engineering** enforces 1-3 word limits
2. **Multiple queries** (2-3) per segment for fallback
3. **Static joker terms** as last resort
4. **No runtime validation** of query length

For content-machine, we should adopt this pattern with added improvements:

- Category-based fallback hierarchies
- Query length validation before API call
- Success rate tracking per query term
- Semantic similarity for related term expansion
