# RQ-06: Optimal Embedding Model for Visual Matching

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P1  
**Question:** What's the optimal embedding model for visual matching?

---

## 1. Problem Statement

The system uses embeddings for semantic matching between visual directions and footage descriptions. We need to select:

- Which embedding provider/model to use
- Dimension size tradeoffs
- Multimodal vs text-only embeddings
- Caching and failure handling strategies

---

## 2. Vendor Evidence

### 2.1 Models Found in Vendored Repos

| Provider     | Model                  | Dimensions              | Multimodal | Cost             |
| ------------ | ---------------------- | ----------------------- | ---------- | ---------------- |
| **OpenAI**   | text-embedding-3-small | 512-1536 (configurable) | ❌         | $0.02/1M tokens  |
| **OpenAI**   | text-embedding-3-large | 256-3072 (configurable) | ❌         | $0.13/1M tokens  |
| **CLIP**     | ViT-B/32               | 512                     | ✅         | Free (local)     |
| **VoyageAI** | voyage-multimodal-3.5  | configurable            | ✅         | ~$0.05/1M tokens |
| **Cohere**   | embed-v3               | 1024+                   | ✅         | Variable         |

### 2.2 Does CLIP Work for Text-to-Text?

**Answer: No.** CLIP is designed for cross-modal matching (text↔image). The text encoder optimizes for matching against image embeddings, not other text embeddings.

For text-to-text similarity (visual direction ↔ footage description), use dedicated text embedding models.

### 2.3 API Failure Handling (LlamaIndex)

**Source:** [vendor/agents/llama_index/llama-index-integrations/embeddings/llama-index-embeddings-openai/llama_index/embeddings/openai/utils.py](../../../vendor/agents/llama_index)

```python
from tenacity import retry, stop_after_attempt, stop_after_delay, wait_random_exponential

@retry(
    stop=stop_after_attempt(max_retries) | stop_after_delay(60),
    wait=wait_random_exponential(min=4, max=20),
    retry=retry_if_exception_type((
        openai.RateLimitError,
        openai.APIConnectionError,
        openai.APITimeoutError,
        openai.InternalServerError,
    ))
)
async def embed_with_retry(texts: list[str]) -> list[list[float]]:
    return await client.embeddings.create(input=texts, model=model)
```

### 2.4 Similarity Thresholds (Qdrant)

**Source:** [vendor/storage/qdrant](../../../vendor/storage/qdrant) test fixtures

```python
SIMILARITY_THRESHOLDS = {
    "exact_match": 0.95,      # Near-identical text
    "high_similarity": 0.85,  # Strong semantic match
    "good_match": 0.75,       # Acceptable for footage
    "related": 0.65,          # Loosely related
    "minimum": 0.50,          # Barely related
}
```

### 2.5 Embedding Caching (LlamaIndex)

**Source:** LlamaIndex ingestion cache pattern

```python
from llama_index.core.ingestion import IngestionCache

cache = IngestionCache()

def get_embedding(text: str) -> list[float]:
    content_hash = hash_text(text)

    cached = cache.get(content_hash)
    if cached:
        return cached

    embedding = embed_model.embed(text)
    cache.put(content_hash, embedding)
    return embedding
```

---

## 3. Model Selection Analysis

### 3.1 Use Case Requirements

| Requirement           | Importance | Notes                                  |
| --------------------- | ---------- | -------------------------------------- |
| Text-to-text matching | Critical   | Visual direction → footage description |
| Low latency           | High       | Multiple embeddings per video          |
| Cost efficiency       | High       | ~10 embeddings per video               |
| Multilingual          | Medium     | Future support                         |
| Local option          | Low        | Cloud-first MVP                        |

### 3.2 Model Comparison

| Model                      | Quality   | Speed  | Cost/Video | Recommendation          |
| -------------------------- | --------- | ------ | ---------- | ----------------------- |
| **text-embedding-3-small** | Good      | Fast   | ~$0.0001   | ✅ Default              |
| text-embedding-3-large     | Excellent | Medium | ~$0.0006   | Use for quality tier    |
| voyage-multimodal-3.5      | Excellent | Medium | ~$0.0003   | If image support needed |
| Local SBERT                | Good      | Slow   | Free       | Offline mode only       |

### 3.3 Dimension Tradeoffs

OpenAI embedding models support configurable dimensions:

```typescript
// text-embedding-3-small: 512, 768, 1024, 1536 (default)
// text-embedding-3-large: 256, 512, 1024, 3072 (default)

// Lower dimensions = faster search, slightly lower quality
const embedding = await openai.embeddings.create({
  model: 'text-embedding-3-small',
  input: text,
  dimensions: 512, // Reduce for faster similarity search
});
```

| Dimensions | Storage | Search Speed | Quality     |
| ---------- | ------- | ------------ | ----------- |
| 512        | 2KB     | Fastest      | ~95% of max |
| 1024       | 4KB     | Fast         | ~98% of max |
| 1536       | 6KB     | Standard     | 100%        |

---

## 4. Recommended Implementation

### 4.1 Embedding Provider Configuration

```typescript
// ~/.cmrc.json
{
  "embedding": {
    "provider": "openai",
    "model": "text-embedding-3-small",
    "dimensions": 1024,  // Balance of speed/quality
    "batchSize": 100,    // Max items per API call
  }
}
```

### 4.2 Embedding Client

```typescript
import { OpenAI } from 'openai';
import pLimit from 'p-limit';

class EmbeddingClient {
  private client: OpenAI;
  private cache: Map<string, number[]>;
  private limit = pLimit(5); // Max 5 concurrent requests

  async embed(texts: string[]): Promise<number[][]> {
    // Check cache first
    const uncached: { index: number; text: string }[] = [];
    const results: (number[] | null)[] = texts.map((text, i) => {
      const hash = this.hashText(text);
      const cached = this.cache.get(hash);
      if (cached) return cached;
      uncached.push({ index: i, text });
      return null;
    });

    // Batch embed uncached texts
    if (uncached.length > 0) {
      const embeddings = await this.batchEmbed(uncached.map((u) => u.text));
      uncached.forEach((u, i) => {
        const hash = this.hashText(u.text);
        this.cache.set(hash, embeddings[i]);
        results[u.index] = embeddings[i];
      });
    }

    return results as number[][];
  }

  private async batchEmbed(texts: string[]): Promise<number[][]> {
    const batches = chunk(texts, this.config.batchSize);

    const results = await Promise.all(
      batches.map((batch) => this.limit(() => this.embedWithRetry(batch)))
    );

    return results.flat();
  }

  @retry({ maxAttempts: 3, backoff: 'exponential' })
  private async embedWithRetry(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.config.model,
      input: texts,
      dimensions: this.config.dimensions,
    });

    return response.data.map((d) => d.embedding);
  }
}
```

### 4.3 Similarity Search

```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function findTopK(
  query: number[],
  candidates: { id: string; embedding: number[] }[],
  k: number,
  minThreshold = 0.65
): { id: string; similarity: number }[] {
  return candidates
    .map((c) => ({
      id: c.id,
      similarity: cosineSimilarity(query, c.embedding),
    }))
    .filter((c) => c.similarity >= minThreshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, k);
}
```

### 4.4 Embedding Dimension Migration

```typescript
// Handle model changes that affect dimensions
async function reembedIfNeeded(projectDir: string, currentConfig: EmbeddingConfig): Promise<void> {
  const metaPath = path.join(projectDir, '.cm-meta', 'embeddings.json');

  try {
    const meta = JSON.parse(await fs.readFile(metaPath, 'utf-8'));

    if (meta.model !== currentConfig.model || meta.dimensions !== currentConfig.dimensions) {
      console.warn('Embedding model changed. Re-embedding footage...');
      await reembedFootage(projectDir, currentConfig);
    }
  } catch {
    // No meta file, will embed fresh
  }
}
```

---

## 5. Implementation Recommendations

| Decision           | Recommendation         | Rationale                 |
| ------------------ | ---------------------- | ------------------------- |
| Default model      | text-embedding-3-small | Best cost/quality ratio   |
| Default dimensions | 1024                   | Good balance              |
| Caching            | In-memory + file       | Avoid repeat API calls    |
| Batch size         | 100                    | OpenAI limit              |
| Concurrency        | 5 parallel             | Stay under rate limits    |
| Min threshold      | 0.65                   | Filter irrelevant matches |

---

## 6. Cost Estimation

```
Per video (10 scenes × 2 embeddings each):
- 20 embeddings × ~100 tokens each = 2,000 tokens
- text-embedding-3-small: $0.02 / 1M tokens
- Cost per video: $0.00004 (~$0.04 per 1,000 videos)
```

---

## 7. References

- [vendor/agents/llama_index](../../../vendor/agents/llama_index) — Embedding patterns
- [vendor/storage/qdrant](../../../vendor/storage/qdrant) — Similarity thresholds
- [vendor/Clip-Anything](../../../vendor/Clip-Anything) — Multimodal patterns
- [SECTION-VISUAL-MATCHING-20260104.md](../sections/SECTION-VISUAL-MATCHING-20260104.md) — Matching pipeline
- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings) — Official docs
