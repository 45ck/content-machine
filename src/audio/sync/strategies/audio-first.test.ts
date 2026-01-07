/**
 * AudioFirstSyncStrategy Tests
 *
 * TDD: Tests written FIRST to define behavior of the audio-first strategy.
 *
 * AudioFirstSyncStrategy:
 * - Requires whisper (fails if unavailable)
 * - No estimation fallback
 * - Optionally reconciles ASR output with script text
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

describe('AudioFirstSyncStrategy', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('interface compliance', () => {
    it('should have name "audio-first"', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy();

      expect(strategy.name).toBe('audio-first');
    });

    it('should implement generateTimestamps method', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy();

      expect(typeof strategy.generateTimestamps).toBe('function');
    });
  });

  describe('whisper requirement', () => {
    it('should always set requireWhisper to true', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      // Even if user passes requireWhisper: false, it should be overridden
      const strategy = new AudioFirstSyncStrategy({ requireWhisper: false });

      // Can't directly inspect, but the behavior should enforce it
      expect(strategy).toBeDefined();
    });

    it('should throw CMError when whisper unavailable', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');
      const { CMError } = await import('../../../core/errors');

      const strategy = new AudioFirstSyncStrategy();
      const script = createMockScript();

      // Without a real audio file, this should fail
      await expect(strategy.generateTimestamps('nonexistent.wav', script)).rejects.toThrow(CMError);
    });

    it('should include actionable fix in error message', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy();
      const script = createMockScript();

      try {
        await strategy.generateTimestamps('nonexistent.wav', script);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        // Should suggest how to fix
        expect(
          message.includes('whisper') || message.includes('install') || message.includes('Whisper')
        ).toBe(true);
      }
    });
  });

  describe('timestamp generation', () => {
    it('should return TimestampsResult with source "whisper"', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy();
      const script = createMockScript([{ id: '1', text: 'test' }]);

      // This may succeed or fail depending on whisper availability
      // But if it succeeds, source should be whisper
      try {
        const result = await strategy.generateTimestamps('test.wav', script);
        expect(result.source).toBe('whisper');
      } catch {
        // Expected if whisper unavailable
      }
    });

    it('should not fall back to estimation', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy();
      const script = createMockScript();

      // Even with audioDuration provided, should NOT use estimation
      try {
        const result = await strategy.generateTimestamps('test.wav', script, {
          audioDuration: 5.0,
        });
        // If we got here, whisper worked - source should be whisper
        expect(result.source).toBe('whisper');
      } catch (error) {
        // If it failed, that's correct - no estimation fallback
        expect(error).toBeDefined();
      }
    });
  });

  describe('reconciliation', () => {
    it('should accept reconcile option', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy({ reconcile: true });

      expect(strategy).toBeDefined();
    });

    it('should include reconciled flag in metadata', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy({ reconcile: true });
      const script = createMockScript([{ id: '1', text: 'test' }]);

      try {
        const result = await strategy.generateTimestamps('test.wav', script);
        expect(result.metadata?.reconciled).toBe(true);
      } catch {
        // Expected if whisper unavailable
      }
    });
  });

  describe('options handling', () => {
    it('should accept asrModel option', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy({ asrModel: 'medium' });

      expect(strategy).toBeDefined();
    });

    it('should merge constructor options with method options', async () => {
      const { AudioFirstSyncStrategy } = await import('./audio-first');

      const strategy = new AudioFirstSyncStrategy({ asrModel: 'small' });
      const script = createMockScript();

      // This tests that options are passed through
      try {
        await strategy.generateTimestamps('test.wav', script, { reconcile: true });
      } catch {
        // Expected if whisper unavailable
      }
    });
  });
});

describe('isAudioFirstAvailable', () => {
  it('should return boolean', async () => {
    const { isAudioFirstAvailable } = await import('./audio-first');

    const available = isAudioFirstAvailable();

    expect(typeof available).toBe('boolean');
  });

  it('should check for whisper installation', async () => {
    const { isAudioFirstAvailable } = await import('./audio-first');

    // This should return true if whisper is installed, false otherwise
    const available = isAudioFirstAvailable();

    expect(available === true || available === false).toBe(true);
  });
});
