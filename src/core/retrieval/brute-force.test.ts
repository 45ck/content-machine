import { describe, expect, it } from 'vitest';
import { HashEmbeddingProvider } from '../embeddings/hash-embedder';
import { BruteForceVectorIndex } from './brute-force';

describe('BruteForceVectorIndex', () => {
  it('returns the most similar item first', async () => {
    const embedder = new HashEmbeddingProvider({ dimensions: 64 });
    const index = new BruteForceVectorIndex<{ text: string }>(64);

    index.add({ id: 'a', embedding: await embedder.embed('redis caching'), metadata: { text: 'a' } });
    index.add({ id: 'b', embedding: await embedder.embed('kubernetes orchestration'), metadata: { text: 'b' } });

    const results = index.search(await embedder.embed('redis cache'), 1);
    expect(results[0].id).toBe('a');
  });
});

