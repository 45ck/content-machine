# TASK-013: Semantic Search Pipeline

**Created:** 2026-01-07  
**Status:** Todo  
**Type:** Feature  
**Priority:** P2 (Post-MVP)  
**Estimate:** 12 hours  
**Depends On:** TASK-010 (Quality Gate Framework)  
**Blocks:** None

---

## Summary

Enable semantic footage discovery by indexing stock footage with OpenCLIP embeddings and searching via FAISS. This allows queries like "find footage of city skyline at sunset" instead of keyword matching.

---

## User Story

> As a content creator, I want to find relevant stock footage by describing what I need in natural language so that I don't have to manually browse through thousands of clips.

---

## Acceptance Criteria

- [ ] **Embedding Service:** Generate 512-dim vectors for images and text
- [ ] **Vector Index:** FAISS HNSW index with persistence
- [ ] **Search API:** Query by text or image, return top K results
- [ ] **Batch Indexing:** Efficiently index hundreds of clips
- [ ] Search returns results in < 100ms for 10k index
- [ ] CLI command `cm search "query"` works
- [ ] Index persists to disk and reloads

---

## Technical Design

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    Semantic Search Pipeline                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌─────────────┐ │
│  │   OpenCLIP   │────▶│    FAISS     │────▶│   Results   │ │
│  │  Embeddings  │     │    Index     │     │   Ranked    │ │
│  └──────────────┘     └──────────────┘     └─────────────┘ │
│                                                              │
│  Text: "city skyline"  →  [0.1, 0.3, ...]  →  Top 5 matches │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Services

```typescript
// src/visuals/embeddings.service.ts
export async function embedImage(path: string): Promise<number[]>;
export async function embedText(text: string): Promise<number[]>;
export async function embedBatch(paths: string[]): Promise<number[][]>;

// src/visuals/search.service.ts
export class FootageSearchService {
  async indexFootage(paths: string[], metadata: Metadata[]): Promise<void>;
  async searchByText(query: string, k?: number): Promise<SearchResult[]>;
  async searchByImage(path: string, k?: number): Promise<SearchResult[]>;
  async getIndexStats(): Promise<IndexStats>;
}
```

### Python Scripts

```python
# scripts/embed_images.py
# Input: mode (image|text|batch), content
# Output: { embedding: [...] } or { embeddings: [[...], ...] }

# scripts/vector_search.py
# Input: command (search|add|stats), index_path, data
# Output: { results: [...] } or { added: n } or { count: n }
```

### Index Structure

```
data/
├── footage.index        # FAISS index binary
├── footage.index.meta   # JSON metadata mapping
└── footage.index.stats  # Index statistics
```

---

## Testing Plan

### Unit Tests

1. **Embedding service**
   - Image → 512-dim vector
   - Text → 512-dim vector
   - Batch images → array of vectors
   - Same image → same embedding (deterministic)
2. **Vector index**
   - Add vectors → count increases
   - Search → returns K results
   - Save/load → persists correctly
   - Empty index → returns empty results
3. **Search service**
   - Text query → relevant results
   - Image query → similar images first
   - Metadata preserved in results

### Integration Tests

1. **End-to-end search**
   - Index 100 test images
   - Query "city skyline" → city images ranked higher
   - Query "forest" → nature images ranked higher

### Test Fixtures

- 50 diverse stock images for indexing
- 10 test queries with expected top results

---

## Implementation Steps

1. [ ] Implement `scripts/embed_images.py`
2. [ ] Implement `scripts/vector_search.py`
3. [ ] Create `embeddings.service.ts` with tests
4. [ ] Create `vector-index.ts` with tests
5. [ ] Create `search.service.ts` with tests
6. [ ] Add CLI command `cm search`
7. [ ] Add CLI command `cm index`
8. [ ] Create test fixtures (images)
9. [ ] Performance benchmarks
10. [ ] Documentation

---

## CLI Commands

```bash
# Index footage directory
cm index ./footage --recursive

# Search by text
cm search "city skyline at sunset" --top 10

# Search by image (find similar)
cm search --image reference.jpg --top 5

# Index stats
cm index --stats
```

---

## Dependencies

### Python Packages

```bash
pip install open-clip-torch==2.24.0
pip install faiss-cpu==1.7.4  # or faiss-gpu
pip install torch==2.1.0
pip install torchvision==0.16.0
pip install pillow==10.2.0
pip install numpy==1.26.4
```

### Storage Requirements

- Index: ~4KB per image (512 floats × 4 bytes + overhead)
- 10k images ≈ 40MB index

---

## Performance Targets

| Operation        | Target  | Index Size |
| ---------------- | ------- | ---------- |
| Single embed     | < 100ms | N/A        |
| Batch embed (16) | < 500ms | N/A        |
| Search           | < 10ms  | 1k         |
| Search           | < 50ms  | 10k        |
| Search           | < 100ms | 100k       |

---

## Schema

```typescript
// src/visuals/search.schema.ts
import { z } from 'zod';

export const SearchResultSchema = z.object({
  id: z.string(),
  path: z.string(),
  score: z.number(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultSchema),
  totalIndexed: z.number(),
  searchTimeMs: z.number(),
});
```

---

## Verification Checklist

- [ ] All acceptance criteria met
- [ ] Search returns relevant results
- [ ] Performance targets met
- [ ] Index persists correctly
- [ ] CLI commands work
- [ ] Documentation complete

---

## Notes

- OpenCLIP model loads once, cache in memory
- HNSW index is best for our scale (1k-100k)
- Consider thumbnail extraction for video indexing
- Metadata should include: path, duration, source, tags
