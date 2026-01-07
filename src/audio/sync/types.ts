/**
 * Sync Strategy Types
 *
 * Type definitions for the sync strategy system.
 * These interfaces define the contract for all sync strategies.
 *
 * @module audio/sync/types
 */

import type { ScriptOutput } from '../../script/schema';
import type { SyncStrategy as SyncStrategyName } from '../../core/config';

/**
 * Timestamp source identifiers.
 * Indicates which method produced the word-level timestamps.
 */
export type TimestampSource = 'whisper' | 'estimation' | 'aeneas' | 'whisperx';

/**
 * ASR model sizes supported by whisper.cpp
 */
export type AsrModel = 'tiny' | 'base' | 'small' | 'medium' | 'large';

/**
 * A single word with timing information.
 */
export interface WordTimestamp {
  /** The word text */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Optional confidence score for this word (0-1) */
  confidence?: number;
}

/**
 * Metadata about the timestamp generation process.
 */
export interface TimestampsMetadata {
  /** ASR model used (if applicable) */
  model?: string;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** Whether timestamps were reconciled with script */
  reconciled?: boolean;
  /** Original word count before reconciliation */
  originalWordCount?: number;
  /** Script word count for comparison */
  scriptWordCount?: number;
  /** Drift correction applied */
  driftCorrection?: 'none' | 'detect' | 'auto';
  /** Maximum drift detected in milliseconds */
  maxDriftMs?: number;
}

/**
 * Result of timestamp generation.
 * Contains word-level timing data and metadata about the process.
 */
export interface TimestampsResult {
  /** Source of the timestamps (which method produced them) */
  source: TimestampSource;
  /** Array of words with timing information */
  words: WordTimestamp[];
  /** Overall confidence score (0-1) */
  confidence: number;
  /** Optional metadata about the generation process */
  metadata?: TimestampsMetadata;
}

/**
 * Options passed to sync strategy methods.
 */
export interface SyncStrategyOptions {
  /** Require whisper for ASR (fail if unavailable) */
  requireWhisper?: boolean;
  /** Reconcile timestamps to match script exactly */
  reconcile?: boolean;
  /** Minimum similarity threshold for reconciliation (0-1) */
  minSimilarity?: number;
  /** ASR model to use */
  asrModel?: AsrModel;
  /** Drift correction mode */
  driftCorrection?: 'none' | 'detect' | 'auto';
  /** Maximum acceptable drift in milliseconds */
  maxDriftMs?: number;
}

/**
 * Sync Strategy Interface
 *
 * All sync strategies must implement this interface.
 * Strategies are responsible for generating word-level timestamps
 * from audio and script inputs.
 *
 * @example
 * ```typescript
 * const strategy = createSyncStrategy('standard');
 * const result = await strategy.generateTimestamps('audio.wav', script);
 * console.log(result.words); // Array of { word, start, end }
 * ```
 */
export interface SyncStrategy {
  /** Unique name identifier for this strategy */
  readonly name: SyncStrategyName;

  /**
   * Generate word-level timestamps from audio.
   *
   * @param audioPath - Path to the audio file (WAV format)
   * @param script - The script output containing text to sync
   * @param options - Optional configuration for this generation
   * @returns Promise resolving to timestamps result
   */
  generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    options?: SyncStrategyOptions
  ): Promise<TimestampsResult>;
}

/**
 * Strategy registry entry for factory pattern.
 */
export interface StrategyRegistryEntry {
  /** Strategy constructor or factory function */
  create: (options?: SyncStrategyOptions) => SyncStrategy;
  /** Whether this strategy is currently available (dependencies met) */
  isAvailable: () => boolean;
}

/**
 * Re-export SyncStrategyName for convenience
 */
export type { SyncStrategyName };
