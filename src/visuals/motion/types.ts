/**
 * Motion Strategy Interface
 *
 * Defines the contract for motion strategies that animate static images.
 * This implements the Strategy pattern for different motion effects.
 *
 * See ADR-002-VISUAL-PROVIDER-SYSTEM-20260107.md
 */
import { MOTION_STRATEGIES as MOTION_STRATEGY_FACTS } from '../../domain/repo-facts.generated.js';

// =============================================================================
// Motion Strategy Names
// =============================================================================

/**
 * Motion strategy names.
 *
 * - 'none': No motion (pass-through for videos, static frame for images)
 * - 'kenburns': Classic zoom and pan effect using FFmpeg (free)
 * - 'depthflow': 2.5D parallax animation using depth estimation (free)
 * - 'veo': Google Veo AI video generation (~$0.50/clip)
 */
export type MotionStrategyName = 'none' | 'kenburns' | 'depthflow' | 'veo';

// =============================================================================
// Motion Options and Results
// =============================================================================

/**
 * Options for applying motion to an image.
 */
export interface MotionOptions {
  /** Path to source image file */
  inputPath: string;

  /** Path for output video file */
  outputPath: string;

  /** Target duration in seconds */
  duration: number;

  /** Target width in pixels */
  width: number;

  /** Target height in pixels */
  height: number;

  /** Frames per second (default: 30) */
  fps?: number;

  /** Strategy-specific options */
  strategyOptions?: Record<string, unknown>;
}

/**
 * Result of motion application.
 */
export interface MotionResult {
  /** Path to generated video */
  outputPath: string;

  /** Actual duration of generated video */
  duration: number;

  /** Whether motion was applied successfully */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Processing time in milliseconds */
  processingTimeMs?: number;
}

// =============================================================================
// Motion Strategy Interface
// =============================================================================

/**
 * Strategy interface for animating static images.
 *
 * Implements Strategy pattern for different motion effects.
 */
export interface MotionStrategy {
  /** Strategy identifier */
  readonly name: MotionStrategyName;

  /** Cost per clip in USD (0 for free strategies) */
  readonly costPerClip: number;

  /**
   * Apply motion effect to generate video from image.
   */
  apply(options: MotionOptions): Promise<MotionResult>;

  /**
   * Check if strategy is available (dependencies installed).
   */
  isAvailable(): boolean;

  /**
   * Estimate cost for N clips.
   */
  estimateCost(clipCount: number): number;
}

// =============================================================================
// Motion Strategy Registry
// =============================================================================

/**
 * Motion strategy metadata.
 */
export interface MotionStrategyInfo {
  name: MotionStrategyName;
  displayName: string;
  description: string;
  costPerClip: number;
  dependencies: string[];
}

/**
 * Registry of all motion strategies with metadata.
 */
export const MOTION_STRATEGIES = MOTION_STRATEGY_FACTS.reduce<
  Partial<Record<MotionStrategyName, MotionStrategyInfo>>
>((acc, strategy) => {
  acc[strategy.id] = {
    name: strategy.id,
    displayName: strategy.displayName,
    description: strategy.description,
    costPerClip: strategy.costPerClip,
    dependencies: [...strategy.dependencies],
  };
  return acc;
}, {}) as Record<MotionStrategyName, MotionStrategyInfo>;

// =============================================================================
// Factory Type
// =============================================================================

/**
 * Factory type for creating motion strategies.
 */
export type MotionStrategyFactory = (config?: unknown) => MotionStrategy;
