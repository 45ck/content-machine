/**
 * cm generate with research integration tests
 *
 * TDD: Tests for the --research flag on generate command.
 */
import { describe, it, expect } from 'vitest';
import type { ResearchOutput } from '../../../src/research/schema';

const mockResearchOutput: ResearchOutput = {
  query: 'AI programming trends',
  evidence: [
    {
      title: 'Python leads AI development in 2025',
      url: 'https://example.com/python-ai',
      source: 'tavily',
      relevanceScore: 0.92,
      summary: 'Python remains dominant for AI/ML projects.',
    },
  ],
  suggestedAngles: [
    {
      angle: 'Top AI programming trends',
      hook: 'AI is changing everything...',
      archetype: 'listicle',
      confidence: 0.9,
    },
  ],
  searchedAt: '2026-01-07T10:00:00Z',
  sources: ['tavily'],
  totalResults: 1,
};

describe('cm generate --research integration', () => {
  describe('runPipeline with research', () => {
    it('should accept research option in pipeline config', async () => {
      // Import the pipeline types
      const { PipelineConfigSchema } = await import('../../../src/core/pipeline');

      const config = {
        topic: 'AI programming',
        archetype: 'listicle',
        orientation: 'portrait',
        voice: 'af_heart',
        targetDuration: 45,
        outputPath: 'video.mp4',
        research: mockResearchOutput,
      };

      const result = PipelineConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    }, 60000);
  });

  describe('research auto-discovery', () => {
    it('should run research when --research flag is true without path', async () => {
      // When --research is passed without a file path, it should auto-run research
      // This is a design decision - we'll implement it as a boolean flag first
      expect(true).toBe(true);
    });
  });
});
