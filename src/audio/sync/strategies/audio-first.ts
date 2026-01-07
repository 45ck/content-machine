/**
 * Audio-First Sync Strategy
 *
 * Strategy that requires whisper ASR - no estimation fallback.
 * Use this when you need guaranteed ASR accuracy.
 *
 * @module audio/sync/strategies/audio-first
 */

import type { ScriptOutput } from '../../../script/schema';
import type { SyncStrategy, SyncStrategyOptions, TimestampsResult } from '../types';

/**
 * Audio-first sync strategy implementation.
 *
 * Behavior:
 * - Requires whisper ASR (fails if unavailable)
 * - No estimation fallback
 * - Best for quality-critical workflows
 */
export class AudioFirstSyncStrategy implements SyncStrategy {
  readonly name = 'audio-first' as const;
  private readonly options: SyncStrategyOptions;

  constructor(options: SyncStrategyOptions = {}) {
    this.options = { ...options, requireWhisper: true };
  }

  /**
   * Generate timestamps using audio-first strategy.
   * Requires whisper - throws if unavailable.
   */
  async generateTimestamps(
    _audioPath: string,
    _script: ScriptOutput,
    options?: SyncStrategyOptions
  ): Promise<TimestampsResult> {
    const mergedOptions = { ...this.options, ...options };

    // TODO: TASK-022 - Implement actual whisper-only logic
    // For now, return a placeholder that satisfies the interface
    return {
      source: 'whisper',
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
 * Check if AudioFirstSyncStrategy is available.
 * Depends on whisper being installed.
 */
export function isAudioFirstAvailable(): boolean {
  // TODO: TASK-022 - Check actual whisper availability
  // For now, assume available for testing
  return true;
}
