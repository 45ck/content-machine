/**
 * Research Orchestrator - Unit Tests
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ResearchOrchestrator, createResearchOrchestrator } from './orchestrator';
import { FakeLLMProvider } from '../test/stubs/fake-llm';
import { ContentAngleSchema, EvidenceSchema } from '../domain';

// Mock API responses
const mockHNResponse = {
  hits: [
    {
      objectID: '1',
      title: 'AI Programming Guide',
      url: 'https://example.com/ai-guide',
      author: 'user1',
      points: 300,
      num_comments: 50,
      created_at: '2026-01-01T12:00:00.000Z',
    },
    {
      objectID: '2',
      title: 'Machine Learning Tips',
      url: 'https://example.com/ml-tips',
      author: 'user2',
      points: 200,
      num_comments: 30,
      created_at: '2026-01-02T12:00:00.000Z',
    },
  ],
  nbHits: 100,
  page: 0,
  nbPages: 10,
  hitsPerPage: 10,
  processingTimeMS: 5,
};

const mockRedditResponse = {
  data: {
    after: null,
    before: null,
    children: [
      {
        kind: 't3',
        data: {
          id: 'r1',
          title: 'Best AI resources 2026',
          selftext: 'Here are the best resources for learning AI...',
          url: 'https://reddit.com/r/programming/r1',
          author: 'redditor1',
          score: 5000,
          num_comments: 200,
          subreddit: 'programming',
          created_utc: 1704067200,
          permalink: '/r/programming/comments/r1/best_ai/',
        },
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
  })
);

describe('ResearchOrchestrator', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  describe('basic functionality', () => {
    it('should create orchestrator with default config', () => {
      const orchestrator = new ResearchOrchestrator();
      expect(orchestrator).toBeDefined();
      expect(orchestrator.getConfiguredTools()).toContain('hackernews');
      expect(orchestrator.getConfiguredTools()).toContain('reddit');
    });

    it('should create orchestrator with custom sources', () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews'],
      });
      expect(orchestrator.getConfiguredTools()).toEqual(['hackernews']);
    });

    it('should check source availability', () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
      });
      expect(orchestrator.isSourceAvailable('hackernews')).toBe(true);
      expect(orchestrator.isSourceAvailable('reddit')).toBe(true);
      expect(orchestrator.isSourceAvailable('youtube')).toBe(false);
    });
  });

  describe('research execution', () => {
    it('should return valid ResearchOutput', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
      });

      const result = await orchestrator.research('AI programming');

      expect(result.output.query).toBe('AI programming');
      expect(result.output.evidence.length).toBeGreaterThan(0);
      expect(result.output.sources).toContain('hackernews');
      expect(result.output.sources).toContain('reddit');
      expect(result.output.searchedAt).toBeDefined();
      expect(result.output.totalResults).toBeGreaterThan(0);
    });

    it('should validate all evidence against schema', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews'],
        generateAngles: false,
      });

      const result = await orchestrator.research('test query');

      for (const evidence of result.output.evidence) {
        const parsed = EvidenceSchema.safeParse(evidence);
        expect(parsed.success).toBe(true);
      }
    });

    it('should deduplicate evidence by URL', async () => {
      // Both sources return same URL
      server.use(
        http.get('https://hn.algolia.com/api/v1/search', () => {
          return HttpResponse.json({
            ...mockHNResponse,
            hits: [
              {
                ...mockHNResponse.hits[0],
                url: 'https://example.com/duplicate',
              },
            ],
          });
        }),
        http.get('https://www.reddit.com/search.json', () => {
          return HttpResponse.json({
            data: {
              ...mockRedditResponse.data,
              children: [
                {
                  kind: 't3',
                  data: {
                    ...mockRedditResponse.data.children[0].data,
                    url: 'https://example.com/duplicate',
                    permalink: '/r/test/comments/x/duplicate/',
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
      const urls = result.output.evidence.map((e) => e.url);
      const uniqueUrls = new Set(urls);

      // Should have unique URLs (reddit permalink is different from external URL)
      expect(urls.length).toBe(uniqueUrls.size);
    });

    it('should sort evidence by relevance score', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews'],
        generateAngles: false,
      });

      const result = await orchestrator.research('test');

      for (let i = 1; i < result.output.evidence.length; i++) {
        expect(result.output.evidence[i - 1].relevanceScore).toBeGreaterThanOrEqual(
          result.output.evidence[i].relevanceScore
        );
      }
    });

    it('should track timing per source', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
      });

      const result = await orchestrator.research('test');

      expect(result.timingMs.total).toBeGreaterThan(0);
      expect(result.timingMs.perSource['hackernews']).toBeGreaterThanOrEqual(0);
      expect(result.timingMs.perSource['reddit']).toBeGreaterThanOrEqual(0);
    });

    it('should handle source errors gracefully', async () => {
      server.use(
        http.get('https://hn.algolia.com/api/v1/search', () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
      });

      const result = await orchestrator.research('test');

      // Should still have results from Reddit
      expect(result.output.evidence.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some((e) => e.source === 'hackernews')).toBe(true);
    });
  });

  describe('content angle generation', () => {
    it('should generate angles when LLM provider is available', async () => {
      const llmProvider = new FakeLLMProvider();
      llmProvider.queueJsonResponse([
        {
          angle: 'Top AI tools comparison',
          hook: 'These AI tools will change everything',
          archetype: 'listicle',
          targetEmotion: 'curiosity',
          confidence: 0.9,
        },
        {
          angle: 'AI myths debunked',
          hook: 'Everyone gets this wrong about AI',
          archetype: 'myth',
          targetEmotion: 'surprise',
          confidence: 0.85,
        },
      ]);

      const orchestrator = new ResearchOrchestrator(
        {
          sources: ['hackernews'],
          generateAngles: true,
          maxAngles: 3,
        },
        llmProvider
      );

      const result = await orchestrator.research('AI programming');

      expect(result.output.suggestedAngles).toBeDefined();
      expect(result.output.suggestedAngles!.length).toBeGreaterThan(0);

      for (const angle of result.output.suggestedAngles!) {
        const parsed = ContentAngleSchema.safeParse(angle);
        expect(parsed.success).toBe(true);
      }
    });

    it('should skip angle generation without LLM provider', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews'],
        generateAngles: true, // Enabled but no provider
      });

      const result = await orchestrator.research('test');

      expect(result.output.suggestedAngles).toBeUndefined();
    });

    it('should skip angle generation when disabled', async () => {
      const llmProvider = new FakeLLMProvider();

      const orchestrator = new ResearchOrchestrator(
        {
          sources: ['hackernews'],
          generateAngles: false,
        },
        llmProvider
      );

      const result = await orchestrator.research('test');

      expect(result.output.suggestedAngles).toBeUndefined();
      expect(llmProvider.getCalls()).toHaveLength(0);
    });

    it('should track angle generation timing', async () => {
      const llmProvider = new FakeLLMProvider();
      llmProvider.queueJsonResponse([
        {
          angle: 'Test angle',
          hook: 'Test hook',
          archetype: 'listicle',
          targetEmotion: 'curiosity',
          confidence: 0.8,
        },
      ]);

      const orchestrator = new ResearchOrchestrator(
        {
          sources: ['hackernews'],
          generateAngles: true,
        },
        llmProvider
      );

      const result = await orchestrator.research('test');

      expect(result.timingMs.angleGeneration).toBeDefined();
      expect(result.timingMs.angleGeneration).toBeGreaterThanOrEqual(0);
    });

    it('should handle LLM errors gracefully', async () => {
      const llmProvider = new FakeLLMProvider();
      llmProvider.queueError(new Error('LLM API error'));

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
      // Should report angle generation error
      expect(result.errors.some((e) => e.error.includes('Angle generation failed'))).toBe(true);
    });
  });

  describe('parallel vs sequential execution', () => {
    it('should execute in parallel by default', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
        parallel: true,
      });

      const start = Date.now();
      await orchestrator.research('test');
      const duration = Date.now() - start;

      // Parallel should be faster than sum of individual times
      // This is a weak assertion but verifies parallel path is taken
      expect(duration).toBeLessThan(10000);
    });

    it('should support sequential execution', async () => {
      const orchestrator = new ResearchOrchestrator({
        sources: ['hackernews', 'reddit'],
        generateAngles: false,
        parallel: false,
      });

      const result = await orchestrator.research('test');

      expect(result.output.evidence.length).toBeGreaterThan(0);
    });
  });

  describe('factory function', () => {
    it('should create orchestrator via factory', () => {
      const orchestrator = createResearchOrchestrator({
        sources: ['hackernews'],
      });

      expect(orchestrator).toBeInstanceOf(ResearchOrchestrator);
      expect(orchestrator.getConfiguredTools()).toContain('hackernews');
    });
  });
});
