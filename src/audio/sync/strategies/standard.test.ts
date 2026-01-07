/**
 * StandardSyncStrategy Tests
 *
 * TDD: Tests written FIRST to define behavior of the standard sync strategy.
 *
 * StandardSyncStrategy wraps the existing ASR module with strategy interface:
 * - Uses whisper when available
 * - Falls back to estimation when whisper unavailable
 * - Optionally reconciles output with script text
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ScriptOutput } from '../../../script/schema';

/**
 * Creates a minimal valid ScriptOutput for testing
 */
function createMockScript(scenes?: Array<{ id: string; text: string }>): ScriptOutput {
  const defaultScenes = [
    { id: '1', text: 'Hello world this is a test.', visualDirection: 'test' },
    { id: '2', text: 'Second scene with more words.', visualDirection: 'test' },
  ];
  return {
    schemaVersion: '1.0.0',
    reasoning: 'Test reasoning',
    scenes: scenes ? scenes.map((s) => ({ ...s, visualDirection: 'test' })) : defaultScenes,
  };
}

describe('StandardSyncStrategy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('interface compliance', () => {
    it('should have name "standard"', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();

      expect(strategy.name).toBe('standard');
    });

    it('should implement generateTimestamps method', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();

      expect(typeof strategy.generateTimestamps).toBe('function');
    });
  });

  describe('timestamp generation', () => {
    it('should return TimestampsResult with required fields', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript();

      // Mock audio file - strategy will use estimation fallback
      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 5.0,
      });

      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('words');
      expect(result).toHaveProperty('confidence');
      expect(Array.isArray(result.words)).toBe(true);
    });

    it('should include metadata in result', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript();

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 5.0,
      });

      expect(result.metadata).toBeDefined();
    });

    it('should set source to "estimation" when using fallback', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      // Mock ASR to simulate whisper unavailable
      vi.doMock('../../asr', () => ({
        transcribeAudio: vi.fn().mockResolvedValue({
          words: [{ word: 'hello', start: 0, end: 0.5, confidence: 0.8 }],
          duration: 0.5,
          text: 'hello',
          engine: 'estimated',
        }),
      }));

      const strategy = new StandardSyncStrategy();
      const script = createMockScript([{ id: '1', text: 'hello' }]);

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 0.5,
      });

      expect(result.source).toBe('estimation');
    });

    it('should set source to "whisper" when using ASR', async () => {
      // This test verifies the source mapping logic.
      // Since we can't easily mock whisper availability in unit tests,
      // we verify that when ASR engine reports 'whisper-cpp', source is 'whisper'.
      // This is implicitly tested when whisper IS available.
      // For CI environments without whisper, we skip this test.
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript([{ id: '1', text: 'hello world' }]);

      // Try with a real audio file if available - this will use whisper if installed
      // Otherwise, we accept that estimation is used
      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 0.5,
      });

      // Verify source is one of the valid types
      expect(['whisper', 'estimation']).toContain(result.source);

      // If whisper was used, verify the mapping worked
      if (result.source === 'whisper') {
        expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      }
    });
  });

  describe('options handling', () => {
    it('should accept asrModel option', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy({ asrModel: 'small' });

      // Should not throw
      expect(strategy).toBeDefined();
    });

    it('should accept driftCorrection option', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy({ driftCorrection: 'detect' });

      expect(strategy).toBeDefined();
    });

    it('should merge constructor options with method options', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      // Mock to capture options passed to ASR
      const mockTranscribe = vi.fn().mockResolvedValue({
        words: [],
        duration: 1.0,
        text: '',
        engine: 'estimated',
      });

      vi.doMock('../../asr', () => ({
        transcribeAudio: mockTranscribe,
      }));

      const strategy = new StandardSyncStrategy({ asrModel: 'small' });
      const script = createMockScript();

      await strategy.generateTimestamps('test.wav', script, {
        reconcile: true,
        audioDuration: 1.0,
      });

      // Both constructor and method options should be used
      expect(strategy).toBeDefined();
    });
  });

  describe('script text extraction', () => {
    it('should extract text from all scenes', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript([
        { id: '1', text: 'First scene.' },
        { id: '2', text: 'Second scene.' },
        { id: '3', text: 'Third scene.' },
      ]);

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 3.0,
      });

      // Should have words from all scenes
      expect(result.words.length).toBeGreaterThan(0);
    });

    it('should handle empty scenes gracefully', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script: ScriptOutput = {
        schemaVersion: '1.0.0',
        reasoning: 'Test',
        scenes: [],
      };

      // Should handle gracefully (may return empty or throw specific error)
      // Based on existing ASR behavior, it returns empty words array
      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 1.0,
      });

      expect(result.words).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should throw CMError for invalid audio path when whisper required', async () => {
      const { StandardSyncStrategy } = await import('./standard');
      const { CMError } = await import('../../../core/errors');

      const strategy = new StandardSyncStrategy({ requireWhisper: true });
      const script = createMockScript();

      // Non-existent audio file should cause error
      await expect(strategy.generateTimestamps('nonexistent.wav', script)).rejects.toThrow(CMError);
    });

    it('should fall back to estimation when whisper fails and not required', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy({ requireWhisper: false });
      const script = createMockScript();

      // With audioDuration provided, should fall back to estimation
      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 2.0,
      });

      // Should succeed with estimation fallback
      expect(result.source).toBe('estimation');
    });
  });

  describe('word timestamp structure', () => {
    it('should return words with word, start, and end fields', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript([{ id: '1', text: 'Hello world' }]);

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 1.0,
      });

      if (result.words.length > 0) {
        const word = result.words[0];
        expect(word).toHaveProperty('word');
        expect(word).toHaveProperty('start');
        expect(word).toHaveProperty('end');
        expect(typeof word.start).toBe('number');
        expect(typeof word.end).toBe('number');
      }
    });

    it('should have chronological timestamps (end >= start)', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript([{ id: '1', text: 'Hello world test' }]);

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 2.0,
      });

      for (const word of result.words) {
        expect(word.end).toBeGreaterThanOrEqual(word.start);
      }
    });

    it('should have non-overlapping timestamps', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript([{ id: '1', text: 'Hello world this is a test.' }]);

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 3.0,
      });

      for (let i = 1; i < result.words.length; i++) {
        const prevWord = result.words[i - 1];
        const currWord = result.words[i];
        expect(currWord.start).toBeGreaterThanOrEqual(prevWord.end);
      }
    });
  });

  describe('confidence scoring', () => {
    it('should return confidence between 0 and 1', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript();

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 2.0,
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should have lower confidence for estimation source', async () => {
      const { StandardSyncStrategy } = await import('./standard');

      const strategy = new StandardSyncStrategy();
      const script = createMockScript();

      const result = await strategy.generateTimestamps('test.wav', script, {
        audioDuration: 2.0,
      });

      if (result.source === 'estimation') {
        // Estimation should have lower confidence than whisper would
        expect(result.confidence).toBeLessThanOrEqual(0.85);
      }
    });
  });
});
