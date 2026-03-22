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

  constructor(_options: SyncStrategyOptions = {}) {
    // Options reserved for future Aeneas integration
  }

  /**
   * Generate timestamps using forced alignment.
   * Uses Aeneas for phoneme-level precision.
   */
  async generateTimestamps(
    _audioPath: string,
    _script: ScriptOutput,
    _options?: SyncStrategyOptions
  ): Promise<TimestampsResult> {
    throw new Error('Forced alignment sync strategy is not yet implemented');
  }
}

/**
 * Check if ForcedAlignSyncStrategy is available.
 * Depends on Aeneas being installed.
 */
export function isForcedAlignAvailable(): boolean {
  return false;
}
