import type { OCRBoundingBox, OCRFrame } from '../domain';

export interface BurnedInCaptionThresholds {
  safeMarginRatio: number;
  idealReadingSpeedWps: { min: number; max: number };
  absoluteReadingSpeedWps: { min: number; max: number };
  recommendedCaptionDurationSeconds: { min: number; max: number };
  flashDurationSecondsMax: number;
  density: { maxLines: number; maxCharsPerLine: number };
  capitalization: { allCapsRatioMin: number };
  alignment: {
    idealCenterXRatio: number;
    maxMeanAbsCenterDxRatio: number;
  };
  placement: {
    maxStddevCenterXRatio: number;
    maxStddevCenterYRatio: number;
  };
  jitter: {
    maxMeanCenterDeltaPx: number;
    maxP95CenterDeltaPx: number;
  };
  style: {
    maxBboxHeightCv: number;
    maxBboxAreaCv: number;
  };
  pass: {
    minOverall: number;
    minCoverageRatio: number;
    maxFlickerEvents: number;
  };
}

export const DEFAULT_BURNED_IN_CAPTION_THRESHOLDS: BurnedInCaptionThresholds = {
  safeMarginRatio: 0.05,
  idealReadingSpeedWps: { min: 2, max: 4 },
  absoluteReadingSpeedWps: { min: 1, max: 7 },
  recommendedCaptionDurationSeconds: { min: 1, max: 7 },
  flashDurationSecondsMax: 0.5,
  density: { maxLines: 3, maxCharsPerLine: 45 },
  capitalization: { allCapsRatioMin: 0.8 },
  alignment: {
    idealCenterXRatio: 0.5,
    maxMeanAbsCenterDxRatio: 0.1,
  },
  placement: {
    maxStddevCenterXRatio: 0.02,
    maxStddevCenterYRatio: 0.02,
  },
  jitter: {
    maxMeanCenterDeltaPx: 10,
    maxP95CenterDeltaPx: 40,
  },
  style: {
    maxBboxHeightCv: 0.25,
    maxBboxAreaCv: 0.4,
  },
  pass: {
    minOverall: 0.75,
    minCoverageRatio: 0.6,
    maxFlickerEvents: 1,
  },
};

export interface BurnedInCaptionQualityWeights {
  rhythm: number;
  displayTime: number;
  coverage: number;
  safeArea: number;
  density: number;
  punctuation: number;
  capitalization: number;
  alignment: number;
  placement: number;
  jitter: number;
  style: number;
  redundancy: number;
  segmentation: number;
  ocrConfidence: number;
}

export const DEFAULT_BURNED_IN_CAPTION_QUALITY_WEIGHTS: BurnedInCaptionQualityWeights = {
  rhythm: 0.12,
  displayTime: 0.08,
  coverage: 0.12,
  safeArea: 0.1,
  density: 0.06,
  punctuation: 0.04,
  capitalization: 0.03,
  alignment: 0.06,
  placement: 0.06,
  jitter: 0.08,
  style: 0.05,
  redundancy: 0.05,
  segmentation: 0.06,
  ocrConfidence: 0.09,
};

export interface FrameSize {
  width: number;
  height: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function normalizeCaptionText(text: string): string {
  return String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForSimilarity(text: string): string {
  return normalizeCaptionText(text).toLowerCase();
}

function tokenizeForSimilarity(text: string): string[] {
  const normalized = normalizeForSimilarity(text);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9']/g, ''))
    .filter(Boolean);
}

function levenshteinDistance(a: string, b: string, maxDistance: number): number {
  if (a === b) return 0;
  const alen = a.length;
  const blen = b.length;
  if (alen === 0) return blen;
  if (blen === 0) return alen;
  if (Math.abs(alen - blen) > maxDistance) return maxDistance + 1;

  const v0 = new Array(blen + 1);
  const v1 = new Array(blen + 1);
  for (let i = 0; i <= blen; i++) v0[i] = i;

  for (let i = 0; i < alen; i++) {
    v1[0] = i + 1;
    let rowMin = v1[0];

    for (let j = 0; j < blen; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      rowMin = Math.min(rowMin, v1[j + 1]);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= blen; j++) v0[j] = v1[j];
  }

  return v0[blen];
}

function computeTokenOverlapRatio(a: string, b: string): number {
  const aTokens = tokenizeForSimilarity(a);
  const bTokens = tokenizeForSimilarity(b);
  const denom = Math.max(aTokens.length, bTokens.length);
  if (denom === 0) return a.trim().length === 0 && b.trim().length === 0 ? 1 : 0;

  const bSet = new Set(bTokens);
  let intersection = 0;
  for (const token of aTokens) {
    if (bSet.has(token)) intersection += 1;
  }
  return intersection / denom;
}

function areSimilarCaptions(aNormalized: string, bNormalized: string): boolean {
  const a = normalizeForSimilarity(aNormalized);
  const b = normalizeForSimilarity(bNormalized);
  if (a === b) return true;
  if (!a || !b) return false;

  const overlap = computeTokenOverlapRatio(a, b);
  if (overlap >= 0.8) return true;

  const maxLen = Math.max(a.length, b.length);
  const dist = levenshteinDistance(a, b, 6);
  if (dist <= 2) return true;
  if (dist > 6) return false;
  const similarity = 1 - dist / Math.max(1, maxLen);
  return similarity >= 0.88;
}

function countWords(text: string): number {
  const normalized = normalizeCaptionText(text);
  if (!normalized) return 0;
  return normalized.split(/\s+/).filter(Boolean).length;
}

function computeLineStats(text: string): { lineCount: number; maxCharsPerLine: number } {
  const normalized = String(text ?? '');
  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return { lineCount: 0, maxCharsPerLine: 0 };
  return {
    lineCount: lines.length,
    maxCharsPerLine: Math.max(...lines.map((line) => line.length)),
  };
}

function getFirstChar(text: string): string | null {
  const match = String(text ?? '').match(/[A-Za-z]/);
  return match ? match[0] : null;
}

function endsWithTerminalPunctuation(text: string): boolean {
  return /[.!?…]$/.test(String(text ?? '').trim());
}

function hasRepeatedPunctuation(text: string): boolean {
  return /[!?]{2,}|\.{4,}/.test(String(text ?? ''));
}

function isAllCaps(text: string, thresholds: BurnedInCaptionThresholds): boolean {
  const letters = String(text ?? '').replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length >= thresholds.capitalization.allCapsRatioMin;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const m = mean(values);
  const variance = mean(values.map((v) => (v - m) ** 2));
  return Math.sqrt(variance);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

function mergeBboxes(
  a: OCRBoundingBox | undefined,
  b: OCRBoundingBox | undefined
): OCRBoundingBox | undefined {
  if (!a) return b;
  if (!b) return a;
  return {
    x0: Math.min(a.x0, b.x0),
    y0: Math.min(a.y0, b.y0),
    x1: Math.max(a.x1, b.x1),
    y1: Math.max(a.y1, b.y1),
  };
}

function bboxCenter(bbox: OCRBoundingBox): { x: number; y: number } {
  return { x: (bbox.x0 + bbox.x1) / 2, y: (bbox.y0 + bbox.y1) / 2 };
}

function bboxWidth(bbox: OCRBoundingBox): number {
  return Math.max(0, bbox.x1 - bbox.x0);
}

function bboxHeight(bbox: OCRBoundingBox): number {
  return Math.max(0, bbox.y1 - bbox.y0);
}

function bboxArea(bbox: OCRBoundingBox): number {
  return bboxWidth(bbox) * bboxHeight(bbox);
}

export interface OcrCaptionSegment {
  text: string;
  normalizedText: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  wordCount: number;
  lineCount: number;
  maxCharsPerLine: number;
  meanConfidence: number;
  bbox?: OCRBoundingBox;
  center?: { x: number; y: number };
  bboxHeightPx?: number;
  bboxAreaPx?: number;
}

export function segmentOcrCaptionTimeline(params: {
  ocrFrames: OCRFrame[];
  fps: number;
  includeEmpty?: boolean;
}): OcrCaptionSegment[] {
  const fps = params.fps;
  const frameStep = fps > 0 ? 1 / fps : 0.5;
  const includeEmpty = Boolean(params.includeEmpty);
  const frames = [...params.ocrFrames].sort((a, b) => a.timestamp - b.timestamp);

  const segments: OcrCaptionSegment[] = [];

  let currentText: string | null = null;
  let currentNormalized: string | null = null;
  let bestConfidence = -1;
  let startSeconds = 0;
  let lastSeconds = 0;
  let confidences: number[] = [];
  let bboxes: OCRBoundingBox[] = [];

  function flush(): void {
    if (currentText === null || currentNormalized === null) return;
    const normalized = currentNormalized;
    if (!includeEmpty && normalized.length === 0) return;

    const endSeconds = lastSeconds + frameStep;
    const durationSeconds = Math.max(0, endSeconds - startSeconds);
    const wordCount = countWords(currentText);
    const { lineCount, maxCharsPerLine } = computeLineStats(currentText);
    const meanConfidence =
      confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;

    const mergedBbox = bboxes.reduce<OCRBoundingBox | undefined>(
      (acc, bbox) => mergeBboxes(acc, bbox),
      undefined
    );
    const center = mergedBbox ? bboxCenter(mergedBbox) : undefined;

    segments.push({
      text: currentText,
      normalizedText: normalized,
      startSeconds,
      endSeconds,
      durationSeconds,
      wordCount,
      lineCount,
      maxCharsPerLine,
      meanConfidence,
      ...(mergedBbox
        ? {
            bbox: mergedBbox,
            center,
            bboxHeightPx: bboxHeight(mergedBbox),
            bboxAreaPx: bboxArea(mergedBbox),
          }
        : {}),
    });
  }

  for (const f of frames) {
    const normalized = normalizeCaptionText(f.text);
    const text = f.text;
    const bbox = f.bbox;

    if (currentText === null) {
      currentText = text;
      currentNormalized = normalized;
      bestConfidence = f.confidence;
      startSeconds = f.timestamp;
      lastSeconds = f.timestamp;
      confidences = [f.confidence];
      bboxes = bbox && normalized.length > 0 ? [bbox] : [];
      continue;
    }

    const similar =
      normalized === currentNormalized ||
      (currentNormalized !== null && areSimilarCaptions(normalized, currentNormalized));

    if (similar) {
      lastSeconds = f.timestamp;
      confidences.push(f.confidence);
      if (bbox && normalized.length > 0) bboxes.push(bbox);
      if (f.confidence > bestConfidence) {
        bestConfidence = f.confidence;
        currentText = text;
        currentNormalized = normalized;
      }
      continue;
    }

    flush();
    currentText = text;
    currentNormalized = normalized;
    bestConfidence = f.confidence;
    startSeconds = f.timestamp;
    lastSeconds = f.timestamp;
    confidences = [f.confidence];
    bboxes = bbox && normalized.length > 0 ? [bbox] : [];
  }

  flush();
  return segments;
}

export interface BurnedInCaptionQualityReport {
  thresholds: BurnedInCaptionThresholds;
  weights: BurnedInCaptionQualityWeights;
  overall: {
    score: number;
    passed: boolean;
  };
  segments: OcrCaptionSegment[];
  rhythm: {
    meanWps: number;
    stddevWps: number;
    outOfIdealRangeCount: number;
    outOfAbsoluteRangeCount: number;
    score: number;
  };
  displayTime: {
    minDurationSeconds: number;
    maxDurationSeconds: number;
    flashSegmentCount: number;
    outOfRecommendedRangeCount: number;
    score: number;
  };
  coverage: {
    captionedSeconds: number;
    coverageRatio: number;
    score: number;
  };
  density: {
    maxLines: number;
    maxCharsPerLine: number;
    lineOverflowCount: number;
    charOverflowCount: number;
    score: number;
  };
  punctuation: {
    missingTerminalPunctuationCount: number;
    repeatedPunctuationCount: number;
    score: number;
  };
  capitalization: {
    style: 'all_caps' | 'sentence_case' | 'lowercase' | 'mixed';
    inconsistentStyleCount: number;
    score: number;
  };
  ocrConfidence: {
    mean: number;
    min: number;
    stddev: number;
    score: number;
  };
  safeArea: {
    violationCount: number;
    minMarginRatio: number;
    score: number;
  };
  flicker: {
    flickerEvents: number;
    score: number;
  };
  alignment: {
    meanAbsCenterDxRatio: number;
    maxAbsCenterDxRatio: number;
    score: number;
  };
  placement: {
    stddevCenterXRatio: number;
    stddevCenterYRatio: number;
    score: number;
  };
  jitter: {
    meanCenterDeltaPx: number;
    p95CenterDeltaPx: number;
    score: number;
  };
  style: {
    bboxHeightCv: number;
    bboxAreaCv: number;
    score: number;
  };
  redundancy: {
    reappearanceEvents: number;
    adjacentOverlapEvents: number;
    score: number;
  };
  segmentation: {
    danglingConjunctionCount: number;
    midSentenceBreakCount: number;
    score: number;
  };
}

function computeCaptionedSeconds(
  segments: OcrCaptionSegment[],
  videoDurationSeconds: number
): number {
  const total = segments.reduce((sum, seg) => sum + seg.durationSeconds, 0);
  return Math.max(0, Math.min(videoDurationSeconds, total));
}

function computeAllCapsRatio(text: string): number {
  const letters = String(text ?? '').replace(/[^A-Za-z]/g, '');
  if (!letters) return 0;
  const upper = letters.replace(/[^A-Z]/g, '').length;
  return upper / letters.length;
}

function classifyCapitalizationStyle(
  segments: OcrCaptionSegment[],
  thresholds: BurnedInCaptionThresholds
): BurnedInCaptionQualityReport['capitalization']['style'] {
  const combined = segments.map((s) => s.text).join(' ');
  const capsRatio = computeAllCapsRatio(combined);
  if (capsRatio >= thresholds.capitalization.allCapsRatioMin) return 'all_caps';

  const hasUpperStart = segments.some((s) => {
    const c = getFirstChar(s.text);
    return c ? c === c.toUpperCase() : false;
  });
  const hasLowerStart = segments.some((s) => {
    const c = getFirstChar(s.text);
    return c ? c === c.toLowerCase() : false;
  });

  if (hasUpperStart && !hasLowerStart) return 'sentence_case';
  if (!hasUpperStart && hasLowerStart) return 'lowercase';
  return 'mixed';
}

function computeSafeArea(params: {
  ocrFrames: OCRFrame[];
  frameSize: FrameSize;
  thresholds: BurnedInCaptionThresholds;
}): BurnedInCaptionQualityReport['safeArea'] {
  const framesWithBox = params.ocrFrames.filter(
    (f) => Boolean(f.bbox) && normalizeCaptionText(f.text).length > 0
  );
  if (framesWithBox.length === 0) {
    return { violationCount: 0, minMarginRatio: 1, score: 1 };
  }

  const requiredX = params.frameSize.width * params.thresholds.safeMarginRatio;
  const requiredY = params.frameSize.height * params.thresholds.safeMarginRatio;
  let violationCount = 0;
  let minMarginRatio = Infinity;

  for (const f of framesWithBox) {
    const bbox = f.bbox!;
    const left = bbox.x0;
    const right = params.frameSize.width - bbox.x1;
    const top = bbox.y0;
    const bottom = params.frameSize.height - bbox.y1;

    const ratioX = Math.min(left / requiredX, right / requiredX);
    const ratioY = Math.min(top / requiredY, bottom / requiredY);
    const ratio = Math.min(ratioX, ratioY);

    minMarginRatio = Math.min(minMarginRatio, ratio);
    if (ratio < 1) violationCount += 1;
  }

  const score = clamp01(minMarginRatio);
  return {
    violationCount,
    minMarginRatio: Number.isFinite(minMarginRatio) ? minMarginRatio : 1,
    score,
  };
}

function computeFlicker(params: {
  ocrFrames: OCRFrame[];
  fps: number;
  thresholds: BurnedInCaptionThresholds;
}): BurnedInCaptionQualityReport['flicker'] {
  const allSegments = segmentOcrCaptionTimeline({
    ocrFrames: params.ocrFrames,
    fps: params.fps,
    includeEmpty: true,
  });

  let flickerEvents = 0;
  for (let i = 0; i < allSegments.length - 2; i++) {
    const a = allSegments[i];
    const b = allSegments[i + 1];
    const c = allSegments[i + 2];
    if (a.normalizedText.length === 0) continue;
    if (b.normalizedText.length !== 0) continue;
    if (c.normalizedText.length === 0) continue;

    const gapSeconds = Math.max(0, c.startSeconds - a.endSeconds);
    if (gapSeconds <= params.thresholds.flashDurationSecondsMax) {
      flickerEvents += 1;
    }
  }

  const score = flickerEvents === 0 ? 1 : clamp01(1 - flickerEvents * 0.2);
  return { flickerEvents, score };
}

function computePunctuation(
  segments: OcrCaptionSegment[]
): BurnedInCaptionQualityReport['punctuation'] {
  let missingTerminalPunctuationCount = 0;
  let repeatedPunctuationCount = 0;

  for (let i = 0; i < segments.length; i++) {
    const s = segments[i];
    const text = s.text.trim();
    if (!text) continue;

    if (hasRepeatedPunctuation(text)) repeatedPunctuationCount += 1;

    const next = segments[i + 1];
    if (!next) continue;
    const nextFirst = getFirstChar(next.text);
    const looksLikeNewSentence = nextFirst ? nextFirst === nextFirst.toUpperCase() : false;
    const currentEndsWithWord = /[A-Za-z0-9]$/.test(text);
    const currentHasLowercase = /[a-z]/.test(text);

    if (
      currentHasLowercase &&
      looksLikeNewSentence &&
      currentEndsWithWord &&
      !endsWithTerminalPunctuation(text)
    ) {
      missingTerminalPunctuationCount += 1;
    }
  }

  const denom = Math.max(1, segments.length);
  const score = clamp01(1 - (missingTerminalPunctuationCount + repeatedPunctuationCount) / denom);
  return { missingTerminalPunctuationCount, repeatedPunctuationCount, score };
}

function computeRhythm(
  segments: OcrCaptionSegment[],
  thresholds: BurnedInCaptionThresholds
): BurnedInCaptionQualityReport['rhythm'] {
  const wps = segments
    .filter((s) => s.durationSeconds > 0 && s.wordCount > 0)
    .map((s) => s.wordCount / s.durationSeconds);
  const meanWps = mean(wps);
  const stddevWps = stddev(wps);

  let outOfIdealRangeCount = 0;
  let outOfAbsoluteRangeCount = 0;

  for (const v of wps) {
    if (v < thresholds.idealReadingSpeedWps.min || v > thresholds.idealReadingSpeedWps.max) {
      outOfIdealRangeCount += 1;
    }
    if (v < thresholds.absoluteReadingSpeedWps.min || v > thresholds.absoluteReadingSpeedWps.max) {
      outOfAbsoluteRangeCount += 1;
    }
  }

  const idealPenalty = outOfIdealRangeCount / Math.max(1, wps.length);
  const absolutePenalty = outOfAbsoluteRangeCount / Math.max(1, wps.length);
  const stabilityScore = clamp01(1 - stddevWps / 2);
  const score = clamp01(stabilityScore * (1 - idealPenalty * 0.5) * (1 - absolutePenalty));

  return { meanWps, stddevWps, outOfIdealRangeCount, outOfAbsoluteRangeCount, score };
}

function computeDisplayTime(
  segments: OcrCaptionSegment[],
  thresholds: BurnedInCaptionThresholds
): BurnedInCaptionQualityReport['displayTime'] {
  const durations = segments.map((s) => s.durationSeconds);
  const minDurationSeconds = durations.length > 0 ? Math.min(...durations) : 0;
  const maxDurationSeconds = durations.length > 0 ? Math.max(...durations) : 0;

  let flashSegmentCount = 0;
  let outOfRecommendedRangeCount = 0;
  for (const d of durations) {
    if (d > 0 && d < thresholds.flashDurationSecondsMax) flashSegmentCount += 1;
    if (
      d > 0 &&
      (d < thresholds.recommendedCaptionDurationSeconds.min ||
        d > thresholds.recommendedCaptionDurationSeconds.max)
    ) {
      outOfRecommendedRangeCount += 1;
    }
  }

  const denom = Math.max(1, segments.length);
  const score = clamp01(1 - flashSegmentCount / denom - outOfRecommendedRangeCount / denom / 2);
  return {
    minDurationSeconds,
    maxDurationSeconds,
    flashSegmentCount,
    outOfRecommendedRangeCount,
    score,
  };
}

function computeDensity(
  segments: OcrCaptionSegment[],
  thresholds: BurnedInCaptionThresholds
): BurnedInCaptionQualityReport['density'] {
  const maxLines = segments.length > 0 ? Math.max(...segments.map((s) => s.lineCount)) : 0;
  const maxCharsPerLine =
    segments.length > 0 ? Math.max(...segments.map((s) => s.maxCharsPerLine)) : 0;

  const lineOverflowCount = segments.filter(
    (s) => s.lineCount > thresholds.density.maxLines
  ).length;
  const charOverflowCount = segments.filter(
    (s) => s.maxCharsPerLine > thresholds.density.maxCharsPerLine
  ).length;

  const denom = Math.max(1, segments.length);
  const score = clamp01(1 - lineOverflowCount / denom - charOverflowCount / denom);
  return { maxLines, maxCharsPerLine, lineOverflowCount, charOverflowCount, score };
}

function computeCapitalization(
  segments: OcrCaptionSegment[],
  thresholds: BurnedInCaptionThresholds
): BurnedInCaptionQualityReport['capitalization'] {
  const style = classifyCapitalizationStyle(segments, thresholds);

  let inconsistentStyleCount = 0;
  if (style === 'all_caps') {
    for (const s of segments) {
      if (!isAllCaps(s.text, thresholds)) inconsistentStyleCount += 1;
    }
  } else if (style === 'sentence_case') {
    for (let i = 0; i < segments.length; i++) {
      const current = segments[i];
      const prev = segments[i - 1];
      const first = getFirstChar(current.text);
      if (!first) continue;

      const shouldStartSentence =
        !prev || endsWithTerminalPunctuation(prev.text) || prev.text.trim().length === 0;
      if (shouldStartSentence && first !== first.toUpperCase()) {
        inconsistentStyleCount += 1;
      }

      if (/\bi\b/.test(current.text)) {
        inconsistentStyleCount += 1;
      }
    }
  }

  const denom = Math.max(1, segments.length);
  const score = clamp01(1 - inconsistentStyleCount / denom);
  return { style, inconsistentStyleCount, score };
}

function computeOcrConfidence(frames: OCRFrame[]): BurnedInCaptionQualityReport['ocrConfidence'] {
  const confidences = frames
    .filter((f) => normalizeCaptionText(f.text).length > 0)
    .map((f) => f.confidence);
  if (confidences.length === 0) return { mean: 0, min: 0, stddev: 0, score: 0 };
  const m = mean(confidences);
  const min = Math.min(...confidences);
  const s = stddev(confidences);
  const score = clamp01(m - s);
  return { mean: m, min, stddev: s, score };
}

function computeAlignment(params: {
  segments: OcrCaptionSegment[];
  frameSize: FrameSize;
  thresholds: BurnedInCaptionThresholds;
}): BurnedInCaptionQualityReport['alignment'] {
  const idealX = params.frameSize.width * params.thresholds.alignment.idealCenterXRatio;
  const candidates = params.segments
    .map((s) => s.center?.x)
    .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));

  if (candidates.length === 0 || params.frameSize.width <= 0) {
    return { meanAbsCenterDxRatio: 0, maxAbsCenterDxRatio: 0, score: 1 };
  }

  const dxRatios = candidates.map((x) => Math.abs(x - idealX) / params.frameSize.width);
  const meanAbsCenterDxRatio = mean(dxRatios);
  const maxAbsCenterDxRatio = Math.max(...dxRatios);
  const score = clamp01(
    1 - meanAbsCenterDxRatio / Math.max(1e-9, params.thresholds.alignment.maxMeanAbsCenterDxRatio)
  );
  return { meanAbsCenterDxRatio, maxAbsCenterDxRatio, score };
}

function computePlacement(params: {
  segments: OcrCaptionSegment[];
  frameSize: FrameSize;
  thresholds: BurnedInCaptionThresholds;
}): BurnedInCaptionQualityReport['placement'] {
  const centers = params.segments
    .map((s) => s.center)
    .filter((c): c is { x: number; y: number } => Boolean(c));

  if (centers.length === 0 || params.frameSize.width <= 0 || params.frameSize.height <= 0) {
    return { stddevCenterXRatio: 0, stddevCenterYRatio: 0, score: 1 };
  }

  const xs = centers.map((c) => c.x / params.frameSize.width);
  const ys = centers.map((c) => c.y / params.frameSize.height);
  const stddevCenterXRatio = stddev(xs);
  const stddevCenterYRatio = stddev(ys);

  const scoreX = clamp01(
    1 - stddevCenterXRatio / Math.max(1e-9, params.thresholds.placement.maxStddevCenterXRatio)
  );
  const scoreY = clamp01(
    1 - stddevCenterYRatio / Math.max(1e-9, params.thresholds.placement.maxStddevCenterYRatio)
  );
  const score = clamp01((scoreX + scoreY) / 2);
  return { stddevCenterXRatio, stddevCenterYRatio, score };
}

function computeJitter(params: {
  ocrFrames: OCRFrame[];
  thresholds: BurnedInCaptionThresholds;
}): BurnedInCaptionQualityReport['jitter'] {
  const frames = [...params.ocrFrames]
    .filter((f) => normalizeCaptionText(f.text).length > 0 && Boolean(f.bbox))
    .sort((a, b) => a.timestamp - b.timestamp);

  const deltas: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    const prevText = normalizeCaptionText(frames[i - 1].text);
    const curText = normalizeCaptionText(frames[i].text);
    if (!areSimilarCaptions(prevText, curText)) continue;

    const prev = frames[i - 1].bbox!;
    const cur = frames[i].bbox!;
    const p = bboxCenter(prev);
    const c = bboxCenter(cur);
    const dx = c.x - p.x;
    const dy = c.y - p.y;
    deltas.push(Math.sqrt(dx * dx + dy * dy));
  }

  const meanCenterDeltaPx = mean(deltas);
  const p95CenterDeltaPx = percentile(deltas, 95);

  const scoreMean = clamp01(
    1 - meanCenterDeltaPx / Math.max(1e-9, params.thresholds.jitter.maxMeanCenterDeltaPx)
  );
  const scoreP95 = clamp01(
    1 - p95CenterDeltaPx / Math.max(1e-9, params.thresholds.jitter.maxP95CenterDeltaPx)
  );
  const score = clamp01((scoreMean + scoreP95) / 2);
  return { meanCenterDeltaPx, p95CenterDeltaPx, score };
}

function computeStyleConsistency(params: {
  segments: OcrCaptionSegment[];
  thresholds: BurnedInCaptionThresholds;
}): BurnedInCaptionQualityReport['style'] {
  const heights = params.segments
    .map((s) => {
      const h = s.bboxHeightPx;
      if (typeof h !== 'number' || !Number.isFinite(h) || h <= 0) return null;
      const lineCount = Math.max(1, s.lineCount);
      return h / lineCount;
    })
    .filter((h): h is number => typeof h === 'number' && Number.isFinite(h) && h > 0);
  const areas = params.segments
    .map((s) => {
      const a = s.bboxAreaPx;
      if (typeof a !== 'number' || !Number.isFinite(a) || a <= 0) return null;
      const charCount = Math.max(1, s.normalizedText.replace(/\s+/g, '').length);
      return a / charCount;
    })
    .filter((a): a is number => typeof a === 'number' && Number.isFinite(a) && a > 0);

  if (heights.length === 0 || areas.length === 0) {
    return { bboxHeightCv: 0, bboxAreaCv: 0, score: 1 };
  }

  const bboxHeightCv = stddev(heights) / Math.max(1e-9, mean(heights));
  const bboxAreaCv = stddev(areas) / Math.max(1e-9, mean(areas));

  const scoreH = clamp01(
    1 - bboxHeightCv / Math.max(1e-9, params.thresholds.style.maxBboxHeightCv)
  );
  const scoreA = clamp01(1 - bboxAreaCv / Math.max(1e-9, params.thresholds.style.maxBboxAreaCv));
  const score = clamp01((scoreH + scoreA) / 2);
  return { bboxHeightCv, bboxAreaCv, score };
}

function tokenizeWords(text: string): string[] {
  const normalized = normalizeCaptionText(text).toLowerCase();
  return normalized
    .split(/\s+/)
    .map((w) => w.replace(/[^a-z0-9']/g, ''))
    .filter(Boolean);
}

function computeRedundancy(
  segments: OcrCaptionSegment[]
): BurnedInCaptionQualityReport['redundancy'] {
  const nonEmpty = segments.filter((s) => s.normalizedText.length > 0);
  const seenAt = new Map<string, number>();
  let reappearanceEvents = 0;
  let adjacentOverlapEvents = 0;

  for (let i = 0; i < nonEmpty.length; i++) {
    const s = nonEmpty[i];
    const prevIndex = seenAt.get(s.normalizedText);
    if (prevIndex !== undefined && prevIndex < i - 1) {
      reappearanceEvents += 1;
    }
    seenAt.set(s.normalizedText, i);

    const prev = nonEmpty[i - 1];
    if (prev) {
      const a = tokenizeWords(prev.text);
      const b = tokenizeWords(s.text);
      const last1 = a.slice(-1).join(' ');
      const first1 = b.slice(0, 1).join(' ');
      const last2 = a.slice(-2).join(' ');
      const first2 = b.slice(0, 2).join(' ');
      if (last2 && first2 && last2 === first2) adjacentOverlapEvents += 1;
      else if (last1 && first1 && last1 === first1) adjacentOverlapEvents += 1;
    }
  }

  const denom = Math.max(1, nonEmpty.length);
  const score = clamp01(1 - (reappearanceEvents + adjacentOverlapEvents * 0.5) / denom);
  return { reappearanceEvents, adjacentOverlapEvents, score };
}

function computeSegmentation(
  segments: OcrCaptionSegment[]
): BurnedInCaptionQualityReport['segmentation'] {
  const nonEmpty = segments.filter((s) => s.normalizedText.length > 0);
  const conjunctions = new Set(['and', 'or', 'but', 'so', 'because', 'then']);

  let danglingConjunctionCount = 0;
  let midSentenceBreakCount = 0;

  for (let i = 0; i < nonEmpty.length; i++) {
    const s = nonEmpty[i];
    const words = tokenizeWords(s.text);
    const last = words[words.length - 1];
    const next = nonEmpty[i + 1];

    if (last && conjunctions.has(last) && next) {
      danglingConjunctionCount += 1;
    }

    if (next) {
      const nextFirst = getFirstChar(next.text);
      const currentEndsWithWord = /[A-Za-z0-9]$/.test(s.text.trim());
      if (currentEndsWithWord && nextFirst && nextFirst === nextFirst.toLowerCase()) {
        midSentenceBreakCount += 1;
      }
    }
  }

  const denom = Math.max(1, nonEmpty.length);
  const score = clamp01(1 - (danglingConjunctionCount + midSentenceBreakCount) / denom);
  return { danglingConjunctionCount, midSentenceBreakCount, score };
}

function computeOverallScore(params: {
  weights: BurnedInCaptionQualityWeights;
  subscores: Record<keyof BurnedInCaptionQualityWeights, number>;
}): number {
  const entries = Object.entries(params.weights) as Array<
    [keyof BurnedInCaptionQualityWeights, number]
  >;
  const weightSum = entries.reduce((sum, [, w]) => sum + w, 0);
  if (!Number.isFinite(weightSum) || weightSum <= 0) return 0;
  const weighted = entries.reduce((sum, [key, w]) => sum + (params.subscores[key] ?? 0) * w, 0);
  return clamp01(weighted / weightSum);
}

export function analyzeBurnedInCaptionQuality(params: {
  ocrFrames: OCRFrame[];
  fps: number;
  videoDurationSeconds: number;
  frameSize: FrameSize;
  thresholds?: BurnedInCaptionThresholds;
  weights?: BurnedInCaptionQualityWeights;
}): BurnedInCaptionQualityReport {
  const thresholds = params.thresholds ?? DEFAULT_BURNED_IN_CAPTION_THRESHOLDS;
  const weights = params.weights ?? DEFAULT_BURNED_IN_CAPTION_QUALITY_WEIGHTS;
  const segments = segmentOcrCaptionTimeline({ ocrFrames: params.ocrFrames, fps: params.fps });

  const rhythm = computeRhythm(segments, thresholds);
  const displayTime = computeDisplayTime(segments, thresholds);
  const captionedSeconds = computeCaptionedSeconds(segments, params.videoDurationSeconds);
  const coverageRatio =
    params.videoDurationSeconds > 0 ? captionedSeconds / params.videoDurationSeconds : 0;
  const coverageScore = clamp01(coverageRatio);
  const coverage = { captionedSeconds, coverageRatio, score: coverageScore };

  const density = computeDensity(segments, thresholds);
  const punctuation = computePunctuation(segments);
  const capitalization = computeCapitalization(segments, thresholds);
  const ocrConfidence = computeOcrConfidence(params.ocrFrames);
  const safeArea = computeSafeArea({
    ocrFrames: params.ocrFrames,
    frameSize: params.frameSize,
    thresholds,
  });
  const flicker = computeFlicker({ ocrFrames: params.ocrFrames, fps: params.fps, thresholds });
  const alignment = computeAlignment({ segments, frameSize: params.frameSize, thresholds });
  const placement = computePlacement({ segments, frameSize: params.frameSize, thresholds });
  const jitter = computeJitter({ ocrFrames: params.ocrFrames, thresholds });
  const style = computeStyleConsistency({ segments, thresholds });
  const redundancy = computeRedundancy(segments);
  const segmentation = computeSegmentation(segments);

  const overallScore = computeOverallScore({
    weights,
    subscores: {
      rhythm: rhythm.score,
      displayTime: displayTime.score,
      coverage: coverage.score,
      safeArea: safeArea.score,
      density: density.score,
      punctuation: punctuation.score,
      capitalization: capitalization.score,
      alignment: alignment.score,
      placement: placement.score,
      jitter: jitter.score,
      style: style.score,
      redundancy: redundancy.score,
      segmentation: segmentation.score,
      ocrConfidence: ocrConfidence.score,
    },
  });
  const passed =
    overallScore >= thresholds.pass.minOverall &&
    coverage.coverageRatio >= thresholds.pass.minCoverageRatio &&
    flicker.flickerEvents <= thresholds.pass.maxFlickerEvents;

  return {
    thresholds,
    weights,
    overall: { score: overallScore, passed },
    segments,
    rhythm,
    displayTime,
    coverage,
    density,
    punctuation,
    capitalization,
    ocrConfidence,
    safeArea,
    flicker,
    alignment,
    placement,
    jitter,
    style,
    redundancy,
    segmentation,
  };
}
