/**
 * Sync Strategy Factory
 *
 * Factory pattern for creating sync strategies.
 * Provides a clean API for strategy selection and availability checking.
 *
 * @module audio/sync/factory
 */

import { CMError } from '../../core/errors';
import type { SyncStrategy as SyncStrategyName } from '../../core/config';
import type { SyncStrategy, SyncStrategyOptions, StrategyRegistryEntry } from './types';

import { StandardSyncStrategy, isStandardAvailable } from './strategies/standard';
import { AudioFirstSyncStrategy, isAudioFirstAvailable } from './strategies/audio-first';
import { ForcedAlignSyncStrategy, isForcedAlignAvailable } from './strategies/forced-align';

/**
 * Registry of available sync strategies.
 * Maps strategy names to their constructors and availability checks.
 */
const strategyRegistry: Record<SyncStrategyName, StrategyRegistryEntry> = {
  standard: {
    create: (options) => new StandardSyncStrategy(options),
    isAvailable: isStandardAvailable,
  },
  'audio-first': {
    create: (options) => new AudioFirstSyncStrategy(options),
    isAvailable: isAudioFirstAvailable,
  },
  'forced-align': {
    create: (options) => new ForcedAlignSyncStrategy(options),
    isAvailable: isForcedAlignAvailable,
  },
  // Hybrid strategy is not yet implemented - map to standard for now
  hybrid: {
    create: (options) => new StandardSyncStrategy(options),
    isAvailable: isStandardAvailable,
  },
};

/**
 * Normalize strategy name to lowercase with proper formatting.
 */
function normalizeStrategyName(name: string): SyncStrategyName {
  const lowered = name.toLowerCase();

  // Map common variations
  if (lowered === 'audiofirst' || lowered === 'audio_first') {
    return 'audio-first';
  }
  if (lowered === 'forcedalign' || lowered === 'forced_align') {
    return 'forced-align';
  }

  return lowered as SyncStrategyName;
}

/**
 * Create a sync strategy by name.
 *
 * @param name - Strategy name (case-insensitive)
 * @param options - Optional configuration for the strategy
 * @returns The created strategy instance
 * @throws CMError if strategy name is unknown
 *
 * @example
 * ```typescript
 * const strategy = createSyncStrategy('standard');
 * const result = await strategy.generateTimestamps('audio.wav', script);
 * ```
 */
export function createSyncStrategy(name: string, options?: SyncStrategyOptions): SyncStrategy {
  const normalized = normalizeStrategyName(name);
  const entry = strategyRegistry[normalized];

  if (!entry) {
    const available = getAvailableStrategies();
    throw new CMError(
      'SYNC_STRATEGY_NOT_FOUND',
      `Unknown sync strategy: "${name}". Available strategies: ${available.join(', ')}`,
      { requestedStrategy: name, availableStrategies: available }
    );
  }

  return entry.create(options);
}

/**
 * Get list of all registered strategy names.
 *
 * @returns Array of strategy names
 *
 * @example
 * ```typescript
 * const strategies = getAvailableStrategies();
 * console.log(strategies); // ['standard', 'audio-first', 'forced-align', 'hybrid']
 * ```
 */
export function getAvailableStrategies(): SyncStrategyName[] {
  return Object.keys(strategyRegistry) as SyncStrategyName[];
}

/**
 * Check if a strategy is available (dependencies met).
 *
 * @param name - Strategy name to check
 * @returns true if strategy exists and is available
 *
 * @example
 * ```typescript
 * if (isStrategyAvailable('audio-first')) {
 *   // whisper is installed, can use audio-first
 * }
 * ```
 */
export function isStrategyAvailable(name: string): boolean {
  const normalized = normalizeStrategyName(name);
  const entry = strategyRegistry[normalized];

  if (!entry) {
    return false;
  }

  return entry.isAvailable();
}
