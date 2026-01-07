/**
 * Motion Strategy Interface Tests
 *
 * TDD tests for the MotionStrategy interface.
 * Tests are written BEFORE implementation (Red phase).
 */
import { describe, it, expect, vi } from 'vitest';
import type {
  MotionStrategy,
  MotionStrategyName,
  MotionOptions,
  MotionResult,
} from '../../../../src/visuals/motion/types.js';

describe('MotionStrategy Interface', () => {
  // ===========================================================================
  // Interface Contract Tests
  // ===========================================================================

  describe('interface contract', () => {
    /**
     * Helper to create a minimal conforming strategy for testing
     */
    function createMockStrategy(overrides: Partial<MotionStrategy> = {}): MotionStrategy {
      return {
        name: 'test-strategy',
        costPerClip: 0,
        apply: vi.fn().mockResolvedValue({
          outputPath: 'output.mp4',
          duration: 3,
          success: true,
        }),
        isAvailable: vi.fn().mockReturnValue(true),
        estimateCost: vi.fn().mockReturnValue(0),
        ...overrides,
      };
    }

    it('requires name property', () => {
      const strategy = createMockStrategy();
      expect(strategy.name).toBeDefined();
      expect(typeof strategy.name).toBe('string');
    });

    it('requires costPerClip property (non-negative)', () => {
      const freeStrategy = createMockStrategy({ costPerClip: 0 });
      const paidStrategy = createMockStrategy({ costPerClip: 0.5 });

      expect(freeStrategy.costPerClip).toBe(0);
      expect(paidStrategy.costPerClip).toBe(0.5);
      expect(freeStrategy.costPerClip).toBeGreaterThanOrEqual(0);
    });

    it('requires apply method', () => {
      const strategy = createMockStrategy();
      expect(typeof strategy.apply).toBe('function');
    });

    it('requires isAvailable method', () => {
      const strategy = createMockStrategy();
      expect(typeof strategy.isAvailable).toBe('function');
    });

    it('requires estimateCost method', () => {
      const strategy = createMockStrategy();
      expect(typeof strategy.estimateCost).toBe('function');
    });
  });

  // ===========================================================================
  // Apply Method Contract
  // ===========================================================================

  describe('apply() method contract', () => {
    it('returns MotionResult with required fields', async () => {
      const mockResult: MotionResult = {
        outputPath: '/tmp/output.mp4',
        duration: 5.0,
        success: true,
      };

      const strategy: MotionStrategy = {
        name: 'test',
        costPerClip: 0,
        apply: vi.fn().mockResolvedValue(mockResult),
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const options: MotionOptions = {
        inputPath: '/tmp/input.png',
        outputPath: '/tmp/output.mp4',
        duration: 5,
        width: 1080,
        height: 1920,
      };

      const result = await strategy.apply(options);

      expect(result).toMatchObject({
        outputPath: expect.any(String),
        duration: expect.any(Number),
        success: expect.any(Boolean),
      });
    });

    it('includes error message on failure', async () => {
      const failedResult: MotionResult = {
        outputPath: '/tmp/output.mp4',
        duration: 0,
        success: false,
        error: 'FFmpeg failed with exit code 1',
      };

      const strategy: MotionStrategy = {
        name: 'test',
        costPerClip: 0,
        apply: vi.fn().mockResolvedValue(failedResult),
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const result = await strategy.apply({
        inputPath: '/tmp/input.png',
        outputPath: '/tmp/output.mp4',
        duration: 3,
        width: 1080,
        height: 1920,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('optionally includes processingTimeMs', async () => {
      const mockResult: MotionResult = {
        outputPath: '/tmp/output.mp4',
        duration: 5.0,
        success: true,
        processingTimeMs: 1234,
      };

      const strategy: MotionStrategy = {
        name: 'test',
        costPerClip: 0,
        apply: vi.fn().mockResolvedValue(mockResult),
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const result = await strategy.apply({
        inputPath: '/tmp/input.png',
        outputPath: '/tmp/output.mp4',
        duration: 5,
        width: 1080,
        height: 1920,
      });

      expect(result.processingTimeMs).toBe(1234);
    });

    it('accepts all motion options', async () => {
      const applyMock = vi.fn().mockResolvedValue({
        outputPath: 'out.mp4',
        duration: 4,
        success: true,
      });

      const strategy: MotionStrategy = {
        name: 'test',
        costPerClip: 0,
        apply: applyMock,
        isAvailable: () => true,
        estimateCost: () => 0,
      };

      const options: MotionOptions = {
        inputPath: '/input.png',
        outputPath: '/output.mp4',
        duration: 4,
        width: 1080,
        height: 1920,
        fps: 30,
        strategyOptions: {
          zoomDirection: 'in',
          panDirection: 'left',
        },
      };

      await strategy.apply(options);

      expect(applyMock).toHaveBeenCalledWith(options);
    });
  });

  // ===========================================================================
  // Cost Estimation Contract
  // ===========================================================================

  describe('estimateCost() method contract', () => {
    it('returns 0 for free strategies', () => {
      const freeStrategy: MotionStrategy = {
        name: 'free-strategy',
        costPerClip: 0,
        apply: vi.fn(),
        isAvailable: () => true,
        estimateCost: (_n) => 0,
      };

      expect(freeStrategy.estimateCost(0)).toBe(0);
      expect(freeStrategy.estimateCost(10)).toBe(0);
    });

    it('calculates cost correctly for paid strategies', () => {
      const costPerClip = 0.5;
      const veoStrategy: MotionStrategy = {
        name: 'veo',
        costPerClip,
        apply: vi.fn(),
        isAvailable: () => true,
        estimateCost: (n) => n * costPerClip,
      };

      expect(veoStrategy.estimateCost(0)).toBe(0);
      expect(veoStrategy.estimateCost(1)).toBe(0.5);
      expect(veoStrategy.estimateCost(10)).toBe(5.0);
    });
  });
});

// ===========================================================================
// Known Strategy Type Tests
// ===========================================================================

describe('MotionStrategyName type', () => {
  it('includes none strategy', () => {
    const name: MotionStrategyName = 'none';
    expect(name).toBe('none');
  });

  it('includes kenburns strategy', () => {
    const name: MotionStrategyName = 'kenburns';
    expect(name).toBe('kenburns');
  });

  it('includes depthflow strategy', () => {
    const name: MotionStrategyName = 'depthflow';
    expect(name).toBe('depthflow');
  });

  it('includes veo strategy', () => {
    const name: MotionStrategyName = 'veo';
    expect(name).toBe('veo');
  });
});
