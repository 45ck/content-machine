/**
 * Visual Matcher Tests
 *
 * Tests for keyword extraction and visual matching logic.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { matchVisuals, MatchVisualsOptions } from './matcher';
import { TimestampsOutput, TIMESTAMPS_SCHEMA_VERSION } from '../audio/schema';
import { VISUALS_SCHEMA_VERSION } from './schema';

// Mock the LLM provider
vi.mock('../core/llm', () => ({
  createLLMProvider: vi.fn(() => ({
    name: 'mock',
    model: 'mock-model',
    chat: vi.fn(),
  })),
}));

// Mock pexels provider
vi.mock('./providers/pexels', () => ({
  searchPexels: vi.fn().mockResolvedValue([
    {
      id: 12345,
      url: 'https://videos.pexels.com/video-files/12345.mp4',
      thumbnailUrl: 'https://images.pexels.com/thumb/12345.jpg',
      width: 1080,
      height: 1920,
    },
  ]),
}));

describe('matchVisuals', () => {
  const createMockTimestamps = (sceneCount: number): TimestampsOutput => {
    const scenes = Array.from({ length: sceneCount }, (_, i) => ({
      sceneId: `scene-${i + 1}`,
      sceneIndex: i,
      audioStart: i * 2,
      audioEnd: (i + 1) * 2,
      words: [{ word: `word-${i}`, start: i * 2, end: (i + 1) * 2 }],
    }));

    return {
      schemaVersion: TIMESTAMPS_SCHEMA_VERSION,
      scriptId: 'test-script',
      audioPath: 'test-audio.wav',
      totalDuration: sceneCount * 2,
      totalWords: sceneCount,
      scenes,
      segments: [],
    };
  };

  describe('mock mode', () => {
    it('should generate mock visuals for each scene', async () => {
      const timestamps = createMockTimestamps(5);
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      expect(result.schemaVersion).toBe(VISUALS_SCHEMA_VERSION);
      expect(result.scenes).toHaveLength(5);
      expect(result.totalAssets).toBe(5);
      expect(result.fromStock).toBe(5);
      expect(result.fallbacks).toBe(0);
      expect(result.keywords).toHaveLength(5);
    });

    it('should assign unique scene IDs in mock mode', async () => {
      const timestamps = createMockTimestamps(3);
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      const sceneIds = result.scenes.map((s) => s.sceneId);
      expect(new Set(sceneIds).size).toBe(3);
    });

    it('should calculate correct durations from timestamps', async () => {
      const timestamps = createMockTimestamps(3);
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      // Each mock scene is 2 seconds
      result.scenes.forEach((scene) => {
        expect(scene.duration).toBe(2);
      });
    });

    it('should handle empty scenes array', async () => {
      const timestamps: TimestampsOutput = {
        schemaVersion: TIMESTAMPS_SCHEMA_VERSION,
        scriptId: 'test-script',
        audioPath: 'test-audio.wav',
        totalDuration: 1, // Minimum valid duration
        totalWords: 0,
        scenes: [],
        segments: [],
      };
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      expect(result.scenes).toHaveLength(0);
      expect(result.totalAssets).toBe(0);
    });
  });

  describe('schema validation', () => {
    it('should produce valid VisualsOutput schema', async () => {
      const timestamps = createMockTimestamps(2);
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      // Schema should be validated internally, no error means pass
      expect(result.schemaVersion).toBeDefined();
      expect(result.scenes).toBeDefined();
      expect(result.totalAssets).toBeDefined();
      expect(result.fromUserFootage).toBeDefined();
      expect(result.fromStock).toBeDefined();
      expect(result.fallbacks).toBeDefined();
    });

    it('should include match reasoning for each scene', async () => {
      const timestamps = createMockTimestamps(2);
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      result.scenes.forEach((scene) => {
        expect(scene.matchReasoning).toBeDefined();
        expect(scene.matchReasoning.reasoning).toBeDefined();
      });
    });
  });

  describe('keyword generation in mock mode', () => {
    it('should generate keywords with correct timing', async () => {
      const timestamps = createMockTimestamps(3);
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      expect(result.keywords).toHaveLength(3);
      result.keywords.forEach((keyword, i) => {
        expect(keyword.startTime).toBe(i * 2);
        expect(keyword.endTime).toBe((i + 1) * 2);
      });
    });

    it('should assign keywords to correct scene IDs', async () => {
      const timestamps = createMockTimestamps(3);
      const options: MatchVisualsOptions = {
        timestamps,
        mock: true,
      };

      const result = await matchVisuals(options);

      result.keywords.forEach((keyword, i) => {
        expect(keyword.sectionId).toBe(`scene-${i + 1}`);
      });
    });
  });
});
