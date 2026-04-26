import type {
  CaptionExport,
  CaptionSegment,
  CaptionSyncGateResult,
  OcrCaptionSegment,
} from '../domain';
import { rateCaptionQuality, type CaptionQualityRatingOutput } from '../score';

export interface RenderedCaptionSyncThresholds {
  minSegmentMatchRatio: number;
  minDurationMatchRatio: number;
  maxMedianStartDriftMs: number;
  maxP95StartDriftMs: number;
  minCoverageRatio: number;
  minCaptionQualityScore: number;
  minMeanConfidence: number;
}

export const DEFAULT_RENDERED_CAPTION_SYNC_THRESHOLDS: RenderedCaptionSyncThresholds = {
  minSegmentMatchRatio: 0.65,
  minDurationMatchRatio: 0.55,
  maxMedianStartDriftMs: 350,
  maxP95StartDriftMs: 900,
  minCoverageRatio: 0.35,
  minCaptionQualityScore: 0.55,
  minMeanConfidence: 0.45,
};

export interface RenderedCaptionSyncOptions {
  fps?: number;
  maxSeconds?: number;
  thresholds?: Partial<RenderedCaptionSyncThresholds>;
  captionRegion?: {
    yRatio: number;
    heightRatio: number;
  };
}

export interface RenderedCaptionSyncMatch {
  expectedIndex: number;
  observedIndex: number;
  expectedText: string;
  observedText: string;
  expectedStartMs: number;
  observedStartMs: number;
  expectedEndMs: number;
  observedEndMs: number;
  startDriftMs: number;
  endDriftMs: number;
  textSimilarity: number;
}

export interface RenderedCaptionSyncIssue {
  type:
    | 'missing-captions'
    | 'low-caption-coverage'
    | 'low-caption-quality'
    | 'low-ocr-confidence'
    | 'low-match-ratio'
    | 'low-duration-match'
    | 'high-median-drift'
    | 'high-p95-drift';
  severity: 'error' | 'warning';
  message: string;
}

export interface RenderedCaptionSyncReport {
  schemaVersion: '1.0.0';
  videoPath: string;
  expectedSegmentCount: number;
  observedSegmentCount: number;
  matchedSegmentCount: number;
  segmentMatchRatio: number;
  durationMatchRatio: number;
  medianStartDriftMs: number;
  p95StartDriftMs: number;
  maxStartDriftMs: number;
  meanStartDriftMs: number;
  meanTextSimilarity: number;
  coverageRatio: number;
  captionQualityScore: number;
  meanConfidence: number;
  thresholds: RenderedCaptionSyncThresholds;
  passed: boolean;
  issues: RenderedCaptionSyncIssue[];
  matches: RenderedCaptionSyncMatch[];
  analysis: {
    fps: number;
    framesAnalyzed: number;
    analysisTimeMs: number;
  };
  createdAt: string;
}

function resolveThresholds(
  input?: Partial<RenderedCaptionSyncThresholds>
): RenderedCaptionSyncThresholds {
  return {
    ...DEFAULT_RENDERED_CAPTION_SYNC_THRESHOLDS,
    ...(input ?? {}),
  };
}

function normalizeCaptionText(text: string): string {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeCaptionText(text: string): string[] {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean);
}

function levenshteinDistance(a: string, b: string, maxDistance: number): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1).fill(0);

  for (let i = 0; i < a.length; i += 1) {
    current[0] = i + 1;
    let rowMin = current[0];

    for (let j = 0; j < b.length; j += 1) {
      const cost = a[i] === b[j] ? 0 : 1;
      current[j + 1] = Math.min(current[j] + 1, previous[j + 1] + 1, previous[j] + cost);
      rowMin = Math.min(rowMin, current[j + 1]);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length]!;
}

function computeTextSimilarity(a: string, b: string): number {
  const aNorm = normalizeCaptionText(a);
  const bNorm = normalizeCaptionText(b);
  if (!aNorm || !bNorm) return 0;
  if (aNorm === bNorm) return 1;
  if (aNorm.includes(bNorm) || bNorm.includes(aNorm)) return 0.92;

  const aTokens = tokenizeCaptionText(aNorm);
  const bTokens = tokenizeCaptionText(bNorm);
  if (aTokens.length === 0 || bTokens.length === 0) return 0;

  const bCounts = new Map<string, number>();
  for (const token of bTokens) {
    bCounts.set(token, (bCounts.get(token) ?? 0) + 1);
  }

  let intersection = 0;
  for (const token of aTokens) {
    const count = bCounts.get(token) ?? 0;
    if (count > 0) {
      intersection += 1;
      bCounts.set(token, count - 1);
    }
  }

  const precision = intersection / aTokens.length;
  const recall = intersection / bTokens.length;
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

function tokensLooselyMatch(expected: string, observed: string): boolean {
  if (expected === observed) return true;
  if (expected.length >= 4 && observed.startsWith(expected.slice(0, 4))) return true;
  if (observed.length >= 4 && expected.startsWith(observed.slice(0, 4))) return true;
  return levenshteinDistance(expected, observed, 2) <= 2;
}

function computeTokenEvidenceRatio(expectedText: string, observedTexts: string[]): number {
  const expectedTokens = tokenizeCaptionText(expectedText).filter((token) => token.length >= 2);
  if (expectedTokens.length === 0) return 0;

  const observedTokens = observedTexts.flatMap((text) =>
    tokenizeCaptionText(text).filter((token) => token.length >= 2)
  );
  if (observedTokens.length === 0) return 0;

  let matched = 0;
  for (const expectedToken of expectedTokens) {
    if (observedTokens.some((observedToken) => tokensLooselyMatch(expectedToken, observedToken))) {
      matched += 1;
    }
  }

  return matched / expectedTokens.length;
}

function overlapRatio(expected: CaptionSegment, observed: OcrCaptionSegment): number {
  const expectedStart = expected.startMs;
  const expectedEnd = expected.endMs;
  const observedStart = Math.round(observed.startSeconds * 1000);
  const observedEnd = Math.round(observed.endSeconds * 1000);
  const overlapMs = Math.max(
    0,
    Math.min(expectedEnd, observedEnd) - Math.max(expectedStart, observedStart)
  );
  const expectedDuration = Math.max(1, expectedEnd - expectedStart);
  return overlapMs / expectedDuration;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower]!;
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (idx - lower);
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildIssue(
  type: RenderedCaptionSyncIssue['type'],
  message: string,
  severity: RenderedCaptionSyncIssue['severity'] = 'error'
): RenderedCaptionSyncIssue {
  return { type, severity, message };
}

const SPLIT_SEAM_CAPTION_REGION = {
  yRatio: 0.42,
  heightRatio: 0.16,
} as const;

function shouldRetryCaptionSyncInCenterBand(report: RenderedCaptionSyncReport): boolean {
  if (report.passed) return false;
  if (report.captionQualityScore < report.thresholds.minCaptionQualityScore) return true;
  if (report.meanConfidence < report.thresholds.minMeanConfidence) return true;
  if (report.matchedSegmentCount === 0) return true;
  return report.segmentMatchRatio < report.thresholds.minSegmentMatchRatio;
}

function chooseBetterCaptionSyncReport(
  left: RenderedCaptionSyncReport,
  right: RenderedCaptionSyncReport
): RenderedCaptionSyncReport {
  if (left.passed !== right.passed) {
    return left.passed ? left : right;
  }
  if (left.matchedSegmentCount !== right.matchedSegmentCount) {
    return left.matchedSegmentCount > right.matchedSegmentCount ? left : right;
  }
  if (left.segmentMatchRatio !== right.segmentMatchRatio) {
    return left.segmentMatchRatio > right.segmentMatchRatio ? left : right;
  }
  if (left.captionQualityScore !== right.captionQualityScore) {
    return left.captionQualityScore > right.captionQualityScore ? left : right;
  }
  if (left.meanConfidence !== right.meanConfidence) {
    return left.meanConfidence > right.meanConfidence ? left : right;
  }
  if (left.medianStartDriftMs !== right.medianStartDriftMs) {
    return left.medianStartDriftMs < right.medianStartDriftMs ? left : right;
  }
  return left.p95StartDriftMs <= right.p95StartDriftMs ? left : right;
}

export function compareRenderedCaptions(params: {
  videoPath: string;
  expected: CaptionExport;
  observed: CaptionQualityRatingOutput;
  thresholds?: Partial<RenderedCaptionSyncThresholds>;
}): RenderedCaptionSyncReport {
  const thresholds = resolveThresholds(params.thresholds);
  const expectedSegments = params.expected.segments;
  const observedSegments = params.observed.captionQuality.segments;
  const matches: RenderedCaptionSyncMatch[] = [];
  const issues: RenderedCaptionSyncIssue[] = [];

  for (let expectedIndex = 0; expectedIndex < expectedSegments.length; expectedIndex += 1) {
    const expected = expectedSegments[expectedIndex]!;
    const paddedStartMs = Math.max(0, expected.startMs - 500);
    const paddedEndMs = expected.endMs + 500;
    const timeCandidates = observedSegments.filter((observed) => {
      const observedStartMs = Math.round(observed.startSeconds * 1000);
      const observedEndMs = Math.round(observed.endSeconds * 1000);
      return observedEndMs >= paddedStartMs && observedStartMs <= paddedEndMs;
    });
    if (timeCandidates.length === 0) continue;

    const tokenEvidenceRatio = computeTokenEvidenceRatio(
      expected.text,
      timeCandidates.map((candidate) => candidate.text)
    );
    let earliestMatchedStartMs: number | null = null;
    let latestMatchedEndMs: number | null = null;
    let bestMatch: RenderedCaptionSyncMatch | null = null;

    for (const observed of timeCandidates) {
      const observedIndex = observedSegments.indexOf(observed);
      const textSimilarity = computeTextSimilarity(expected.text, observed.text);
      const timeOverlapRatio = overlapRatio(expected, observed);
      const observedStartMs = Math.round(observed.startSeconds * 1000);
      const observedEndMs = Math.round(observed.endSeconds * 1000);
      const startDriftMs = observedStartMs - expected.startMs;
      const absStartDriftMs = Math.abs(startDriftMs);
      const tokenRatio = computeTokenEvidenceRatio(expected.text, [observed.text]);
      const evidenceRatio = Math.max(tokenEvidenceRatio, tokenRatio);
      const timeScore = Math.max(0, 1 - absStartDriftMs / 2000);
      const score =
        tokenRatio * 0.6 + textSimilarity * 0.25 + Math.max(timeOverlapRatio, timeScore) * 0.15;

      if (tokenRatio >= 0.45 || textSimilarity >= 0.55) {
        earliestMatchedStartMs =
          earliestMatchedStartMs == null
            ? observedStartMs
            : Math.min(earliestMatchedStartMs, observedStartMs);
        latestMatchedEndMs =
          latestMatchedEndMs == null ? observedEndMs : Math.max(latestMatchedEndMs, observedEndMs);
      }

      if (
        evidenceRatio < 0.55 &&
        textSimilarity < 0.5 &&
        !(textSimilarity >= 0.4 && timeOverlapRatio >= 0.5)
      ) {
        continue;
      }

      const bestScore =
        bestMatch == null
          ? -1
          : Math.max(
              computeTokenEvidenceRatio(expected.text, [bestMatch.observedText]),
              bestMatch.textSimilarity
            ) *
              0.85 +
            Math.max(
              overlapRatio(expected, observedSegments[bestMatch.observedIndex]!),
              Math.max(0, 1 - Math.abs(bestMatch.startDriftMs) / 2000)
            ) *
              0.15;

      if (!bestMatch || score > bestScore) {
        bestMatch = {
          expectedIndex,
          observedIndex,
          expectedText: expected.text,
          observedText: observed.text,
          expectedStartMs: expected.startMs,
          observedStartMs,
          expectedEndMs: expected.endMs,
          observedEndMs,
          startDriftMs,
          endDriftMs: observedEndMs - expected.endMs,
          textSimilarity: Math.max(textSimilarity, tokenRatio),
        };
      }
    }

    if (bestMatch && tokenEvidenceRatio >= 0.55) {
      if (earliestMatchedStartMs != null) {
        bestMatch.observedStartMs = earliestMatchedStartMs;
        bestMatch.startDriftMs = earliestMatchedStartMs - expected.startMs;
      }
      if (latestMatchedEndMs != null) {
        bestMatch.observedEndMs = latestMatchedEndMs;
        bestMatch.endDriftMs = latestMatchedEndMs - expected.endMs;
      }
      matches.push(bestMatch);
    }
  }

  const totalExpectedDurationMs = expectedSegments.reduce(
    (sum, segment) => sum + Math.max(0, segment.endMs - segment.startMs),
    0
  );
  const matchedExpectedDurationMs = matches.reduce(
    (sum, match) => sum + Math.max(0, match.expectedEndMs - match.expectedStartMs),
    0
  );
  const absStartDrifts = matches.map((match) => Math.abs(match.startDriftMs));
  const segmentMatchRatio =
    expectedSegments.length > 0 ? matches.length / expectedSegments.length : 0;
  const durationMatchRatio =
    totalExpectedDurationMs > 0 ? matchedExpectedDurationMs / totalExpectedDurationMs : 0;
  const coverageRatio = params.observed.captionQuality.coverage.coverageRatio;
  const captionQualityScore = params.observed.captionQuality.overall.score;
  const meanConfidence = params.observed.captionQuality.ocrConfidence.mean;
  const medianStartDriftMs = median(absStartDrifts);
  const p95StartDriftMs = percentile(absStartDrifts, 95);
  const maxStartDriftMs = absStartDrifts.length > 0 ? Math.max(...absStartDrifts) : 0;
  const meanStartDriftMs = mean(absStartDrifts);
  const meanTextSimilarity = mean(matches.map((match) => match.textSimilarity));

  if (observedSegments.length === 0) {
    issues.push(
      buildIssue('missing-captions', 'Rendered captions could not be detected in the final video.')
    );
  }
  if (coverageRatio < thresholds.minCoverageRatio) {
    issues.push(
      buildIssue(
        'low-caption-coverage',
        `Rendered caption coverage ${coverageRatio.toFixed(2)} is below ${thresholds.minCoverageRatio.toFixed(2)}.`
      )
    );
  }
  if (captionQualityScore < thresholds.minCaptionQualityScore) {
    issues.push(
      buildIssue(
        'low-caption-quality',
        `Rendered caption OCR quality ${captionQualityScore.toFixed(2)} is below ${thresholds.minCaptionQualityScore.toFixed(2)}.`,
        'warning'
      )
    );
  }
  if (meanConfidence < thresholds.minMeanConfidence) {
    issues.push(
      buildIssue(
        'low-ocr-confidence',
        `Rendered caption OCR confidence ${meanConfidence.toFixed(2)} is below ${thresholds.minMeanConfidence.toFixed(2)}.`,
        'warning'
      )
    );
  }
  if (segmentMatchRatio < thresholds.minSegmentMatchRatio) {
    issues.push(
      buildIssue(
        'low-match-ratio',
        `Only ${(segmentMatchRatio * 100).toFixed(0)}% of expected caption segments matched the rendered video.`
      )
    );
  }
  if (durationMatchRatio < thresholds.minDurationMatchRatio) {
    issues.push(
      buildIssue(
        'low-duration-match',
        `Matched caption coverage ${(durationMatchRatio * 100).toFixed(0)}% of expected caption duration.`
      )
    );
  }
  if (medianStartDriftMs > thresholds.maxMedianStartDriftMs) {
    issues.push(
      buildIssue(
        'high-median-drift',
        `Median caption start drift ${medianStartDriftMs.toFixed(0)}ms exceeds ${thresholds.maxMedianStartDriftMs.toFixed(0)}ms.`
      )
    );
  }
  if (p95StartDriftMs > thresholds.maxP95StartDriftMs) {
    issues.push(
      buildIssue(
        'high-p95-drift',
        `P95 caption start drift ${p95StartDriftMs.toFixed(0)}ms exceeds ${thresholds.maxP95StartDriftMs.toFixed(0)}ms.`
      )
    );
  }

  const passed = issues.every((issue) => issue.severity !== 'error');
  return {
    schemaVersion: '1.0.0',
    videoPath: params.videoPath,
    expectedSegmentCount: expectedSegments.length,
    observedSegmentCount: observedSegments.length,
    matchedSegmentCount: matches.length,
    segmentMatchRatio,
    durationMatchRatio,
    medianStartDriftMs,
    p95StartDriftMs,
    maxStartDriftMs,
    meanStartDriftMs,
    meanTextSimilarity,
    coverageRatio,
    captionQualityScore,
    meanConfidence,
    thresholds,
    passed,
    issues,
    matches,
    analysis: {
      fps: params.observed.analysis.fps,
      framesAnalyzed: params.observed.analysis.framesAnalyzed,
      analysisTimeMs: params.observed.analysis.analysisTimeMs,
    },
    createdAt: new Date().toISOString(),
  };
}

export async function analyzeRenderedCaptionSync(params: {
  videoPath: string;
  expected: CaptionExport;
  options?: RenderedCaptionSyncOptions;
}): Promise<RenderedCaptionSyncReport> {
  const fps = params.options?.fps ?? 3;
  const thresholds = resolveThresholds(params.options?.thresholds);
  const primaryRegion = params.options?.captionRegion ?? { yRatio: 0.65, heightRatio: 0.35 };
  const observed = await rateCaptionQuality(params.videoPath, {
    fps,
    maxSeconds: params.options?.maxSeconds,
    captionRegion: primaryRegion,
  });
  let bestReport = compareRenderedCaptions({
    videoPath: params.videoPath,
    expected: params.expected,
    observed,
    thresholds,
  });

  if (!params.options?.captionRegion && shouldRetryCaptionSyncInCenterBand(bestReport)) {
    const centerObserved = await rateCaptionQuality(params.videoPath, {
      fps,
      maxSeconds: params.options?.maxSeconds,
      captionRegion: SPLIT_SEAM_CAPTION_REGION,
    });
    const centerReport = compareRenderedCaptions({
      videoPath: params.videoPath,
      expected: params.expected,
      observed: centerObserved,
      thresholds,
    });
    bestReport = chooseBetterCaptionSyncReport(bestReport, centerReport);
  }

  return bestReport;
}

export function runCaptionSyncGate(report: RenderedCaptionSyncReport): CaptionSyncGateResult {
  return {
    gateId: 'caption-sync',
    passed: report.passed,
    severity: 'error',
    fix: 'Render with the shipped caption export and re-run review. Avoid fallback subtitle burns or timing transforms that change caption timing after export.',
    message: report.passed
      ? `Caption sync verified (${report.matchedSegmentCount}/${report.expectedSegmentCount} segments matched, median drift ${report.medianStartDriftMs.toFixed(0)}ms).`
      : `Caption sync failed (${report.matchedSegmentCount}/${report.expectedSegmentCount} segments matched, median drift ${report.medianStartDriftMs.toFixed(0)}ms, P95 ${report.p95StartDriftMs.toFixed(0)}ms).`,
    details: {
      expectedSegmentCount: report.expectedSegmentCount,
      observedSegmentCount: report.observedSegmentCount,
      matchedSegmentCount: report.matchedSegmentCount,
      segmentMatchRatio: report.segmentMatchRatio,
      durationMatchRatio: report.durationMatchRatio,
      medianStartDriftMs: report.medianStartDriftMs,
      p95StartDriftMs: report.p95StartDriftMs,
      maxStartDriftMs: report.maxStartDriftMs,
      coverageRatio: report.coverageRatio,
      captionQualityScore: report.captionQualityScore,
      meanConfidence: report.meanConfidence,
      minSegmentMatchRatio: report.thresholds.minSegmentMatchRatio,
      minDurationMatchRatio: report.thresholds.minDurationMatchRatio,
      maxMedianStartDriftMs: report.thresholds.maxMedianStartDriftMs,
      maxP95StartDriftMs: report.thresholds.maxP95StartDriftMs,
    },
  };
}
