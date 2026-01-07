/**
 * Audio Sync Module
 *
 * Provides sync strategies for generating word-level timestamps
 * from audio and script inputs.
 *
 * @module audio/sync
 *
 * @example
 * ```typescript
 * import { createSyncStrategy, getAvailableStrategies } from './audio/sync';
 *
 * // Create a strategy
 * const strategy = createSyncStrategy('standard');
 *
 * // Generate timestamps
 * const result = await strategy.generateTimestamps('audio.wav', script);
 *
 * // Check availability
 * const strategies = getAvailableStrategies();
 * ```
 */

// Factory exports
export { createSyncStrategy, getAvailableStrategies, isStrategyAvailable } from './factory';

// Type exports
export type {
  SyncStrategy,
  SyncStrategyOptions,
  TimestampsResult,
  WordTimestamp,
  TimestampsMetadata,
  TimestampSource,
  AsrModel,
  StrategyRegistryEntry,
  SyncStrategyName,
} from './types';

// Strategy exports (for direct use if needed)
export { StandardSyncStrategy, isStandardAvailable } from './strategies/standard';
export { AudioFirstSyncStrategy, isAudioFirstAvailable } from './strategies/audio-first';
export { ForcedAlignSyncStrategy, isForcedAlignAvailable } from './strategies/forced-align';
