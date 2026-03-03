import type { PipelineResult } from '../../core/pipeline';
import type { SyncRatingLabel, SyncRatingOutput } from '../../domain';

export type PipelineMode = 'standard' | 'audio-first';
export type WhisperModel = 'tiny' | 'base' | 'small' | 'medium';

/**
 * Summary of sync quality rating for CLI output
 */
export interface SyncQualitySummary {
  reportPath: string;
  rating: number;
  ratingLabel: SyncRatingLabel;
  passed: boolean;
  meanDriftMs: number;
  maxDriftMs: number;
  matchRatio: number;
  errorCount: number;
  attempts: number;
}

export interface SyncAttemptSettings {
  pipelineMode: PipelineMode;
  reconcile: boolean;
  whisperModel?: WhisperModel;
}

export interface SyncQualityGateConfig {
  enabled: boolean;
  autoRetry: boolean;
  /**
   * Maximum number of retries after the initial attempt.
   * Example: maxRetries=1 => up to 2 total attempts.
   */
  maxRetries: number;
}

export interface SyncQualityGateResult {
  pipelineResult: PipelineResult;
  rating?: SyncRatingOutput;
  attempts: number;
  attemptHistory: Array<{ settings: SyncAttemptSettings; rating?: SyncRatingOutput }>;
  finalSettings: SyncAttemptSettings;
}

function getNextAttemptSettings(current: SyncAttemptSettings): SyncAttemptSettings | null {
  if (current.pipelineMode === 'standard') {
    return {
      pipelineMode: 'audio-first',
      reconcile: true,
      whisperModel: current.whisperModel,
    };
  }

  if (current.pipelineMode === 'audio-first') {
    if (!current.reconcile) {
      return { ...current, reconcile: true };
    }

    const ladder: WhisperModel[] = ['tiny', 'base', 'small', 'medium'];
    const currentModel = current.whisperModel ?? 'base';
    const index = ladder.indexOf(currentModel);
    const nextModel = index >= 0 ? ladder[index + 1] : undefined;
    if (!nextModel) return null;
    return { ...current, whisperModel: nextModel };
  }

  return null;
}

export async function runGenerateWithSyncQualityGate(params: {
  initialSettings: SyncAttemptSettings;
  config: SyncQualityGateConfig;
  runAttempt: (settings: SyncAttemptSettings) => Promise<PipelineResult>;
  rate: (videoPath: string) => Promise<SyncRatingOutput>;
}): Promise<SyncQualityGateResult> {
  const attemptHistory: SyncQualityGateResult['attemptHistory'] = [];

  let settings: SyncAttemptSettings = { ...params.initialSettings };
  const maxAttempts = params.config.autoRetry ? 1 + params.config.maxRetries : 1;
  let lastPipelineResult: PipelineResult | null = null;
  let lastRating: SyncRatingOutput | undefined;

  for (let attemptIndex = 0; attemptIndex < maxAttempts; attemptIndex++) {
    const pipelineResult = await params.runAttempt(settings);
    lastPipelineResult = pipelineResult;

    if (!params.config.enabled) {
      return {
        pipelineResult,
        attempts: 1,
        attemptHistory: [{ settings }],
        finalSettings: settings,
      };
    }

    const rating = await params.rate(pipelineResult.outputPath);
    lastRating = rating;
    attemptHistory.push({ settings, rating });

    if (rating.passed) {
      return {
        pipelineResult,
        rating,
        attempts: attemptHistory.length,
        attemptHistory,
        finalSettings: settings,
      };
    }

    const next = params.config.autoRetry ? getNextAttemptSettings(settings) : null;
    if (!next) {
      return {
        pipelineResult,
        rating,
        attempts: attemptHistory.length,
        attemptHistory,
        finalSettings: settings,
      };
    }

    settings = next;
  }

  return {
    pipelineResult: lastPipelineResult ?? (await params.runAttempt(settings)),
    rating: lastRating,
    attempts: attemptHistory.length,
    attemptHistory,
    finalSettings: settings,
  };
}
