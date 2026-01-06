export interface VectorIndexItem<Metadata> {
  id: string;
  embedding: Float32Array;
  metadata: Metadata;
}

export interface SearchResult<Metadata> {
  id: string;
  score: number;
  metadata: Metadata;
}

function dot(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) throw new Error('Vector dimension mismatch');
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export class BruteForceVectorIndex<Metadata> {
  readonly dimensions: number;
  private readonly items: VectorIndexItem<Metadata>[] = [];

  constructor(dimensions: number) {
    if (!Number.isInteger(dimensions) || dimensions <= 0) {
      throw new Error(`Invalid dimensions: ${dimensions}`);
    }
    this.dimensions = dimensions;
  }

  add(item: VectorIndexItem<Metadata>): void {
    if (item.embedding.length !== this.dimensions) {
      throw new Error('Vector dimension mismatch');
    }
    this.items.push(item);
  }

  search(queryEmbedding: Float32Array, k: number): SearchResult<Metadata>[] {
    if (queryEmbedding.length !== this.dimensions) {
      throw new Error('Vector dimension mismatch');
    }
    const topK = Math.max(0, Math.floor(k));
    if (topK === 0) return [];

    const scored: SearchResult<Metadata>[] = this.items.map((item) => ({
      id: item.id,
      score: dot(queryEmbedding, item.embedding),
      metadata: item.metadata,
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }
}
