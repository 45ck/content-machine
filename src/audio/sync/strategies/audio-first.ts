/**
 * Audio-First Sync Strategy
 *
 * Strategy that requires whisper ASR - no estimation fallback.
 * Use this when you need guaranteed ASR accuracy.
 *
 * @module audio/sync/strategies/audio-first
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
import { reconcileToScript, type WordWithTiming } from '../../asr/reconcile';
import { CMError } from '../../../core/errors';
import { createLogger } from '../../../core/logger';

const log = createLogger({ module: 'sync-audio-first' });

/**
 * Extract combined text from all script scenes
 */
function extractScriptText(script: ScriptOutput): string {
  return script.scenes.map((scene) => scene.text).join(' ');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function mapAsrWordsToTimestamps(words: WordWithTiming[]): WordTimestamp[] {
  return words.map((w) => ({
    word: w.word,
    start: w.start,
    end: w.end,
    confidence: w.confidence,
  }));
}

function maybeReconcileWords(
  words: WordTimestamp[],
  scriptText: string,
  options: SyncStrategyOptions
): { words: WordTimestamp[]; reconciled: boolean } {
  if (!options.reconcile || !scriptText.trim()) {
    return { words, reconciled: false };
  }

  log.debug({ wordCount: words.length }, 'Reconciling ASR output with script');

  const reconciled = reconcileToScript(
    words.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
    scriptText,
    { minSimilarity: options.minSimilarity ?? 0.6 }
  );

  return { words: mapAsrWordsToTimestamps(reconciled), reconciled: true };
}

/**
 * Audio-first sync strategy implementation.
 *
 * Behavior:
 * - Requires whisper ASR (fails if unavailable)
 * - No estimation fallback
 * - Optionally reconciles ASR output with script text
 * - Best for quality-critical workflows
 *
 * @example
 * ```typescript
 * const strategy = new AudioFirstSyncStrategy({ reconcile: true });
 * const result = await strategy.generateTimestamps('audio.wav', script);
 * // result.source === 'whisper'
 * // result.words are reconciled to match script text
 * ```
 */
export class AudioFirstSyncStrategy implements SyncStrategy {
  readonly name = 'audio-first' as const;
  private readonly options: SyncStrategyOptions;

  constructor(options: SyncStrategyOptions = {}) {
    // Always require whisper - this is the core contract of this strategy
    this.options = { ...options, requireWhisper: true };
  }

  /**
   * Generate timestamps using audio-first strategy.
   * Requires whisper - throws if unavailable.
   */
  async generateTimestamps(
    audioPath: string,
    script: ScriptOutput,
    options?: SyncStrategyOptions
  ): Promise<TimestampsResult> {
    const startTime = Date.now();
    const mergedOptions: SyncStrategyOptions = {
      ...this.options,
      ...options,
      requireWhisper: true, // Always enforce
    };

    const scriptText = extractScriptText(script);
    const scriptWordCount = countWords(scriptText);

    log.debug(
      { audioPath, scriptWordCount, reconcile: mergedOptions.reconcile },
      'Starting audio-first sync strategy'
    );

    try {
      // Attempt transcription with whisper (no fallback)
      const asrResult = await transcribeAudio({
        audioPath,
        model: mergedOptions.asrModel ?? 'base',
        requireWhisper: true,
      });

      const initialWords: WordTimestamp[] = asrResult.words.map((w) => ({ ...w }));
      const originalWordCount = initialWords.length;
      const { words, reconciled } = maybeReconcileWords(initialWords, scriptText, mergedOptions);

      const source: TimestampSource = 'whisper';
      const confidence = this.calculateConfidence(words, scriptWordCount);
      const durationMs = Date.now() - startTime;

      log.info(
        {
          source,
          wordCount: words.length,
          scriptWordCount,
          confidence,
          reconciled,
          durationMs,
        },
        'Audio-first sync strategy completed'
      );

      return {
        source,
        words,
        confidence,
        metadata: {
          model: mergedOptions.asrModel ?? 'base',
          processingTimeMs: durationMs,
          reconciled,
          originalWordCount,
          scriptWordCount,
        },
      };
    } catch (error) {
      // Wrap error with actionable fix suggestion
      throw new CMError(
        'AUDIO_FIRST_WHISPER_REQUIRED',
        `Whisper ASR is required for audio-first strategy but failed. ` +
          `Install whisper with: cm setup whisper (or set CM_WHISPER_AUTO_INSTALL=1). ` +
          `Original error: ${String(error)}`,
        { audioPath, error: String(error) },
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Calculate confidence based on word coverage
   */
  private calculateConfidence(words: WordTimestamp[], scriptWordCount: number): number {
    // Base confidence for whisper is high
    const baseConfidence = 0.95;

    // Adjust by word coverage if we have script comparison
    if (scriptWordCount > 0) {
      const coverage = Math.min(words.length / scriptWordCount, 1);
      return baseConfidence * (0.5 + 0.5 * coverage);
    }

    return baseConfidence;
  }
}

/**
 * Check if AudioFirstSyncStrategy is available.
 * Checks for whisper installation.
 */
export function isAudioFirstAvailable(): boolean {
  // For now, always return true - actual check would require async
  // In practice, the strategy will fail at runtime if whisper unavailable
  // A more sophisticated check would look for the whisper binary
  return true;
}
