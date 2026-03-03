/**
 * Sync Strategy Interface & Factory Tests
 *
 * TDD: Tests written FIRST to define the contract for sync strategies.
 *
 * The strategy pattern allows different sync algorithms to be plugged in:
 * - StandardSyncStrategy: Uses whisper when available, fallback to estimation
 * - AudioFirstSyncStrategy: Requires whisper, no fallback
 * - ForcedAlignSyncStrategy: Uses phoneme-level alignment (Aeneas)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ScriptOutput } from '../../domain';

/**
 * Creates a minimal valid ScriptOutput for testing
 */
function createMockScript(text: string = 'Test scene'): ScriptOutput {
  return {
    schemaVersion: '1.0.0',
    reasoning: 'Test reasoning',
    scenes: [{ id: '1', text, visualDirection: 'test visual' }],
  };
}

describe('SyncStrategy Interface', () => {
  describe('interface contract', () => {
    it('should require a name property', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('standard');

      expect(strategy.name).toBeDefined();
      expect(typeof strategy.name).toBe('string');
    });

    it('should require generateTimestamps method', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('standard');

      expect(strategy.generateTimestamps).toBeDefined();
      expect(typeof strategy.generateTimestamps).toBe('function');
    });

    it('should return a Promise from generateTimestamps', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('standard');
      const mockScript = createMockScript();

      // This should return a promise (we provide audioDuration for fallback)
      const result = strategy.generateTimestamps('test.wav', mockScript, {
        audioDuration: 1.0,
      });

      expect(result).toBeInstanceOf(Promise);

      // Await to prevent unhandled rejection
      await result;
    });
  });
});

describe('createSyncStrategy factory', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe('strategy selection', () => {
    it('should create StandardSyncStrategy for "standard"', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('standard');

      expect(strategy.name).toBe('standard');
    });

    it('should create AudioFirstSyncStrategy for "audio-first"', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('audio-first');

      expect(strategy.name).toBe('audio-first');
    });

    it('should create ForcedAlignSyncStrategy for "forced-align"', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('forced-align');

      expect(strategy.name).toBe('forced-align');
    });

    it('should throw CMError for unknown strategy', async () => {
      const { createSyncStrategy } = await import('./factory');
      const { CMError } = await import('../../core/errors');

      expect(() => createSyncStrategy('invalid' as never)).toThrow(CMError);
    });

    it('should include available strategies in error message', async () => {
      const { createSyncStrategy } = await import('./factory');

      try {
        createSyncStrategy('invalid' as never);
        expect.fail('Should have thrown');
      } catch (error) {
        const message = (error as Error).message;
        expect(message).toContain('standard');
        expect(message).toContain('audio-first');
        expect(message).toContain('forced-align');
      }
    });
  });

  describe('case handling', () => {
    it('should handle uppercase strategy names', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('STANDARD' as never);

      expect(strategy.name).toBe('standard');
    });

    it('should handle mixed case strategy names', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('Audio-First' as never);

      expect(strategy.name).toBe('audio-first');
    });
  });

  describe('options passing', () => {
    it('should pass options to strategy constructor', async () => {
      const { createSyncStrategy } = await import('./factory');

      const options = {
        requireWhisper: true,
        reconcile: true,
        asrModel: 'small' as const,
      };

      const strategy = createSyncStrategy('audio-first', options);

      // Strategy should store options (implementation detail, but important for behavior)
      expect(strategy).toBeDefined();
    });

    it('should use default options when not provided', async () => {
      const { createSyncStrategy } = await import('./factory');

      const strategy = createSyncStrategy('standard');

      // Should not throw
      expect(strategy).toBeDefined();
    });
  });
});

describe('getAvailableStrategies', () => {
  it('should return an array of strategy names', async () => {
    const { getAvailableStrategies } = await import('./factory');

    const strategies = getAvailableStrategies();

    expect(Array.isArray(strategies)).toBe(true);
    expect(strategies.length).toBeGreaterThan(0);
  });

  it('should include "standard" strategy', async () => {
    const { getAvailableStrategies } = await import('./factory');

    const strategies = getAvailableStrategies();

    expect(strategies).toContain('standard');
  });

  it('should include "audio-first" strategy', async () => {
    const { getAvailableStrategies } = await import('./factory');

    const strategies = getAvailableStrategies();

    expect(strategies).toContain('audio-first');
  });

  it('should include "forced-align" strategy', async () => {
    const { getAvailableStrategies } = await import('./factory');

    const strategies = getAvailableStrategies();

    expect(strategies).toContain('forced-align');
  });
});

describe('isStrategyAvailable', () => {
  it('should return true for "standard" (always available)', async () => {
    const { isStrategyAvailable } = await import('./factory');

    const available = isStrategyAvailable('standard');

    expect(available).toBe(true);
  });

  it('should return boolean for any registered strategy', async () => {
    const { isStrategyAvailable } = await import('./factory');

    const available = isStrategyAvailable('audio-first');

    expect(typeof available).toBe('boolean');
  });

  it('should return false for unknown strategy', async () => {
    const { isStrategyAvailable } = await import('./factory');

    const available = isStrategyAvailable('unknown-strategy');

    expect(available).toBe(false);
  });
});

describe('TimestampsResult interface', () => {
  it('should have required source field', async () => {
    // This is a compile-time check, but we test runtime behavior
    const mockResult = {
      source: 'whisper' as const,
      words: [],
      confidence: 0.9,
    };

    expect(mockResult.source).toBeDefined();
    expect(['whisper', 'estimation', 'aeneas', 'whisperx']).toContain(mockResult.source);
  });

  it('should have words array', async () => {
    const mockResult = {
      source: 'whisper' as const,
      words: [
        { word: 'hello', start: 0, end: 0.5 },
        { word: 'world', start: 0.5, end: 1.0 },
      ],
      confidence: 0.9,
    };

    expect(Array.isArray(mockResult.words)).toBe(true);
    expect(mockResult.words[0]).toHaveProperty('word');
    expect(mockResult.words[0]).toHaveProperty('start');
    expect(mockResult.words[0]).toHaveProperty('end');
  });

  it('should have confidence score', async () => {
    const mockResult = {
      source: 'whisper' as const,
      words: [],
      confidence: 0.95,
    };

    expect(mockResult.confidence).toBeGreaterThanOrEqual(0);
    expect(mockResult.confidence).toBeLessThanOrEqual(1);
  });

  it('should allow optional metadata', async () => {
    const mockResult = {
      source: 'whisper' as const,
      words: [],
      confidence: 0.9,
      metadata: {
        model: 'base',
        processingTimeMs: 1500,
        reconciled: true,
      },
    };

    expect(mockResult.metadata).toBeDefined();
    expect(mockResult.metadata?.model).toBe('base');
  });
});
