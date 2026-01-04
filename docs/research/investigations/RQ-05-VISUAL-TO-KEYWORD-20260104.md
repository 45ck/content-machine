# RQ-05: Visual Direction to Keyword Translation

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How do we translate semantic visual directions to stock footage API keywords?

---

## 1. Problem Statement

The design claims "no keyword matching" for footage selection, but stock APIs like Pexels are keyword-based. The document doesn't explain how semantic visual directions (e.g., "a person celebrating a victory") translate to API queries (e.g., "celebration happy").

---

## 2. Vendor Evidence

### 2.1 LLM-Generated Keywords (MoneyPrinterTurbo)

**Source:** [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py)

All major repos use LLM prompting for keyword generation—no NLP libraries:

```python
def generate_video_terms(topic: str, amount: int = 5) -> list[str]:
    prompt = f"""
# Role
You are a stock video search expert.

# Task
Generate {amount} search terms for stock videos related to: {topic}

## Constraints
1. Return as a JSON array of strings
2. Each term should be 1-3 words
3. Always include the main subject
4. Use English only
5. Focus on visual, concrete terms (not abstract concepts)

## Example
Topic: "person working from home"
Output: ["home office", "laptop typing", "remote work", "coffee desk", "video call"]
"""
    
    response = llm.complete(prompt)
    return json.loads(response)
```

### 2.2 Word Length Constraints in Prompts

| Repo | Constraint | Source |
|------|------------|--------|
| MoneyPrinterTurbo | "1-3 words" | llm.py |
| ShortGPT | "1-2 words" | YAML prompts |
| viralfactory | "one to two MAXIMUM words" | Inline prompt |

### 2.3 Joker/Fallback Terms (short-video-maker-gyori)

**Source:** [vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts)

```typescript
const jokerTerms: string[] = ["nature", "globe", "space", "ocean"];

async function searchVideo(searchTerms: string[]): Promise<Video | null> {
  const shuffledSearchTerms = shuffleArray([...searchTerms]);
  const shuffledJokerTerms = shuffleArray([...jokerTerms]);
  
  // Try user terms first, then fallback to joker terms
  for (const searchTerm of [...shuffledSearchTerms, ...shuffledJokerTerms]) {
    const result = await pexelsClient.search({ query: searchTerm });
    if (result.videos.length > 0) {
      return pickBestVideo(result.videos);
    }
  }
  
  return null;
}
```

### 2.4 Multiple Alternative Queries (ShortGPT)

**Source:** [vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_images.yaml](../../../vendor/ShortGPT/shortGPT/prompt_templates/editing_generate_images.yaml)

ShortGPT generates 3 alternative queries per segment:

```yaml
response_format:
  - name: searchQueries
    description: "3 alternative stock video search queries for this scene"
    type: array
    items:
      type: string
```

### 2.5 Query Simplification Pattern

**Observed Gap:** No repos implement runtime query simplification. All rely on prompt constraints.

---

## 3. Recommended Patterns for content-machine

### 3.1 LLM Keyword Extraction Prompt

```typescript
const KEYWORD_EXTRACTION_PROMPT = `
You are a stock video search expert. Given a visual description, generate effective search keywords.

## Input
Visual direction: {{visualDirection}}
Scene context: {{sceneContext}}
Mood: {{mood}}

## Output Requirements
Generate a JSON object with:
1. "primary": Main search term (1-2 words, most specific)
2. "alternatives": 3 backup terms (1-2 words each)
3. "concepts": Abstract concepts for embedding matching

## Example
Input: "A developer celebrating after fixing a difficult bug"
Output: {
  "primary": "celebration success",
  "alternatives": ["happy programmer", "victory moment", "achievement joy"],
  "concepts": ["accomplishment", "relief", "breakthrough"]
}

## Rules
- Use visually concrete terms (things a camera can capture)
- Avoid abstract words that don't translate to video
- Keep each term under 30 characters (API limit)
- Use English only
`;

const KeywordResultSchema = z.object({
  primary: z.string().max(30),
  alternatives: z.array(z.string().max(30)).max(5),
  concepts: z.array(z.string()).max(5),
});
```

### 3.2 Cascading Search Strategy

```typescript
async function searchWithFallbacks(
  scene: Scene,
  keywords: KeywordResult
): Promise<StockVideo | null> {
  
  // Level 1: Primary keyword
  let result = await searchPexels(keywords.primary);
  if (result) return result;
  
  // Level 2: Alternative keywords
  for (const alt of keywords.alternatives) {
    result = await searchPexels(alt);
    if (result) return result;
  }
  
  // Level 3: Simplified single-word queries
  const singleWords = keywords.primary.split(' ');
  for (const word of singleWords) {
    result = await searchPexels(word);
    if (result) return result;
  }
  
  // Level 4: Joker terms based on mood
  const jokerTerms = getJokerTermsForMood(scene.mood);
  for (const joker of jokerTerms) {
    result = await searchPexels(joker);
    if (result) return result;
  }
  
  return null;  // Will use gradient fallback
}
```

### 3.3 Mood-Based Joker Terms

```typescript
const MOOD_JOKER_TERMS: Record<string, string[]> = {
  happy: ["celebration", "sunshine", "nature", "friends"],
  sad: ["rain", "clouds", "alone", "sunset"],
  excited: ["fireworks", "crowd", "sports", "action"],
  calm: ["ocean", "forest", "mountains", "sky"],
  tense: ["storm", "city night", "shadows", "clock"],
  neutral: ["nature", "globe", "space", "abstract"],
};

function getJokerTermsForMood(mood: string | undefined): string[] {
  return MOOD_JOKER_TERMS[mood ?? 'neutral'] ?? MOOD_JOKER_TERMS.neutral;
}
```

### 3.4 Pexels API Constraints Handler

```typescript
const PEXELS_CONSTRAINTS = {
  maxQueryLength: 80,
  maxResultsPerPage: 80,
  language: 'en',  // API primarily English
};

function sanitizeQuery(query: string): string {
  // Remove special characters
  let sanitized = query.replace(/[^\w\s]/g, ' ');
  
  // Collapse whitespace
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Truncate to max length
  if (sanitized.length > PEXELS_CONSTRAINTS.maxQueryLength) {
    sanitized = sanitized.slice(0, PEXELS_CONSTRAINTS.maxQueryLength);
    // Don't cut mid-word
    sanitized = sanitized.replace(/\s\w*$/, '');
  }
  
  return sanitized;
}
```

### 3.5 Hybrid: Embeddings + Keywords

```typescript
async function findBestFootage(
  scene: Scene,
  userFootage: EmbeddedFootage[],
  stockEnabled: boolean
): Promise<FootageMatch> {
  
  // Step 1: Embed visual direction
  const queryEmbedding = await embed(scene.visualDirection);
  
  // Step 2: Search user footage by embedding similarity
  const userMatches = userFootage
    .map(f => ({
      footage: f,
      similarity: cosineSimilarity(queryEmbedding, f.embedding),
    }))
    .filter(m => m.similarity > 0.7)
    .sort((a, b) => b.similarity - a.similarity);
  
  if (userMatches.length > 0) {
    return { source: 'user', ...userMatches[0] };
  }
  
  // Step 3: Generate keywords for stock API
  if (stockEnabled) {
    const keywords = await generateKeywords(scene);
    const stockVideo = await searchWithFallbacks(scene, keywords);
    
    if (stockVideo) {
      return { source: 'stock', footage: stockVideo };
    }
  }
  
  // Step 4: Fallback
  return { source: 'fallback', type: 'gradient', mood: scene.mood };
}
```

---

## 4. Quality Improvements

### 4.1 Keyword Success Tracking

```typescript
interface KeywordStats {
  query: string;
  resultCount: number;
  selectedVideoId?: string;
  wasUsed: boolean;
}

async function trackKeywordSuccess(
  projectDir: string,
  stats: KeywordStats[]
): Promise<void> {
  // Log for future prompt improvement
  await appendToLog(
    path.join(projectDir, '.cm-analytics', 'keyword-stats.jsonl'),
    stats
  );
}
```

### 4.2 Translation Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Primary hit rate | >60% | Primary keyword returns usable video |
| Any hit rate | >90% | At least one query succeeds |
| Joker rate | <20% | Fallback to generic terms |
| Semantic relevance | >0.7 | Embedding similarity of selected video |

---

## 5. Implementation Recommendations

| Pattern | Priority | Rationale |
|---------|----------|-----------|
| LLM keyword generation | P0 | Core translation mechanism |
| Cascading search | P0 | Handle API failures gracefully |
| Query sanitization | P0 | Respect API limits |
| Mood-based jokers | P1 | Better fallbacks than random |
| Success tracking | P2 | Improve prompts over time |

---

## 6. References

- [vendor/MoneyPrinterTurbo/app/services/llm.py](../../../vendor/MoneyPrinterTurbo/app/services/llm.py) — Keyword generation
- [vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts](../../../vendor/short-video-maker-gyori/src/short-creator/libraries/Pexels.ts) — Joker fallbacks
- [vendor/ShortGPT/shortGPT/prompt_templates](../../../vendor/ShortGPT/shortGPT/prompt_templates) — YAML prompts
- [SECTION-VISUAL-MATCHING-20260104.md](../sections/SECTION-VISUAL-MATCHING-20260104.md) — Pexels integration
