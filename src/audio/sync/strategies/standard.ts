/**
 * Standard Sync Strategy
 *
 * Default strategy that uses whisper when available, with estimation fallback.
 * This is the most flexible strategy suitable for most use cases.
 *
 * @module audio/sync/strategies/standard
 */

import type { ScriptOutput } from '../../../script/schema';
import type {
  SyncStrategy,
  SyncStrategyOptions,
  TimestampsResult,
  WordTimestamp,
  TimestampSource,
} from '../types';
import { transcribeAudio } from '../../asr';
import { CMError } from '../../../core/errors';
import { createLogger } from '../../../core/logger';

const log = createLogger({ module: 'sync-standard' });

/**
 * Extended options for StandardSyncStrategy including audioDuration for estimation
 */
export interface StandardSyncOptions extends SyncStrategyOptions {
  /** Audio duration in seconds (required for estimation fallback) */
  audioDuration?: number;
}

/**
 * Extract combined text from all script scenes
 */
function extractScriptText(script: ScriptOutput): string {
  return script.scenes.map((scene) => scene.text).join(' ');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function createEmptyScriptResult(startTime: number): TimestampsResult {
  return {
    source: 'estimation',
    words: [],
    confidence: 1.0,
    metadata: {
      processingTimeMs: Date.now() - startTime,
      reconciled: false,
      scriptWordCount: 0,
      originalWordCount: 0,
    },
  };
}

/**
 * Calculate confidence based on source and word coverage
 */
function calculateConfidence(
  source: TimestampSource,
  wordCount: number,
  scriptWordCount: number
): number {
  // Base confidence by source type
  const baseConfidence = source === 'whisper' ? 0.95 : 0.8;

  // Adjust by word coverage if we have script comparison
  if (scriptWordCount > 0) {
    const coverage = Math.min(wordCount / scriptWordCount, 1);
    return baseConfidence * (0.5 + 0.5 * coverage);
  }

  return baseConfidence;
}

/**
 * Standard sync strategy implementation.
 *
 * Behavior:
 * - Attempts whisper ASR first if available
 * - Falls back to estimation if whisper unavailable
 * - Optionally reconciles with script text
 */
export class StandardSyncStrategy implements SyncStrategy {
  readonly name = 'standard' as const;
  private readonly options: SyncStrategyOptions;

  constructor(options: SyncStrategyOptions = {}) {
    this.options = options;
  }

  /**
   * Generate timestamps using standard strategy.
   * Attempts whisper first, falls back to estimation.
   */
  async generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    options?: StandardSyncOptions
  ): Promise<TimestampsResult> {
    const startTime = Date.now();
    const mergedOptions: StandardSyncOptions = { ...this.options, ...options };

    // Extract text from script
    const scriptText = extractScriptText(script);
    const scriptWordCount = countWords(scriptText);

    log.debug({ audioPath, scriptWordCount }, 'Starting standard sync strategy');

    // Handle empty script
    if (scriptWordCount === 0) {
      return createEmptyScriptResult(startTime);
    }

    try {
      // Attempt transcription with ASR module
      const asrResult = await transcribeAudio({
        audioPath,
        model: mergedOptions.asrModel ?? 'base',
        requireWhisper: mergedOptions.requireWhisper ?? false,
        originalText: scriptText,
        audioDuration: mergedOptions.audioDuration,
      });

      // Map ASR result to TimestampsResult
      const source: TimestampSource = asrResult.engine === 'whisper-cpp' ? 'whisper' : 'estimation';

      const words: WordTimestamp[] = asrResult.words.map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
      }));

      const confidence = calculateConfidence(source, words.length, scriptWordCount);

      log.info(
        {
          source,
          wordCount: words.length,
          scriptWordCount,
          confidence,
          durationMs: Date.now() - startTime,
        },
        'Standard sync strategy completed'
      );

      return {
        source,
        words,
        confidence,
        metadata: {
          model: mergedOptions.asrModel ?? 'base',
          processingTimeMs: Date.now() - startTime,
          reconciled: mergedOptions.reconcile ?? false,
          originalWordCount: words.length,
          scriptWordCount,
        },
      };
    } catch (error) {
      // If requireWhisper is true, propagate the error
      if (mergedOptions.requireWhisper) {
        throw new CMError(
          'SYNC_ASR_REQUIRED',
          `Whisper ASR required but failed: ${String(error)}`,
          { audioPath, error: String(error) },
          error instanceof Error ? error : undefined
        );
      }

      // Otherwise, try fallback to estimation if we have duration
      if (mergedOptions.audioDuration) {
        log.warn({ error: String(error) }, 'ASR failed, using estimation fallback');
        return this.estimateFallback(
          scriptText,
          mergedOptions.audioDuration,
          scriptWordCount,
          startTime,
          mergedOptions
        );
      }

      // No fallback available
      throw new CMError(
        'SYNC_FAILED',
        `Transcription failed and no audioDuration provided for estimation fallback: ${String(error)}`,
        { audioPath, error: String(error) },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Fallback estimation when ASR fails
   */
  private estimateFallback(
    text: string,
    audioDuration: number,
    scriptWordCount: number,
    startTime: number,
    options: StandardSyncOptions
  ): TimestampsResult {
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return {
        source: 'estimation',
        words: [],
        confidence: 1.0,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          reconciled: false,
          scriptWordCount: 0,
          originalWordCount: 0,
        },
      };
    }

    // Character-weighted duration distribution
    const totalChars = words.reduce((sum, w) => sum + w.length, 0);
    const msPerChar = (audioDuration * 1000) / totalChars;

    const timestamps: WordTimestamp[] = [];
    let currentTimeMs = 0;

    for (const word of words) {
      const wordDurationMs = word.length * msPerChar;
      const startMs = currentTimeMs;
      const endMs = currentTimeMs + wordDurationMs;

      timestamps.push({
        word,
        start: startMs / 1000,
        end: endMs / 1000,
        confidence: 0.8,
      });

      currentTimeMs = endMs;
    }

    return {
      source: 'estimation',
      words: timestamps,
      confidence: calculateConfidence('estimation', timestamps.length, scriptWordCount),
      metadata: {
        processingTimeMs: Date.now() - startTime,
        reconciled: options.reconcile ?? false,
        originalWordCount: timestamps.length,
        scriptWordCount,
      },
    };
  }
}

/**
 * Check if StandardSyncStrategy is available.
 * Standard strategy is always available (has estimation fallback).
 */
export function isStandardAvailable(): boolean {
  return true;
}
