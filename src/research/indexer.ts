import type { Evidence } from './schema';
import type { EmbeddingProvider } from '../core/embeddings/types';
import { BruteForceVectorIndex } from '../core/retrieval/brute-force';

export const RESEARCH_INDEX_SCHEMA_VERSION = '1.0.0';

export interface ResearchIndexItem {
  id: string;
  embedding: number[];
  evidence: Evidence;
}

export interface ResearchIndexFile {
  schemaVersion: string;
  dimensions: number;
  items: ResearchIndexItem[];
  createdAt: string;
}

export async function buildResearchEvidenceIndex(
  evidence: Evidence[],
  embedder: EmbeddingProvider
): Promise<ResearchIndexFile> {
  const items: ResearchIndexItem[] = [];
  for (let i = 0; i < evidence.length; i++) {
    const ev = evidence[i];
    const text = [ev.title, ev.summary].filter(Boolean).join('\n');
    const embedding = await embedder.embed(text);
    items.push({
      id: `evidence:${i}`,
      embedding: Array.from(embedding),
      evidence: ev,
    });
  }

  return {
    schemaVersion: RESEARCH_INDEX_SCHEMA_VERSION,
    dimensions: embedder.dimensions,
    items,
    createdAt: new Date().toISOString(),
  };
}

export async function queryResearchEvidenceIndex(params: {
  index: ResearchIndexFile;
  embedder: EmbeddingProvider;
  query: string;
  k: number;
}): Promise<Array<{ score: number; evidence: Evidence }>> {
  if (params.index.dimensions !== params.embedder.dimensions) {
    throw new Error('Index dimensions do not match embedder');
  }

  const idx = new BruteForceVectorIndex<{ evidence: Evidence }>(params.index.dimensions);
  for (const item of params.index.items) {
    idx.add({
      id: item.id,
      embedding: new Float32Array(item.embedding),
      metadata: { evidence: item.evidence },
    });
  }

  const q = await params.embedder.embed(params.query);
  return idx.search(q, params.k).map((r) => ({ score: r.score, evidence: r.metadata.evidence }));
}

