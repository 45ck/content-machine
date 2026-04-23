import { CMError } from '../core/errors';
import type { CaptionQualityRatingOutput } from '../domain';
import { rateCaptionQuality } from './sync-rater';

export interface SourceTextGuardThresholds {
  minCoverageRatio: number;
  minCaptionedSeconds: number;
  minOverallScore: number;
  minSegmentCount: number;
  minMeanConfidence: number;
}

export const DEFAULT_SOURCE_TEXT_GUARD_THRESHOLDS: SourceTextGuardThresholds = {
  minCoverageRatio: 0.2,
  minCaptionedSeconds: 1.5,
  minOverallScore: 0.7,
  minSegmentCount: 2,
  minMeanConfidence: 0.55,
};

export interface SourceTextRiskAssessment {
  flagged: boolean;
  coverageRatio: number;
  captionedSeconds: number;
  overallScore: number;
  meanConfidence: number;
  segmentCount: number;
  reasons: string[];
}

export interface AuditSourceVideoOptions {
  fps?: number;
  maxSeconds?: number;
  thresholds?: Partial<SourceTextGuardThresholds>;
}

function resolveThresholds(input?: Partial<SourceTextGuardThresholds>): SourceTextGuardThresholds {
  return {
    ...DEFAULT_SOURCE_TEXT_GUARD_THRESHOLDS,
    ...(input ?? {}),
  };
}

/** Classifies whether OCR results look like persistent caption-style text in source footage. */
export function assessSourceTextRisk(params: {
  report: CaptionQualityRatingOutput;
  thresholds?: Partial<SourceTextGuardThresholds>;
}): SourceTextRiskAssessment {
  const thresholds = resolveThresholds(params.thresholds);
  const coverageRatio = params.report.captionQuality.coverage.coverageRatio;
  const captionedSeconds = params.report.captionQuality.coverage.captionedSeconds;
  const overallScore = params.report.captionQuality.overall.score;
  const meanConfidence = params.report.captionQuality.ocrConfidence.mean;
  const segmentCount = params.report.captionQuality.segments.length;
  const reasons: string[] = [];

  if (coverageRatio >= thresholds.minCoverageRatio) {
    reasons.push(
      `coverage ${coverageRatio.toFixed(2)} >= ${thresholds.minCoverageRatio.toFixed(2)}`
    );
  }
  if (captionedSeconds >= thresholds.minCaptionedSeconds) {
    reasons.push(
      `captioned seconds ${captionedSeconds.toFixed(2)} >= ${thresholds.minCaptionedSeconds.toFixed(
        2
      )}`
    );
  }
  if (overallScore >= thresholds.minOverallScore) {
    reasons.push(
      `caption score ${overallScore.toFixed(2)} >= ${thresholds.minOverallScore.toFixed(2)}`
    );
  }
  if (segmentCount >= thresholds.minSegmentCount) {
    reasons.push(`segments ${segmentCount} >= ${thresholds.minSegmentCount}`);
  }
  if (meanConfidence >= thresholds.minMeanConfidence) {
    reasons.push(
      `ocr confidence ${meanConfidence.toFixed(2)} >= ${thresholds.minMeanConfidence.toFixed(2)}`
    );
  }

  const flagged =
    coverageRatio >= thresholds.minCoverageRatio &&
    captionedSeconds >= thresholds.minCaptionedSeconds &&
    overallScore >= thresholds.minOverallScore &&
    segmentCount >= thresholds.minSegmentCount &&
    meanConfidence >= thresholds.minMeanConfidence;

  return {
    flagged,
    coverageRatio,
    captionedSeconds,
    overallScore,
    meanConfidence,
    segmentCount,
    reasons,
  };
}

/** Runs a full-frame OCR caption pass against a candidate source clip before render. */
export async function auditSourceVideoForText(
  videoPath: string,
  options?: AuditSourceVideoOptions
) {
  const report = await rateCaptionQuality(videoPath, {
    fps: options?.fps ?? 1.5,
    maxSeconds: options?.maxSeconds ?? 8,
    captionRegion: {
      yRatio: 0,
      heightRatio: 1,
    },
  });

  return {
    report,
    assessment: assessSourceTextRisk({
      report,
      thresholds: options?.thresholds,
    }),
  };
}

/** Throws when a candidate source video looks like an already-captioned short. */
export function assertSourceVideoLooksCaptionClean(params: {
  videoPath: string;
  assessment: SourceTextRiskAssessment;
  context?: string;
}): void {
  if (!params.assessment.flagged) return;

  throw new CMError(
    'INVALID_ARGUMENT',
    'Local source footage appears to contain persistent burned-in text or captions',
    {
      videoPath: params.videoPath,
      context: params.context,
      assessment: params.assessment,
      fix: 'Use caption-clean raw footage for visuals/render, or treat the short as a reference and run reverse-engineer-winner instead.',
    }
  );
}
