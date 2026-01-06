import type { EmbeddingProvider } from './types';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((t) => t.trim())
    .filter(Boolean);
}

function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function l2Normalize(vec: Float32Array): Float32Array {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) sumSq += vec[i] * vec[i];
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm === 0) return vec;
  for (let i = 0; i < vec.length; i++) vec[i] = vec[i] / norm;
  return vec;
}

export class HashEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(options?: { dimensions?: number }) {
    this.dimensions = options?.dimensions ?? 256;
    if (!Number.isInteger(this.dimensions) || this.dimensions <= 0) {
      throw new Error(`Invalid dimensions: ${this.dimensions}`);
    }
  }

  async embed(text: string): Promise<Float32Array> {
    const vec = new Float32Array(this.dimensions);
    for (const token of tokenize(text)) {
      const idx = fnv1a32(token) % this.dimensions;
      vec[idx] += 1;
    }
    return l2Normalize(vec);
  }
}
