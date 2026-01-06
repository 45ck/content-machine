/**
 * Research → Script Integration Tests
 *
 * TDD: Tests for injecting research evidence into script generation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ResearchOutput, Evidence, ContentAngle } from '../../../src/research/schema';
import type { ScriptOutput } from '../../../src/script/schema';

// Mock data
const mockEvidence: Evidence[] = [
  {
    title: 'Python dominates AI/ML in 2025',
    url: 'https://example.com/python-ai',
    source: 'tavily',
    relevanceScore: 0.95,
    summary: 'Python remains the top choice for AI and machine learning projects.',
  },
  {
    title: 'TypeScript adoption grows 40% in 2025',
    url: 'https://example.com/typescript-growth',
    source: 'hackernews',
    relevanceScore: 0.88,
    publishedAt: '2025-12-15T10:00:00Z',
    summary: 'TypeScript has seen massive adoption in enterprise applications.',
  },
  {
    title: 'Rust enters top 10 programming languages',
    url: 'https://example.com/rust-top10',
    source: 'reddit',
    relevanceScore: 0.82,
    summary: 'Rust gains popularity for systems programming and WebAssembly.',
  },
];

const mockAngles: ContentAngle[] = [
  {
    angle: 'Top 5 programming languages for 2025',
    hook: 'Are you learning these languages yet?',
    archetype: 'listicle',
    targetEmotion: 'curiosity',
    confidence: 0.9,
  },
  {
    angle: 'Python vs JavaScript: Which to learn first?',
    hook: 'This might surprise you...',
    archetype: 'versus',
    targetEmotion: 'surprise',
    confidence: 0.85,
  },
];

const mockResearchOutput: ResearchOutput = {
  query: 'best programming languages 2025',
  evidence: mockEvidence,
  suggestedAngles: mockAngles,
  searchedAt: '2026-01-07T10:00:00Z',
  sources: ['tavily', 'hackernews', 'reddit'],
  totalResults: 3,
};

describe('Research → Script Integration', () => {
  describe('buildResearchContext', () => {
    it('should format evidence into a prompt-friendly context', async () => {
      const { buildResearchContext } = await import(
        '../../../src/script/research-context'
      );

      const context = buildResearchContext(mockResearchOutput);

      // Should include evidence summaries
      expect(context).toContain('Python dominates AI/ML');
      expect(context).toContain('TypeScript adoption grows');
      expect(context).toContain('Rust enters top 10');

      // Should include source URLs
      expect(context).toContain('https://example.com/python-ai');

      // Should be structured for LLM consumption
      expect(context).toContain('Research Evidence');
    });

    it('should prioritize high-relevance evidence', async () => {
      const { buildResearchContext } = await import(
        '../../../src/script/research-context'
      );

      const context = buildResearchContext(mockResearchOutput);
      const lines = context.split('\n');

      // Python (0.95) should appear before Rust (0.82)
      const pythonIndex = lines.findIndex((l) => l.includes('Python'));
      const rustIndex = lines.findIndex((l) => l.includes('Rust'));
      expect(pythonIndex).toBeLessThan(rustIndex);
    });

    it('should include suggested angles when available', async () => {
      const { buildResearchContext } = await import(
        '../../../src/script/research-context'
      );

      const context = buildResearchContext(mockResearchOutput);

      expect(context).toContain('Top 5 programming languages');
      expect(context).toContain('listicle');
    });

    it('should handle empty research gracefully', async () => {
      const { buildResearchContext } = await import(
        '../../../src/script/research-context'
      );

      const emptyResearch: ResearchOutput = {
        query: 'test',
        evidence: [],
        searchedAt: new Date().toISOString(),
        sources: [],
        totalResults: 0,
      };

      const context = buildResearchContext(emptyResearch);
      expect(context).toBe('');
    });

    it('should limit context length to avoid token overflow', async () => {
      const { buildResearchContext } = await import(
        '../../../src/script/research-context'
      );

      // Create research with many evidence items
      const largeResearch: ResearchOutput = {
        ...mockResearchOutput,
        evidence: Array.from({ length: 50 }, (_, i) => ({
          title: `Evidence item ${i}`,
          url: `https://example.com/item-${i}`,
          source: 'tavily' as const,
          relevanceScore: 0.9 - i * 0.01,
          summary: 'A '.repeat(100), // Long summary
        })),
      };

      const context = buildResearchContext(largeResearch);

      // Should be under ~2000 chars to leave room for prompt
      expect(context.length).toBeLessThan(3000);
    });
  });

  describe('generateScript with research', () => {
    it('should accept research input and include in prompt', async () => {
      const { generateScript } = await import('../../../src/script/generator');
      const { FakeLLMProvider } = await import('../../../src/test/stubs/fake-llm');

      const fakeLLM = new FakeLLMProvider();
      fakeLLM.queueJsonResponse({
        scenes: [
          {
            text: 'Python is still the king of AI in 2025.',
            visualDirection: 'Python logo animation',
            mood: 'informative',
          },
          {
            text: 'TypeScript grew 40% this year!',
            visualDirection: 'Graph showing growth',
            mood: 'exciting',
          },
        ],
        reasoning: 'Used research evidence about Python and TypeScript trends.',
        title: 'Top Languages 2025',
        hook: 'Are you learning these languages yet?',
        cta: 'Follow for more tech insights!',
        hashtags: ['#programming', '#2025'],
      });

      const script = await generateScript({
        topic: 'best programming languages 2025',
        archetype: 'listicle',
        llmProvider: fakeLLM,
        research: mockResearchOutput,
      });

      // Verify script was generated
      expect(script.scenes.length).toBeGreaterThan(0);

      // Verify LLM was called with research context
      const calls = fakeLLM.getCalls();
      expect(calls.length).toBe(1);

      const userMessage = calls[0].find((m) => m.role === 'user');
      expect(userMessage?.content).toContain('Research Evidence');
      expect(userMessage?.content).toContain('Python');
    });

    it('should include source citations in script extra field', async () => {
      const { generateScript } = await import('../../../src/script/generator');
      const { FakeLLMProvider } = await import('../../../src/test/stubs/fake-llm');

      const fakeLLM = new FakeLLMProvider();
      fakeLLM.queueJsonResponse({
        scenes: [
          {
            text: 'Python dominates AI.',
            visualDirection: 'Code animation',
            mood: 'informative',
            sourceUrl: 'https://example.com/python-ai',
          },
        ],
        reasoning: 'Based on research evidence.',
        title: 'AI Languages',
        hook: 'Did you know?',
        cta: 'Follow!',
      });

      const script = await generateScript({
        topic: 'AI programming',
        archetype: 'listicle',
        llmProvider: fakeLLM,
        research: mockResearchOutput,
      });

      // Should have research metadata in extra
      expect(script.extra?.research).toBeDefined();
      expect(script.extra?.research?.sources).toContain('https://example.com/python-ai');
      expect(script.extra?.research?.evidenceCount).toBe(3);
    });
  });

  describe('SceneSchema with sources', () => {
    it('should allow optional sources array in scenes', async () => {
      const { SceneSchema } = await import('../../../src/script/schema');

      const sceneWithSources = {
        id: 'scene-001',
        text: 'Python dominates AI in 2025.',
        visualDirection: 'Code animation',
        sources: ['https://example.com/python-ai'],
      };

      const result = SceneSchema.safeParse(sceneWithSources);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sources).toEqual(['https://example.com/python-ai']);
      }
    });

    it('should allow scenes without sources (backward compatible)', async () => {
      const { SceneSchema } = await import('../../../src/script/schema');

      const sceneWithoutSources = {
        id: 'scene-001',
        text: 'Hello world.',
        visualDirection: 'Speaker on camera',
      };

      const result = SceneSchema.safeParse(sceneWithoutSources);
      expect(result.success).toBe(true);
    });
  });
});
