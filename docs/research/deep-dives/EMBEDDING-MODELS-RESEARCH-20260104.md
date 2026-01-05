# Embedding Models Research: Visual/Text Matching for Video Generation

**Date:** 2026-01-04  
**Scope:** Clip-Anything, Qdrant, LlamaIndex embeddings, Weaviate clients  
**Focus:** Optimal embedding models for multimodal matching in video generation

---

## Executive Summary

Research across vendored repos reveals clear patterns for embedding-based matching:

1. **No vendored short-video repos use embeddings** - All use keyword-based search (Pexels, Pixabay APIs)
2. **CLIP is the standard for multimodal (text+image) embeddings** - Used in LlamaIndex's ClipEmbedding
3. **OpenAI text-embedding-3-small/large** for text-only semantic search
4. **VoyageAI multimodal-3/3.5** supports text, image, AND video embeddings
5. **Cohere embed-v4.0** offers multimodal with binary quantization options

**Key Finding:** CLIP is designed for cross-modal matching (text→image, image→text) but NOT text→text. For text-to-text, use dedicated text embeddings (OpenAI, Voyage, Cohere).

---

## 1. Embedding Models Found in Vendored Repos

### 1.1 OpenAI Embeddings

**Source:** [llama-index-embeddings-openai/base.py](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-openai/llama_index/embeddings/openai/base.py)

```python
class OpenAIEmbeddingModelType(str, Enum):
    """OpenAI embedding model type."""
    DAVINCI = "davinci"
    CURIE = "curie"
    BABBAGE = "babbage"
    ADA = "ada"
    TEXT_EMBED_ADA_002 = "text-embedding-ada-002"
    TEXT_EMBED_3_LARGE = "text-embedding-3-large"
    TEXT_EMBED_3_SMALL = "text-embedding-3-small"
```

#### Model Dimensions & Costs

| Model                    | Dimensions              | Price per 1M tokens | Use Case             |
| ------------------------ | ----------------------- | ------------------- | -------------------- |
| `text-embedding-ada-002` | 1536                    | $0.10               | Legacy, good balance |
| `text-embedding-3-small` | 512-1536 (configurable) | $0.02               | Cost-effective       |
| `text-embedding-3-large` | 256-3072 (configurable) | $0.13               | Highest quality      |

**Key Feature:** V3 models support **configurable dimensions** via the `dimensions` parameter:

```python
# From OpenAI embedding client
dimensions: Optional[int] = Field(
    default=None,
    description=(
        "The number of dimensions on the output embedding vectors. "
        "Works only with v3 embedding models."
    ),
)
```

---

### 1.2 CLIP Embeddings (Multimodal)

**Source:** [llama-index-embeddings-clip/base.py](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-clip/llama_index/embeddings/clip/base.py)

```python
DEFAULT_CLIP_MODEL = "ViT-B/32"

class ClipEmbedding(MultiModalEmbedding):
    """
    CLIP embedding models for encoding text and image for Multi-Modal purpose.

    Requires `clip` package: pip install git+https://github.com/openai/CLIP.git
    """

    def _get_text_embeddings(self, texts: List[str]) -> List[Embedding]:
        results = []
        for text in texts:
            text_embedding = self._model.encode_text(
                clip.tokenize(text).to(self._device)
            )
            results.append(text_embedding.tolist()[0])
        return results

    def _get_image_embedding(self, img_file_path: ImageType) -> Embedding:
        with torch.no_grad():
            image = (
                self._preprocess(Image.open(img_file_path))
                .unsqueeze(0)
                .to(self._device)
            )
            return self._model.encode_image(image).tolist()[0]
```

#### CLIP Model Variants

| Model            | Dimension | Speed   | Quality            |
| ---------------- | --------- | ------- | ------------------ |
| `ViT-B/32`       | 512       | Fast    | Good               |
| `ViT-B/16`       | 512       | Medium  | Better             |
| `ViT-L/14`       | 768       | Slow    | Best               |
| `ViT-L/14@336px` | 768       | Slowest | Highest resolution |

**⚠️ CRITICAL: CLIP for Text-to-Text?**

> **No.** CLIP is designed for **cross-modal** matching (text↔image). The text encoder is optimized for matching with image embeddings, NOT for semantic similarity between texts. For text-to-text matching, use dedicated text embedding models.

**When to use CLIP:**

- Match script text → stock footage frames
- Match image descriptions → uploaded images
- Visual similarity search

**When NOT to use CLIP:**

- Script → script similarity
- Caption → caption deduplication
- Trend text matching

---

### 1.3 VoyageAI Embeddings (Multimodal + Video)

**Source:** [llama-index-embeddings-voyageai/base.py](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-voyageai/llama_index/embeddings/voyageai/base.py)

```python
MULTIMODAL_MODELS = ["voyage-multimodal-3", "voyage-multimodal-3.5"]
VIDEO_MODELS = ["voyage-multimodal-3.5"]  # Only voyage-multimodal-3.5 supports video
CONTEXT_MODELS = ["voyage-context-3"]

VOYAGE_TOTAL_TOKEN_LIMITS = {
    "voyage-context-3": 32_000,
    "voyage-multimodal-3": 320_000,  # 32k per input, 320k total
    "voyage-multimodal-3.5": 320_000,
    "voyage-3.5-lite": 1_000_000,
    "voyage-3.5": 320_000,
    "voyage-3-large": 120_000,
    "voyage-code-3": 120_000,
    # ...
}
```

#### Video Embedding Support (Unique to Voyage)

```python
def get_video_embedding(
    self, video_path: Union[str, Path], input_type: Optional[str] = None
) -> List[float]:
    """
    Get embedding for a video file.
    Only supported with voyage-multimodal-3.5 model.
    Requires voyageai>=0.3.6 for video support.

    Args:
        video_path: Path to the video file (max 20MB).
    """
    video = self._video_to_content(video_path)
    return self._client.multimodal_embed(
        model=self.model_name,
        inputs=[[video]],
        input_type=input_type,
        truncation=self.truncation if self.truncation is not None else True,
    ).embeddings[0]
```

#### Output Dimension Control

```python
output_dimension: Optional[int] = None  # Configurable output dimension
```

---

### 1.4 Cohere Embeddings

**Source:** [llama-index-embeddings-cohere/base.py](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-cohere/llama_index/embeddings/cohere/base.py)

```python
class CohereAIModelName(str, Enum):
    ENGLISH_V3 = "embed-english-v3.0"
    ENGLISH_LIGHT_V3 = "embed-english-light-v3.0"
    MULTILINGUAL_V3 = "embed-multilingual-v3.0"
    MULTILINGUAL_LIGHT_V3 = "embed-multilingual-light-v3.0"
    ENGLISH_V2 = "embed-english-v2.0"
    ENGLISH_LIGHT_V2 = "embed-english-light-v2.0"
    MULTILINGUAL_V2 = "embed-multilingual-v2.0"
    EMBED_V4 = "embed-v4.0"

VALID_MODEL_EMBEDDING_TYPES = {
    CAMN.EMBED_V4: ["float", "int8", "uint8", "binary", "ubinary"],
    CAMN.ENGLISH_V3: ["float", "int8", "uint8", "binary", "ubinary"],
    # ...
}

# Maximum batch size for Cohere API
MAX_EMBED_BATCH_SIZE = 96
```

#### Embedding Types (Quantization)

| Type      | Storage     | Quality | Use Case                      |
| --------- | ----------- | ------- | ----------------------------- |
| `float`   | 4 bytes/dim | Full    | Default, highest quality      |
| `int8`    | 1 byte/dim  | ~99%    | 4x storage reduction          |
| `uint8`   | 1 byte/dim  | ~99%    | Unsigned variant              |
| `binary`  | 1 bit/dim   | ~95%    | 32x compression, fast hamming |
| `ubinary` | 1 bit/dim   | ~95%    | Unsigned binary               |

---

## 2. Vector Database Integration (Qdrant)

**Source:** [vendor/storage/qdrant/](../../../vendor/storage/qdrant/)

### 2.1 Distance Metrics

```json
// From schema.json
"Distance": {
  "type": "string",
  "enum": ["Cosine", "Euclid", "Dot", "Manhattan"]
}
```

**Recommendation by embedding type:**

| Embedding Model     | Recommended Distance |
| ------------------- | -------------------- |
| OpenAI              | Cosine               |
| CLIP                | Cosine               |
| VoyageAI            | Cosine               |
| Cohere (normalized) | Dot                  |

### 2.2 Similarity Threshold Configuration

**Source:** [vendor/storage/qdrant/tests/openapi/test_score_threshold.py](../../../vendor/storage/qdrant/tests/openapi/test_score_threshold.py)

```python
def test_search_with_threshold(collection_name):
    response = request_with_validation(
        api='/collections/{collection_name}/points/search',
        method="POST",
        body={
            "vector": [0.2, 0.1, 0.9, 0.7],
            "limit": 3,
            "score_threshold": 0.75  # Only return results above this score
        }
    )
```

**Typical thresholds by use case:**

| Use Case        | Threshold | Notes                    |
| --------------- | --------- | ------------------------ |
| Exact match     | 0.95+     | Near-duplicate detection |
| High similarity | 0.85-0.95 | Same topic/intent        |
| Related content | 0.70-0.85 | Semantically related     |
| Loose match     | 0.50-0.70 | Might be relevant        |

---

## 3. Embedding API Failure Handling

### 3.1 OpenAI Retry Pattern

**Source:** [llama-index-embeddings-openai/utils.py](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-openai/llama_index/embeddings/openai/utils.py)

```python
from tenacity import (
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    stop_after_delay,
    wait_exponential,
    wait_random_exponential,
)

def create_retry_decorator(
    max_retries: int,
    random_exponential: bool = False,
    stop_after_delay_seconds: Optional[float] = None,
    min_seconds: float = 4,
    max_seconds: float = 10,
) -> Callable[[Any], Any]:
    wait_strategy = (
        wait_random_exponential(min=min_seconds, max=max_seconds)
        if random_exponential
        else wait_exponential(multiplier=1, min=min_seconds, max=max_seconds)
    )

    stop_strategy: stop_base = stop_after_attempt(max_retries)
    if stop_after_delay_seconds is not None:
        stop_strategy = stop_strategy | stop_after_delay(stop_after_delay_seconds)

    return retry(
        reraise=True,
        stop=stop_strategy,
        wait=wait_strategy,
        retry=(
            retry_if_exception_type(
                (
                    openai.APIConnectionError,
                    openai.APITimeoutError,
                    openai.RateLimitError,
                    openai.InternalServerError,
                )
            )
        ),
        before_sleep=before_sleep_log(logger, logging.WARNING),
    )
```

### 3.2 Weaviate Rate Limiting

**Source:** [vendor/storage/weaviate/usecases/modulecomponents/clients/voyageai/voyageai.go](../../../vendor/storage/weaviate/usecases/modulecomponents/clients/voyageai/voyageai.go)

```go
func (c *Client) GetVectorizerRateLimit(ctx context.Context, modelRL VoyageRLModel) *modulecomponents.RateLimits {
    rpm, tpm := modulecomponents.GetRateLimitFromContext(ctx, "Voyageai", modelRL.RequestLimit, modelRL.TokenLimit)
    execAfterRequestFunction := func(limits *modulecomponents.RateLimits, tokensUsed int, deductRequest bool) {
        // Refresh is after 60 seconds but leave room for errors
        if limits.LastOverwrite.Add(61 * time.Second).After(time.Now()) {
            if deductRequest {
                limits.RemainingRequests -= 1
            }
            limits.RemainingTokens -= tokensUsed
            return
        }
        // Reset limits after window
        limits.RemainingRequests = rpm
        limits.ResetRequests = time.Now().Add(time.Duration(61) * time.Second)
        // ...
    }
    return initialRL
}
```

### 3.3 OpenAI Rate Limit Headers

**Source:** [vendor/storage/weaviate/usecases/modulecomponents/clients/openai/openai.go](../../../vendor/storage/weaviate/usecases/modulecomponents/clients/openai/openai.go)

```go
func (v *Client) getRateLimitsFromHeader(header http.Header, isAzure bool) *modulecomponents.RateLimits {
    requestsReset, _ := time.ParseDuration(header.Get("x-ratelimit-reset-requests"))
    tokensReset, _ := time.ParseDuration(header.Get("x-ratelimit-reset-tokens"))
    limitRequests := getHeaderInt(header, "x-ratelimit-limit-requests")
    limitTokens := getHeaderInt(header, "x-ratelimit-limit-tokens")
    remainingRequests := getHeaderInt(header, "x-ratelimit-remaining-requests")
    remainingTokens := getHeaderInt(header, "x-ratelimit-remaining-tokens")
    // ...
}
```

---

## 4. Embedding Caching Strategies

### 4.1 LlamaIndex IngestionCache

**Source:** [vendor/agents/llama-index/llama-index-core/tests/ingestion/test_cache.py](../../../vendor/agents/llama-index/llama-index-core/tests/ingestion/test_cache.py)

```python
from llama_index.core.ingestion import IngestionCache

def test_cache():
    cache = IngestionCache()

    # Create hash for content
    hash = "some_hash_value"
    new_nodes = [TextNode(text="This is a test node")]

    # Store embeddings
    cache.put(hash, new_nodes)

    # Retrieve from cache
    cache_hit = cache.get(hash)
    assert cache_hit is not None

    # Clear cache
    cache.clear()
```

### 4.2 Weaviate Vector Caching

**Source:** [vendor/storage/weaviate/entities/vectorindex/common/config.go](../../../vendor/storage/weaviate/entities/vectorindex/common/config.go)

```go
DefaultVectorCacheMaxObjects = 1e12  // Cache up to 1 trillion vectors
```

### 4.3 Recommended Caching Strategy

```typescript
// Suggested implementation for content-machine
interface EmbeddingCache {
  // Content hash → embedding mapping
  get(contentHash: string): Promise<number[] | null>;
  set(contentHash: string, embedding: number[], ttl?: number): Promise<void>;

  // Batch operations
  getMany(hashes: string[]): Promise<Map<string, number[]>>;
  setMany(entries: Map<string, number[]>): Promise<void>;
}

// Hash function for cache keys
function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
```

---

## 5. Dimension Size Tradeoffs

| Dimensions | Storage/Vector | Search Speed | Quality | Use Case                    |
| ---------- | -------------- | ------------ | ------- | --------------------------- |
| 256        | 1 KB           | Fastest      | Good    | High-volume, cost-sensitive |
| 512        | 2 KB           | Fast         | Better  | Default CLIP                |
| 768        | 3 KB           | Medium       | Good    | CLIP ViT-L                  |
| 1024       | 4 KB           | Medium       | Better  | Balanced                    |
| 1536       | 6 KB           | Slower       | High    | OpenAI ada-002              |
| 3072       | 12 KB          | Slowest      | Highest | OpenAI 3-large              |

**Recommendation for content-machine:**

- **Script text matching:** `text-embedding-3-small` at 512-1024 dimensions
- **Visual matching:** CLIP `ViT-B/32` (512d) or VoyageAI multimodal
- **Video matching:** VoyageAI `voyage-multimodal-3.5`

---

## 6. Model Comparison for Video Generation

### 6.1 Text-to-Text (Script similarity, trend matching)

| Model          | Dimensions | Cost      | Quality   | Latency |
| -------------- | ---------- | --------- | --------- | ------- |
| OpenAI 3-small | 512-1536   | $0.02/1M  | Good      | Low     |
| OpenAI 3-large | 256-3072   | $0.13/1M  | Best      | Medium  |
| VoyageAI 3.5   | Varies     | ~$0.05/1M | Excellent | Low     |
| Cohere v3      | 1024       | ~$0.10/1M | Good      | Low     |

**Winner:** OpenAI `text-embedding-3-small` for cost, VoyageAI `voyage-3.5` for quality

### 6.2 Text-to-Image (Script → stock footage)

| Model                 | Dimensions | Multimodal | Cost         |
| --------------------- | ---------- | ---------- | ------------ |
| CLIP ViT-B/32         | 512        | ✅         | Free (local) |
| CLIP ViT-L/14         | 768        | ✅         | Free (local) |
| VoyageAI multimodal-3 | Varies     | ✅         | API cost     |
| Cohere embed-v4.0     | 1024       | ✅         | API cost     |

**Winner:** CLIP for local processing, VoyageAI for API-based

### 6.3 Video Embeddings (Unique capability)

| Model                   | Video Support | Max Size | Notes                     |
| ----------------------- | ------------- | -------- | ------------------------- |
| VoyageAI multimodal-3.5 | ✅            | 20MB     | Only production option    |
| CLIP (frame sampling)   | ❌ (manual)   | N/A      | Requires frame extraction |

**Winner:** VoyageAI `voyage-multimodal-3.5` (only option)

---

## 7. Recommendations for content-machine

### 7.1 Primary Stack

```typescript
const embeddingConfig = {
  // Text similarity (scripts, trends)
  text: {
    model: 'text-embedding-3-small',
    dimensions: 1024, // Balance of quality/cost
    provider: 'openai',
  },

  // Visual matching (script → footage)
  multimodal: {
    model: 'voyage-multimodal-3', // or CLIP for local
    provider: 'voyageai',
  },

  // Video matching (when needed)
  video: {
    model: 'voyage-multimodal-3.5',
    provider: 'voyageai',
  },
};
```

### 7.2 Failure Handling

```typescript
// Use tenacity-style retry pattern
const retryConfig = {
  maxRetries: 10,
  minWaitSeconds: 4,
  maxWaitSeconds: 20,
  exponentialBackoff: true,
  retryOn: ['RateLimitError', 'APIConnectionError', 'APITimeoutError', 'InternalServerError'],
};
```

### 7.3 Caching Strategy

```typescript
// Redis or SQLite-based cache
const cacheConfig = {
  backend: 'redis', // or "sqlite" for local dev
  ttl: 86400 * 30, // 30 days for embeddings
  keyPrefix: 'embed:',
  hashFunction: 'sha256',
};
```

### 7.4 Similarity Thresholds

```typescript
const thresholds = {
  exactMatch: 0.95, // Duplicate detection
  highSimilarity: 0.85, // Very related content
  goodMatch: 0.75, // Default for footage matching
  looseMatch: 0.6, // Fallback threshold
};
```

---

## 8. Key Findings

1. **CLIP is NOT for text-to-text** - Use OpenAI/Voyage for script similarity
2. **VoyageAI is the only option for video embeddings** (voyage-multimodal-3.5)
3. **Configurable dimensions** are a V3 feature in OpenAI - use 512-1024 for balance
4. **Binary quantization** (Cohere) can reduce storage 32x with ~5% quality loss
5. **All vendored short-video repos use keyword search** - embedding-based is an opportunity
6. **Rate limiting is handled via headers** - parse `x-ratelimit-*` headers
7. **Caching by content hash** is the standard pattern

---

## References

- [LlamaIndex CLIP Embedding](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-clip/)
- [LlamaIndex OpenAI Embedding](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-openai/)
- [LlamaIndex VoyageAI Embedding](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-voyageai/)
- [LlamaIndex Cohere Embedding](../../../vendor/agents/llama-index/llama-index-integrations/embeddings/llama-index-embeddings-cohere/)
- [Weaviate OpenAI Client](../../../vendor/storage/weaviate/usecases/modulecomponents/clients/openai/)
- [Weaviate VoyageAI Client](../../../vendor/storage/weaviate/usecases/modulecomponents/clients/voyageai/)
- [Qdrant Schema](../../../vendor/storage/qdrant/tools/schema2openapi/schema.json)
- [Footage Matching Research](./FOOTAGE-MATCHING-20260104.md)
