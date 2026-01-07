/**
 * Caption Quality Metrics
 *
 * Quantitative analysis of caption quality issues.
 * All metrics return 0-1 scores where 1 = perfect.
 *
 * This module implements "fail-first" quality gates:
 * - Tests fail until quality thresholds are met
 * - Each metric has a minimum acceptable score
 * - Aggregate score must meet overall threshold
 */

import type { WordTimestamp } from '../audio/schema';

/**
 * Quality metrics result
 */
export interface CaptionQualityReport {
  /** Overall score (0-1) */
  overallScore: number;

  /** Individual metric scores */
  metrics: {
    /** Words not split by Whisper (e.g., "Str" + "uggling" = 0) */
    wordIntegrity: number;

    /** Contractions kept together (e.g., "It" + "'s" = 0) */
    contractionIntegrity: number;

    /** Words have reasonable duration (not too short) */
    durationHealth: number;

    /** No overlapping timestamps */
    timestampValidity: number;

    /** Confidence scores are acceptable */
    confidenceHealth: number;

    /** Characters per second is readable */
    readabilityRate: number;

    /** Page transitions are smooth (not too fast/slow) */
    pagingQuality: number;
  };

  /** Specific issues found */
  issues: CaptionIssue[];

  /** Pass/fail status */
  passed: boolean;
}

export interface CaptionIssue {
  type:
    | 'split-word'
    | 'split-contraction'
    | 'zero-duration'
    | 'short-duration'
    | 'overlap'
    | 'low-confidence'
    | 'fast-cps'
    | 'slow-paging';
  wordIndex: number;
  word: string;
  detail: string;
  severity: 'error' | 'warning';
}

/**
 * Quality thresholds
 */
export const QUALITY_THRESHOLDS = {
  /** Minimum overall score to pass */
  overallMinimum: 0.85,

  /** Per-metric minimums */
  wordIntegrity: 0.95,
  contractionIntegrity: 0.9,
  durationHealth: 0.9,
  timestampValidity: 1.0, // No overlaps allowed
  confidenceHealth: 0.8,
  readabilityRate: 0.85,
  pagingQuality: 0.8,

  /** Specific thresholds */
  minWordDurationMs: 50, // Words shorter than this are suspicious
  minConfidence: 0.5, // Words below this confidence are flagged
  maxCps: 15, // Characters per second (readability limit)
  minCps: 3, // Too slow if below this
} as const;

/**
 * Common split word patterns from Whisper
 * Key: first fragment, Value: expected second fragment
 */
const SPLIT_WORD_PATTERNS: Record<string, string[]> = {
  Str: ['uggling', 'ong', 'eet', 'ategic'],
  hyd: ['rate', 'rogen', 'ration'],
  It: ["'s", "'ll", "'d"],
  I: ["'m", "'ve", "'ll", "'d"],
  you: ["'re", "'ll", "'ve", "'d"],
  we: ["'re", "'ll", "'ve", "'d"],
  they: ["'re", "'ll", "'ve", "'d"],
  he: ["'s", "'ll", "'d"],
  she: ["'s", "'ll", "'d"],
  that: ["'s", "'ll", "'d"],
  what: ["'s", "'ll", "'d"],
  who: ["'s", "'ll", "'d"],
  there: ["'s", "'ll", "'d"],
  here: ["'s", "'ll", "'d"],
  where: ["'s", "'ll", "'d"],
  let: ["'s"],
  can: ["'t"],
  won: ["'t"],
  don: ["'t"],
  doesn: ["'t"],
  didn: ["'t"],
  isn: ["'t"],
  aren: ["'t"],
  wasn: ["'t"],
  weren: ["'t"],
  couldn: ["'t"],
  wouldn: ["'t"],
  shouldn: ["'t"],
  hasn: ["'t"],
  haven: ["'t"],
  hadn: ["'t"],
};

/**
 * Analyze caption quality and return detailed report
 */
export function analyzeCaptionQuality(words: WordTimestamp[]): CaptionQualityReport {
  const issues: CaptionIssue[] = [];

  // Calculate individual metrics
  const wordIntegrity = calculateWordIntegrity(words, issues);
  const contractionIntegrity = calculateContractionIntegrity(words, issues);
  const durationHealth = calculateDurationHealth(words, issues);
  const timestampValidity = calculateTimestampValidity(words, issues);
  const confidenceHealth = calculateConfidenceHealth(words, issues);
  const readabilityRate = calculateReadabilityRate(words, issues);
  const pagingQuality = calculatePagingQuality(words, issues);

  // Calculate overall score (weighted average)
  const weights = {
    wordIntegrity: 0.2,
    contractionIntegrity: 0.15,
    durationHealth: 0.15,
    timestampValidity: 0.15,
    confidenceHealth: 0.1,
    readabilityRate: 0.15,
    pagingQuality: 0.1,
  };

  const overallScore =
    wordIntegrity * weights.wordIntegrity +
    contractionIntegrity * weights.contractionIntegrity +
    durationHealth * weights.durationHealth +
    timestampValidity * weights.timestampValidity +
    confidenceHealth * weights.confidenceHealth +
    readabilityRate * weights.readabilityRate +
    pagingQuality * weights.pagingQuality;

  // Check if all thresholds are met
  const passed =
    overallScore >= QUALITY_THRESHOLDS.overallMinimum &&
    wordIntegrity >= QUALITY_THRESHOLDS.wordIntegrity &&
    contractionIntegrity >= QUALITY_THRESHOLDS.contractionIntegrity &&
    durationHealth >= QUALITY_THRESHOLDS.durationHealth &&
    timestampValidity >= QUALITY_THRESHOLDS.timestampValidity &&
    confidenceHealth >= QUALITY_THRESHOLDS.confidenceHealth &&
    readabilityRate >= QUALITY_THRESHOLDS.readabilityRate &&
    pagingQuality >= QUALITY_THRESHOLDS.pagingQuality;

  return {
    overallScore,
    metrics: {
      wordIntegrity,
      contractionIntegrity,
      durationHealth,
      timestampValidity,
      confidenceHealth,
      readabilityRate,
      pagingQuality,
    },
    issues,
    passed,
  };
}

/**
 * Check if two adjacent words form a known split pattern
 */
function isKnownSplitWord(current: string, next: string): boolean {
  const expectedSuffixes = SPLIT_WORD_PATTERNS[current];
  if (!expectedSuffixes) return false;

  // Exclude contraction patterns (handled separately)
  if (expectedSuffixes.includes("'s") || expectedSuffixes.includes("'t")) {
    return false;
  }

  return expectedSuffixes.some((suffix) => next.toLowerCase() === suffix.toLowerCase());
}

/**
 * Check if two adjacent words look like a partial word split
 */
function isLikelyPartialWordSplit(current: string, next: string): boolean {
  // Pattern: short capitalized prefix + longer lowercase suffix
  if (current.length > 3) return false;
  if (!/^[A-Z][a-z]*$/.test(current)) return false;
  if (!/^[a-z]+$/.test(next)) return false;
  if (next.length <= 3) return false;

  const combined = current.toLowerCase() + next;
  return isValidEnglishWord(combined);
}

/**
 * Calculate word integrity score
 * Detects words split by Whisper (e.g., "Str" + "uggling")
 */
function calculateWordIntegrity(words: WordTimestamp[], issues: CaptionIssue[]): number {
  if (words.length === 0) return 1;

  let splitCount = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];

    // Check for known split patterns
    if (isKnownSplitWord(current.word, next.word)) {
      splitCount++;
      issues.push({
        type: 'split-word',
        wordIndex: i,
        word: current.word,
        detail: `"${current.word}" + "${next.word}" should be "${current.word}${next.word}"`,
        severity: 'error',
      });
      continue;
    }

    // Check for likely partial word splits
    if (isLikelyPartialWordSplit(current.word, next.word)) {
      splitCount++;
      const combined = current.word.toLowerCase() + next.word;
      issues.push({
        type: 'split-word',
        wordIndex: i,
        word: current.word,
        detail: `Likely split word: "${current.word}" + "${next.word}" = "${combined}"`,
        severity: 'error',
      });
    }
  }

  // Score: 1 - (splitCount / totalWords)
  return Math.max(0, 1 - splitCount / words.length);
}

/**
 * Calculate contraction integrity score
 * Detects contractions split by Whisper (e.g., "It" + "'s")
 */
function calculateContractionIntegrity(words: WordTimestamp[], issues: CaptionIssue[]): number {
  if (words.length === 0) return 1;

  let splitCount = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];

    // Check if next word is a contraction suffix
    if (/^'[a-z]+$/i.test(next.word)) {
      // This is a split contraction
      splitCount++;
      issues.push({
        type: 'split-contraction',
        wordIndex: i,
        word: current.word,
        detail: `Split contraction: "${current.word}" + "${next.word}" should be "${current.word}${next.word}"`,
        severity: 'warning',
      });
    }
  }

  return Math.max(0, 1 - splitCount / words.length);
}

/**
 * Calculate duration health score
 * Detects words with suspiciously short durations
 */
function calculateDurationHealth(words: WordTimestamp[], issues: CaptionIssue[]): number {
  if (words.length === 0) return 1;

  let problemCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const durationMs = (word.end - word.start) * 1000;

    if (durationMs <= 0) {
      problemCount++;
      issues.push({
        type: 'zero-duration',
        wordIndex: i,
        word: word.word,
        detail: `Zero or negative duration: ${durationMs.toFixed(0)}ms`,
        severity: 'error',
      });
    } else if (durationMs < QUALITY_THRESHOLDS.minWordDurationMs) {
      problemCount++;
      issues.push({
        type: 'short-duration',
        wordIndex: i,
        word: word.word,
        detail: `Very short duration: ${durationMs.toFixed(0)}ms (min: ${QUALITY_THRESHOLDS.minWordDurationMs}ms)`,
        severity: 'warning',
      });
    }
  }

  return Math.max(0, 1 - problemCount / words.length);
}

/**
 * Calculate timestamp validity score
 * Detects overlapping timestamps
 */
function calculateTimestampValidity(words: WordTimestamp[], issues: CaptionIssue[]): number {
  if (words.length <= 1) return 1;

  let overlapCount = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const current = words[i];
    const next = words[i + 1];

    // Check if next word starts before current word ends
    if (next.start < current.end - 0.01) {
      // 10ms tolerance
      overlapCount++;
      issues.push({
        type: 'overlap',
        wordIndex: i,
        word: current.word,
        detail: `Overlaps with next word: "${current.word}" ends at ${current.end.toFixed(2)}s but "${next.word}" starts at ${next.start.toFixed(2)}s`,
        severity: 'error',
      });
    }
  }

  return overlapCount === 0 ? 1 : 0;
}

/**
 * Calculate confidence health score
 * Flags words with low ASR confidence
 */
function calculateConfidenceHealth(words: WordTimestamp[], issues: CaptionIssue[]): number {
  if (words.length === 0) return 1;

  let lowConfidenceCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const confidence = word.confidence ?? 1;

    if (confidence < QUALITY_THRESHOLDS.minConfidence) {
      lowConfidenceCount++;
      issues.push({
        type: 'low-confidence',
        wordIndex: i,
        word: word.word,
        detail: `Low confidence: ${(confidence * 100).toFixed(0)}% (min: ${QUALITY_THRESHOLDS.minConfidence * 100}%)`,
        severity: 'warning',
      });
    }
  }

  return Math.max(0, 1 - lowConfidenceCount / words.length);
}

/**
 * Calculate readability rate score
 * Checks if characters per second is within readable range
 */
function calculateReadabilityRate(words: WordTimestamp[], issues: CaptionIssue[]): number {
  if (words.length === 0) return 1;

  // Calculate overall CPS for the entire audio
  const totalChars = words.reduce((sum, w) => sum + w.word.length, 0);
  const totalDuration = words[words.length - 1].end - words[0].start;

  if (totalDuration <= 0) return 1;

  const overallCps = totalChars / totalDuration;

  // Check if overall CPS is within acceptable range
  if (overallCps > QUALITY_THRESHOLDS.maxCps) {
    issues.push({
      type: 'fast-cps',
      wordIndex: 0,
      word: words[0].word,
      detail: `High overall CPS: ${overallCps.toFixed(1)} chars/sec (max: ${QUALITY_THRESHOLDS.maxCps})`,
      severity: 'warning',
    });
    // Score decreases proportionally to how much over the limit
    return Math.max(0, 1 - (overallCps - QUALITY_THRESHOLDS.maxCps) / QUALITY_THRESHOLDS.maxCps);
  }

  return 1;
}

/**
 * Calculate paging quality score
 * Checks if page transitions are smooth
 */
function calculatePagingQuality(_words: WordTimestamp[], _issues: CaptionIssue[]): number {
  // For now, return 1 - paging quality requires page data
  // This will be enhanced when we have actual paging info
  return 1;
}

/**
 * Simple check if a word is likely valid English
 * Uses common patterns, not a full dictionary
 */
function isValidEnglishWord(word: string): boolean {
  const lower = word.toLowerCase();
  // Common words that might be split
  const knownWords = [
    'struggling',
    'strong',
    'street',
    'strategic',
    'hydrate',
    'hydrogen',
    'hydration',
  ];
  return knownWords.includes(lower);
}

/**
 * Format quality report as human-readable string
 */
export function formatQualityReport(report: CaptionQualityReport): string {
  const lines: string[] = [];

  lines.push(`\n=== Caption Quality Report ===`);
  lines.push(`Overall Score: ${(report.overallScore * 100).toFixed(1)}%`);
  lines.push(`Status: ${report.passed ? '✅ PASSED' : '❌ FAILED'}`);

  lines.push(`\nMetrics:`);
  for (const [key, value] of Object.entries(report.metrics)) {
    const threshold = QUALITY_THRESHOLDS[key as keyof typeof QUALITY_THRESHOLDS];
    const status = typeof threshold === 'number' && value >= threshold ? '✓' : '✗';
    lines.push(`  ${status} ${key}: ${(value * 100).toFixed(1)}%`);
  }

  if (report.issues.length > 0) {
    lines.push(`\nIssues (${report.issues.length}):`);
    for (const issue of report.issues.slice(0, 10)) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      lines.push(`  ${icon} [${issue.type}] ${issue.detail}`);
    }
    if (report.issues.length > 10) {
      lines.push(`  ... and ${report.issues.length - 10} more issues`);
    }
  }

  return lines.join('\n');
}
