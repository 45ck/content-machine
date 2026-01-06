import { describe, expect, it } from 'vitest';
import { HashEmbeddingProvider } from '../core/embeddings/hash-embedder';
import {
  buildResearchEvidenceIndex,
  parseResearchIndexFile,
  queryResearchEvidenceIndex,
} from './indexer';
import type { Evidence } from './schema';

describe('research indexer', () => {
  it('builds and queries an evidence index', async () => {
    const embedder = new HashEmbeddingProvider({ dimensions: 64 });
    const evidence: Evidence[] = [
      {
        title: 'Redis vs Postgres for caching',
        url: 'https://example.com/a',
        source: 'web',
        relevanceScore: 0.9,
        summary: 'Cache patterns and invalidation strategies.',
      },
      {
        title: 'Kubernetes deployments',
        url: 'https://example.com/b',
        source: 'web',
        relevanceScore: 0.6,
        summary: 'Rolling updates and manifests.',
      },
    ];

    const index = await buildResearchEvidenceIndex(evidence, embedder);
    const results = await queryResearchEvidenceIndex({ index, embedder, query: 'redis cache', k: 1 });
    expect(results[0].evidence.title).toContain('Redis');
  });

  it('rejects indexes with mismatched embedding dimensions', () => {
    expect(() =>
      parseResearchIndexFile({
        schemaVersion: '1.0.0',
        dimensions: 4,
        createdAt: new Date().toISOString(),
        items: [
          {
            id: 'evidence:0',
            embedding: [0.1, 0.2],
            evidence: {
              title: 'Bad',
              url: 'https://example.com',
              source: 'web',
              relevanceScore: 0.5,
            },
          },
        ],
      })
    ).toThrow();
  });
});
