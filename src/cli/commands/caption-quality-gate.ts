import type { PipelineResult } from '../../core/pipeline';
import type { CaptionQualityRatingOutput, BurnedInCaptionQualityReport } from '../../domain';
import type { CaptionPresetName } from '../../render/captions/presets';
import type { CaptionConfigInput } from '../../render/captions/config';

export interface CaptionAttemptSettings {
  captionPreset?: CaptionPresetName;
  captionConfigOverrides: CaptionConfigInput;
  maxLinesPerPage?: number;
  maxCharsPerLine?: number;
  captionMaxCps?: number;
  captionMinOnScreenMs?: number;
  captionMinOnScreenMsShort?: number;
  tuningLevel?: number;
}

export interface CaptionQualityGateConfig {
  enabled: boolean;
  autoRetry: boolean;
  /**
   * Maximum number of retries after the initial attempt.
   * Example: maxRetries=2 => up to 3 total attempts.
   */
  maxRetries: number;
  /**
   * Minimum acceptable overall score (0..1).
   *
   * This is applied on top of `captionQuality.overall.passed` for stricter gating.
   */
  minOverallScore: number;
}

export interface CaptionQualityGateResult {
  pipelineResult: PipelineResult;
  rating?: CaptionQualityRatingOutput;
  attempts: number;
  attemptHistory: Array<{ settings: CaptionAttemptSettings; rating?: CaptionQualityRatingOutput }>;
  finalSettings: CaptionAttemptSettings;
}

function didPassCaptionQuality(
  rating: CaptionQualityRatingOutput,
  config: CaptionQualityGateConfig
): boolean {
  const overall = rating.captionQuality.overall;
  return Boolean(overall.passed) && overall.score >= config.minOverallScore;
}

function mergeCaptionConfigOverrides(
  base: CaptionConfigInput,
  patch: CaptionConfigInput
): CaptionConfigInput {
  return {
    ...base,
    ...patch,
    pillStyle: { ...(base.pillStyle ?? {}), ...(patch.pillStyle ?? {}) },
    stroke: { ...(base.stroke ?? {}), ...(patch.stroke ?? {}) },
    shadow: { ...(base.shadow ?? {}), ...(patch.shadow ?? {}) },
    layout: { ...(base.layout ?? {}), ...(patch.layout ?? {}) },
    positionOffset: { ...(base.positionOffset ?? {}), ...(patch.positionOffset ?? {}) },
    safeZone: { ...(base.safeZone ?? {}), ...(patch.safeZone ?? {}) },
    emphasis: { ...(base.emphasis ?? {}), ...(patch.emphasis ?? {}) },
    cleanup: { ...(base.cleanup ?? {}), ...(patch.cleanup ?? {}) },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function withBaseCaptionOverrides(
  settings: CaptionAttemptSettings,
  patch: CaptionConfigInput
): CaptionAttemptSettings {
  return {
    ...settings,
    captionConfigOverrides: mergeCaptionConfigOverrides(settings.captionConfigOverrides, patch),
  };
}

function tuneStabilityAndPacing(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport
): CaptionAttemptSettings {
  let next = settings;

  if (q.flicker.flickerEvents > 0 || q.displayTime.flashSegmentCount > 0) {
    next = {
      ...next,
      captionMinOnScreenMs: Math.max(next.captionMinOnScreenMs ?? 0, 1400),
      captionMinOnScreenMsShort: Math.max(next.captionMinOnScreenMsShort ?? 0, 1100),
    };
  }

  if (q.jitter.score < 0.9 || q.placement.score < 0.9 || q.alignment.score < 0.9) {
    next = withBaseCaptionOverrides(next, {
      pageAnimation: 'none',
      animationDuration: 80,
      wordTransitionMs: 0,
    });
  }

  return next;
}

function tuneDensityAndSpeed(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport
): CaptionAttemptSettings {
  if (
    q.density.score >= 0.85 &&
    q.density.charOverflowCount === 0 &&
    q.density.lineOverflowCount === 0
  ) {
    return settings;
  }

  return {
    ...settings,
    maxLinesPerPage: Math.min(settings.maxLinesPerPage ?? 2, 2),
    maxCharsPerLine: Math.min(settings.maxCharsPerLine ?? 25, 22),
    captionMaxCps: Math.min(settings.captionMaxCps ?? 15, 12),
  };
}

function tuneCoverage(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport
): CaptionAttemptSettings {
  if (q.coverage.coverageRatio >= 0.8) return settings;
  return withBaseCaptionOverrides(settings, {
    displayMode: 'buildup',
    layout: { maxGapMs: 2000, chunkGapMs: 0 },
  });
}

function tuneSegmentation(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport
): CaptionAttemptSettings {
  if (q.segmentation.score >= 0.9) return settings;
  return withBaseCaptionOverrides(settings, {
    layout: { maxGapMs: 900, targetWordsPerChunk: 4 },
  });
}

function tuneCapitalization(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport
): CaptionAttemptSettings {
  if (q.capitalization.score >= 0.9) return settings;
  return withBaseCaptionOverrides(settings, { textTransform: 'uppercase' });
}

function tuneSafeArea(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport
): CaptionAttemptSettings {
  if (q.safeArea.score >= 0.9) return settings;
  const currentEdgeDistance = settings.captionConfigOverrides.positionOffset?.edgeDistance;
  const nextEdgeDistance = clamp((currentEdgeDistance ?? 15) + 3, 10, 28);
  return withBaseCaptionOverrides(settings, {
    safeZone: { enabled: true, platform: 'universal' },
    positionOffset: { edgeDistance: nextEdgeDistance, horizontalPadding: 60 },
  });
}

function tuneLegibility(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport,
  nextLevel: number
): CaptionAttemptSettings {
  if (!(nextLevel >= 3 && q.ocrConfidence.mean > 0 && q.ocrConfidence.mean < 0.75)) {
    return settings;
  }
  return withBaseCaptionOverrides(settings, {
    stroke: { width: 5, useWebkitStroke: true, color: '#000000' },
    shadow: { enabled: true, color: 'rgba(0,0,0,0.75)', blur: 12, offsetX: 0, offsetY: 2 },
    pillStyle: { color: '#000000', borderRadius: 10, paddingX: 14, paddingY: 8 },
  });
}

function tuneTypography(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport,
  nextLevel: number,
  minOverallScore: number
): CaptionAttemptSettings {
  if (!(nextLevel >= 4 && q.overall.score < minOverallScore)) return settings;
  const currentFontSize = settings.captionConfigOverrides.fontSize;
  const nextFontSize = clamp((currentFontSize ?? 72) + 6, 60, 110);
  return withBaseCaptionOverrides(settings, {
    fontSize: nextFontSize,
    lineHeight: 1.22,
    letterSpacing: 0,
  });
}

function tunePreset(
  settings: CaptionAttemptSettings,
  q: BurnedInCaptionQualityReport,
  nextLevel: number,
  minOverallScore: number
): CaptionAttemptSettings {
  if (q.overall.score >= minOverallScore) return settings;

  if (nextLevel === 5) {
    return {
      ...settings,
      captionPreset: (settings.captionPreset ?? 'capcut') === 'capcut' ? 'tiktok' : 'capcut',
    };
  }

  if (nextLevel < 6) return settings;

  const ladder: CaptionPresetName[] = [
    'capcut',
    'tiktok',
    'reels',
    'youtube',
    'minimal',
    'bold',
    'karaoke',
    'hormozi',
    'neon',
  ];
  const currentPreset = settings.captionPreset ?? 'capcut';
  const index = ladder.indexOf(currentPreset);
  const nextPreset = ladder[(index >= 0 ? index + 1 : 0) % ladder.length];
  return { ...settings, captionPreset: nextPreset };
}

function getNextAttemptSettings(params: {
  current: CaptionAttemptSettings;
  rating: CaptionQualityRatingOutput;
  config: CaptionQualityGateConfig;
}): CaptionAttemptSettings | null {
  const { current, rating, config } = params;
  const currentLevel = current.tuningLevel ?? 0;
  const nextLevel = currentLevel + 1;
  const q: BurnedInCaptionQualityReport = rating.captionQuality;

  let next: CaptionAttemptSettings = {
    ...current,
    tuningLevel: nextLevel,
    captionConfigOverrides: current.captionConfigOverrides ?? {},
  };

  const before = JSON.stringify(next);

  if (nextLevel >= 1) {
    next = tuneStabilityAndPacing(next, q);
    next = tuneDensityAndSpeed(next, q);
    next = tuneCoverage(next, q);
    next = tuneSegmentation(next, q);
    next = tuneCapitalization(next, q);
    next = tuneSafeArea(next, q);
  }

  next = tuneLegibility(next, q, nextLevel);
  next = tuneTypography(next, q, nextLevel, config.minOverallScore);
  next = tunePreset(next, q, nextLevel, config.minOverallScore);

  const after = JSON.stringify(next);
  if (before === after) return null;

  return next;
}

export async function runGenerateWithCaptionQualityGate(params: {
  initialPipelineResult: PipelineResult;
  initialSettings: CaptionAttemptSettings;
  config: CaptionQualityGateConfig;
  rerender: (settings: CaptionAttemptSettings) => Promise<PipelineResult>;
  rate: (videoPath: string) => Promise<CaptionQualityRatingOutput>;
}): Promise<CaptionQualityGateResult> {
  const attemptHistory: CaptionQualityGateResult['attemptHistory'] = [];

  let settings: CaptionAttemptSettings = {
    ...params.initialSettings,
    captionConfigOverrides: params.initialSettings.captionConfigOverrides ?? {},
    tuningLevel: params.initialSettings.tuningLevel ?? 0,
  };

  let pipelineResult = params.initialPipelineResult;
  const maxAttempts = params.config.autoRetry ? 1 + params.config.maxRetries : 1;

  if (!params.config.enabled) {
    return {
      pipelineResult,
      attempts: 1,
      attemptHistory: [{ settings }],
      finalSettings: settings,
    };
  }

  let rating = await params.rate(pipelineResult.outputPath);
  attemptHistory.push({ settings, rating });

  if (didPassCaptionQuality(rating, params.config)) {
    return {
      pipelineResult,
      rating,
      attempts: attemptHistory.length,
      attemptHistory,
      finalSettings: settings,
    };
  }

  for (let attemptIndex = 1; attemptIndex < maxAttempts; attemptIndex++) {
    const next = params.config.autoRetry
      ? getNextAttemptSettings({ current: settings, rating, config: params.config })
      : null;

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
    pipelineResult = await params.rerender(settings);
    rating = await params.rate(pipelineResult.outputPath);
    attemptHistory.push({ settings, rating });

    if (didPassCaptionQuality(rating, params.config)) {
      return {
        pipelineResult,
        rating,
        attempts: attemptHistory.length,
        attemptHistory,
        finalSettings: settings,
      };
    }
  }

  return {
    pipelineResult,
    rating,
    attempts: attemptHistory.length,
    attemptHistory,
    finalSettings: settings,
  };
}
