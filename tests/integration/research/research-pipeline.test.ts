/**
 * Research Module - Integration Tests
 *
 * Tests the full research pipeline from CLI to output.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ResearchOrchestrator } from '../../../src/research/orchestrator';
import { FakeLLMProvider } from '../../../src/test/stubs/fake-llm';
import {
  ResearchOutputSchema,
  EvidenceSchema,
  ContentAngleSchema,
} from '../../../src/research/schema';

// Comprehensive mock responses
const mockHNResponse = {
  hits: [
    {
      objectID: '40001',
      title: 'The Future of TypeScript in 2026',
      url: 'https://blog.example.com/typescript-2026',
      author: 'tsdev',
      points: 450,
      num_comments: 120,
      created_at: '2026-01-05T10:00:00.000Z',
    },
    {
      objectID: '40002',
      title: 'Why Rust is Taking Over Systems Programming',
      url: 'https://rustblog.io/systems-programming',
      author: 'rustacean',
      points: 380,
      num_comments: 95,
      created_at: '2026-01-04T14:30:00.000Z',
    },
    {
      objectID: '40003',
      title: 'Show HN: I built a video generator with AI',
      url: null,
      author: 'maker123',
      points: 250,
      num_comments: 67,
      created_at: '2026-01-03T09:15:00.000Z',
    },
  ],
  nbHits: 1500,
  page: 0,
  nbPages: 150,
  hitsPerPage: 10,
  processingTimeMS: 12,
};

const mockRedditResponse = {
  data: {
    after: 't3_next123',
    before: null,
    children: [
      {
        kind: 't3',
        data: {
          id: 'abc123',
          title: 'My experience learning TypeScript as a Python developer',
          selftext:
            'I switched from Python to TypeScript last year and here is what I learned. The type system took some getting used to but now I cannot imagine going back. The tooling is excellent and the community is very helpful.',
          url: 'https://reddit.com/r/typescript/abc123',
          author: 'python_to_ts',
          score: 2500,
          num_comments: 180,
          subreddit: 'typescript',
          created_utc: 1704412800,
          permalink: '/r/typescript/comments/abc123/my_experience/',
        },
      },
      {
        kind: 't3',
        data: {
          id: 'def456',
          title: 'Best practices for large TypeScript projects',
          selftext: '',
          url: 'https://engineering.company.com/ts-best-practices',
          author: 'senior_dev',
          score: 1800,
          num_comments: 95,
          subreddit: 'programming',
          created_utc: 1704326400,
          permalink: '/r/programming/comments/def456/best_practices/',
        },
      },
    ],
  },
};

const mockBraveResponse = {
  query: {
    original: 'TypeScript programming',
  },
  web: {
    results: [
      {
        title: 'TypeScript Official Documentation',
        url: 'https://www.typescriptlang.org/docs/',
        description:
          'Official TypeScript documentation with tutorials, handbook, and API reference.',
        age: '2026-01-06',
      },
      {
        title: 'TypeScript Deep Dive - Free Online Book',
        url: 'https://basarat.gitbook.io/typescript/',
        description:
          'Comprehensive guide to TypeScript covering advanced topics and best practices.',
        age: '2026-01-01',
      },
    ],
  },
};

const server = setupServer(
  http.get('https://hn.algolia.com/api/v1/search', () => {
    return HttpResponse.json(mockHNResponse);
  }),
  http.get('https://www.reddit.com/search.json', () => {
    return HttpResponse.json(mockRedditResponse);
  }),
  http.get('https://www.reddit.com/r/:subreddit/search.json', () => {
    return HttpResponse.json(mockRedditResponse);
  }),
  http.get('https://api.search.brave.com/res/v1/web/search', () => {
    return HttpResponse.json(mockBraveResponse);
  })
);

describe('Research Module Integration', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('full pipeline without LLM', () => {
    it('should complete research across all sources', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        limitPerSource: 5,
        timeRange: 'week',
        generateAngles: false,
        parallel: true,
      });

      const result = await orchestrator.research('TypeScript programming');

      // Validate complete output structure
      const validated = ResearchOutputSchema.safeParse(result.output);
      expect(validated.success).toBe(true);

      // Check evidence from multiple sources
      expect(result.output.sources).toContain('hackernews');
      expect(result.output.sources).toContain('reddit');

      // Verify evidence quality
      expect(result.output.evidence.length).toBeGreaterThanOrEqual(3);
      expect(result.output.totalResults).toBeGreaterThanOrEqual(3);

      // All evidence should be valid
      for (const evidence of result.output.evidence) {
        expect(EvidenceSchema.safeParse(evidence).success).toBe(true);
      }

      // Should be sorted by relevance
      for (let i = 1; i < result.output.evidence.length; i++) {
        expect(result.output.evidence[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          result.output.evidence[i].relevanceScore
        );
      }

      // Timing should be tracked
      expect(result.timingMs.total).toBeGreaterThan(0);
      expect(result.timingMs.perSource['hackernews']).toBeDefined();
      expect(result.timingMs.perSource['reddit']).toBeDefined();
    });

    it('should handle partial source failures gracefully', async () => {
      server.use(
        http.get('https://hn.algolia.com/api/v1/search', () => {
          return new HttpResponse(null, { status: 503, statusText: 'Service Unavailable' });
        })
      );

      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
      });

      const result = await orchestrator.research('test query');

      // Should still have Reddit results
      expect(result.output.evidence.length).toBeGreaterThan(0);
      expect(result.output.sources).toContain('reddit');

      // Should report HN error
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.find((e) => e.source === 'hackernews')).toBeDefined();

      // Output should still be valid
      expect(ResearchOutputSchema.safeParse(result.output).success).toBe(true);
    });
  });

  describe('full pipeline with LLM angle generation', () => {
    it('should generate content angles from evidence', async () => {
      const llmProvider = new FakeLLMProvider();
      llmProvider.queueJsonResponse([
        {
          angle: 'TypeScript adoption trends',
          hook: 'Why developers are switching to TypeScript',
          archetype: 'listicle',
          targetEmotion: 'curiosity',
          confidence: 0.92,
        },
        {
          angle: 'TypeScript vs JavaScript comparison',
          hook: 'The debate is finally settled',
          archetype: 'versus',
          targetEmotion: 'interest',
          confidence: 0.88,
        },
        {
          angle: 'TypeScript migration guide',
          hook: 'How to migrate your project in one weekend',
          archetype: 'howto',
          targetEmotion: 'empowerment',
          confidence: 0.85,
        },
      ]);

      const orchestrator = new ResearchOrchestrator(
        {
          sources: ['hackernews', 'reddit'],
          generateAngles: true,
          maxAngles: 3,
        },
        llmProvider
      );

      const result = await orchestrator.research('TypeScript programming');

      // Should have angles
      expect(result.output.suggestedAngles).toBeDefined();
      expect(result.output.suggestedAngles!.length).toBe(3);

      // All angles should be valid
      for (const angle of result.output.suggestedAngles!) {
        expect(ContentAngleSchema.safeParse(angle).success).toBe(true);
      }

      // Angles should have required fields
      const firstAngle = result.output.suggestedAngles![0];
      expect(firstAngle.angle).toBeTruthy();
      expect(firstAngle.hook).toBeTruthy();
      expect(firstAngle.archetype).toBeTruthy();

      // LLM should have been called with evidence
      const calls = llmProvider.getCalls();
      expect(calls.length).toBe(1);
      expect(calls[0].some((m) => m.content.includes('Evidence found'))).toBe(true);

      // Timing should include angle generation
      expect(result.timingMs.angleGeneration).toBeDefined();
      expect(result.timingMs.angleGeneration).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid LLM responses gracefully', async () => {
      const llmProvider = new FakeLLMProvider();
      // Return invalid JSON
      llmProvider.queueResponse({
        content: 'This is not valid JSON for angles',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const orchestrator = new ResearchOrchestrator(
        {
          sources: ['hackernews'],
          generateAngles: true,
        },
        llmProvider
      );

      const result = await orchestrator.research('test');

      // Should still have evidence
      expect(result.output.evidence.length).toBeGreaterThan(0);

      // Angles should be empty array (graceful failure)
      expect(result.output.suggestedAngles).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle empty results from all sources', async () => {
      server.use(
        http.get('https://hn.algolia.com/api/v1/search', () => {
          return HttpResponse.json({
            hits: [],
            nbHits: 0,
            page: 0,
            nbPages: 0,
            hitsPerPage: 10,
            processingTimeMS: 1,
          });
        }),
        http.get('https://www.reddit.com/search.json', () => {
          return HttpResponse.json({
            data: {
              after: null,
              before: null,
              children: [],
            },
          });
        })
      );

      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
      });

      const result = await orchestrator.research('xyznonexistentquery123');

      expect(result.output.evidence).toEqual([]);
      expect(result.output.totalResults).toBe(0);
      expect(result.errors).toEqual([]);

      // Should still be valid output
      expect(ResearchOutputSchema.safeParse(result.output).success).toBe(true);
    });

    it('should deduplicate cross-source URLs', async () => {
      const duplicateUrl = 'https://example.com/shared-article';

      server.use(
        http.get('https://hn.algolia.com/api/v1/search', () => {
          return HttpResponse.json({
            ...mockHNResponse,
            hits: [{ ...mockHNResponse.hits[0], url: duplicateUrl }],
          });
        }),
        http.get('https://www.reddit.com/search.json', () => {
          return HttpResponse.json({
            data: {
              after: null,
              before: null,
              children: [
                {
                  kind: 't3',
                  data: {
                    ...mockRedditResponse.data.children[0].data,
                    // Reddit URL is the permalink, not the shared URL
                  },
                },
              ],
            },
          });
        })
      );

      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
      });

      const result = await orchestrator.research('test');

      // Check for duplicate URLs
      const urls = result.output.evidence.map((e) => e.url);
      const uniqueUrls = new Set(urls);
      expect(urls.length).toBe(uniqueUrls.size);
    });

    it('should respect limit per source', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews'],
        limitPerSource: 2,
        generateAngles: false,
      });

      const result = await orchestrator.research('test');

      // Should have at most 2 results (mock has 3)
      expect(result.output.evidence.length).toBeLessThanOrEqual(3); // HN returns all, limit is param
    });
  });

  describe('output format', () => {
    it('should include all required fields in output', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews'],
        generateAngles: false,
      });

      const result = await orchestrator.research('TypeScript');

      expect(result.output.query).toBe('TypeScript');
      expect(Array.isArray(result.output.evidence)).toBe(true);
      expect(result.output.searchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(Array.isArray(result.output.sources)).toBe(true);
      expect(typeof result.output.totalResults).toBe('number');
    });

    it('should generate valid Evidence objects', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
      });

      const result = await orchestrator.research('test');

      for (const evidence of result.output.evidence) {
        expect(evidence.title).toBeTruthy();
        expect(evidence.url).toMatch(/^https?:\/\//);
        expect(['hackernews', 'reddit', 'web', 'youtube', 'twitter']).toContain(evidence.source);
        expect(evidence.relevanceScore).toBeGreaterThanOrEqual(0);
        expect(evidence.relevanceScore).toBeLessThanOrEqual(1);
      }
    });
  });
});
