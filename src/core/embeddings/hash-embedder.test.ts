import { describe, expect, it } from 'vitest';
import { HashEmbeddingProvider } from './hash-embedder';

describe('HashEmbeddingProvider', () => {
  it('is deterministic', async () => {
    const embedder = new HashEmbeddingProvider({ dimensions: 64 });
    const a = await embedder.embed('Hello world');
    const b = await embedder.embed('Hello world');
    expect(Array.from(a)).toEqual(Array.from(b));
  });

  it('normalizes vectors (unit length when non-empty)', async () => {
    const embedder = new HashEmbeddingProvider({ dimensions: 64 });
    const v = await embedder.embed('one two three');
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0));
    expect(norm).toBeCloseTo(1, 6);
  });
});

