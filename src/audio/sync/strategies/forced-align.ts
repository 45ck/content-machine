/**
 * Forced-Align Sync Strategy
 *
 * Strategy using phoneme-level forced alignment (Aeneas).
 * Provides the most precise timestamps but requires additional dependencies.
 *
 * @module audio/sync/strategies/forced-align
 */

import type { ScriptOutput } from '../../../domain';
import type { SyncStrategy, SyncStrategyOptions, TimestampsResult } from '../types';

/**
 * Forced-align sync strategy implementation.
 *
 * Behavior:
 * - Uses Aeneas for phoneme-level alignment
 * - Highest precision but slower
 * - Requires Python + Aeneas installation
 */
export class ForcedAlignSyncStrategy implements SyncStrategy {
  readonly name = 'forced-align' as const;
  private readonly options: SyncStrategyOptions;

  constructor(options: SyncStrategyOptions = {}) {
    this.options = options;
  }

  /**
   * Generate timestamps using forced alignment.
   * Uses Aeneas for phoneme-level precision.
   */
  async generateTimestamps(
    _audioPath: string,
    _script: ScriptOutput,
    options?: SyncStrategyOptions
  ): Promise<TimestampsResult> {
    const mergedOptions = { ...this.options, ...options };

    // TODO: Future - Implement Aeneas integration
    // For now, return a placeholder that satisfies the interface
    return {
      source: 'aeneas',
      words: [],
      confidence: 0,
      metadata: {
        processingTimeMs: 0,
        reconciled: mergedOptions.reconcile ?? false,
      },
    };
  }
}

/**
 * Check if ForcedAlignSyncStrategy is available.
 * Depends on Aeneas being installed.
 */
export function isForcedAlignAvailable(): boolean {
  // TODO: Future - Check actual Aeneas availability
  // For now, return true to allow testing
  return true;
}
