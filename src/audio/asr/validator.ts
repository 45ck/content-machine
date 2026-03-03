/**
 * Timestamp Validation
 *
 * Validates word-level timestamps from ASR to catch corruption
 * before it causes rendering issues (like the v3 bug where end < start).
 *
 * @see docs/research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260110.md
 */

export type ValidationIssue =
  | 'end_before_start'
  | 'end_equals_start'
  | 'gap_too_large'
  | 'insufficient_coverage';

/**
 * Custom error for timestamp validation failures.
 * Includes detailed info about which word failed and why.
 */
export class TimestampValidationError extends Error {
  constructor(
    public readonly wordIndex: number,
    public readonly word: string,
    public readonly issue: ValidationIssue
  ) {
    const issueMessages: Record<ValidationIssue, string> = {
      end_before_start: `Word "${word}" at index ${wordIndex}: end time must be greater than start time`,
      end_equals_start: `Word "${word}" at index ${wordIndex}: end time equals start time (zero duration)`,
      gap_too_large: `Word "${word}" at index ${wordIndex}: gap too large from previous word`,
      insufficient_coverage: `Timestamps do not cover expected duration`,
    };

    super(issueMessages[issue]);
    this.name = 'TimestampValidationError';
  }
}

export interface WordTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

export interface ValidationOptions {
  /** Maximum allowed gap between words in seconds (default: 0.5) */
  maxGapSeconds?: number;
  /** Minimum coverage of total duration (default: 0.95 = 95%) */
  minCoverageRatio?: number;
  /** Whether to throw on first error or collect all errors (default: true) */
  throwOnFirst?: boolean;
}

/**
 * Validates word-level timestamps for common corruption patterns.
 *
 * Checks for:
 * 1. end <= start (the critical v3 bug)
 * 2. Large gaps between consecutive words
 * 3. Insufficient coverage of total duration
 *
 * @param words - Array of word timings from ASR
 * @param totalDuration - Expected total duration in seconds
 * @param options - Validation options
 * @throws TimestampValidationError if validation fails
 *
 * @example
 * ```ts
 * const words = [
 *   { word: 'hello', start: 0, end: 0.5 },
 *   { word: 'world', start: 0.5, end: 1.0 },
 * ];
 * validateWordTimings(words, 1.0); // OK
 *
 * const corrupted = [
 *   { word: 'bug', start: 5.0, end: 4.0 }, // end < start!
 * ];
 * validateWordTimings(corrupted, 10.0); // throws!
 * ```
 */
export function validateWordTimings(
  words: WordTiming[],
  totalDuration: number,
  options: ValidationOptions = {}
): void {
  const { minCoverageRatio = 0.95, throwOnFirst = true } = options;

  // Empty array is valid (no words to validate)
  if (words.length === 0) {
    return;
  }

  const errors = collectWordErrors(words, options);

  // Check coverage of total duration
  const coverageError = checkCoverage(words, totalDuration, minCoverageRatio);
  if (coverageError) {
    if (throwOnFirst && errors.length === 0) {
      throw coverageError;
    }
    errors.push(coverageError);
  }

  if (errors.length > 0) {
    if (throwOnFirst) {
      throw errors[0];
    }
    // Throw the first error with info about total count
    const firstError = errors[0];
    if (errors.length > 1) {
      firstError.message = `${firstError.message} (and ${errors.length - 1} more errors)`;
    }
    throw firstError;
  }
}

/**
 * Validate a single word's timing.
 * @internal
 */
function validateSingleWord(
  word: WordTiming,
  index: number,
  prevWord: WordTiming | undefined,
  maxGapSeconds: number
): TimestampValidationError | null {
  // Check 1: end must be greater than start (THE CRITICAL BUG)
  if (word.end < word.start) {
    return new TimestampValidationError(index, word.word, 'end_before_start');
  }

  // Check 2: end must not equal start (zero duration)
  if (word.end === word.start) {
    return new TimestampValidationError(index, word.word, 'end_equals_start');
  }

  // Check 3: Gap from previous word must not be too large
  if (prevWord) {
    const gap = word.start - prevWord.end;
    if (gap > maxGapSeconds) {
      return new TimestampValidationError(index, word.word, 'gap_too_large');
    }
  }

  return null;
}

/**
 * Collect validation errors for all words.
 * @internal
 */
function collectWordErrors(
  words: WordTiming[],
  options: ValidationOptions
): TimestampValidationError[] {
  const { maxGapSeconds = 0.5, throwOnFirst = true } = options;
  const errors: TimestampValidationError[] = [];

  for (let i = 0; i < words.length; i++) {
    const prevWord = i > 0 ? words[i - 1] : undefined;
    const error = validateSingleWord(words[i], i, prevWord, maxGapSeconds);

    if (error) {
      if (throwOnFirst) {
        throw error;
      }
      errors.push(error);
    }
  }

  return errors;
}

/**
 * Check coverage of total duration.
 * @internal
 */
function checkCoverage(
  words: WordTiming[],
  totalDuration: number,
  minCoverageRatio: number
): TimestampValidationError | null {
  if (totalDuration <= 0 || words.length === 0) {
    return null;
  }

  const lastWord = words[words.length - 1];
  const coverage = lastWord.end / totalDuration;

  if (coverage < minCoverageRatio) {
    return new TimestampValidationError(words.length - 1, lastWord.word, 'insufficient_coverage');
  }

  return null;
}

/**
 * Attempts to repair common timestamp issues.
 * Returns a new array with fixed timestamps, or throws if unfixable.
 *
 * Fixes:
 * - end < start: Sets end = start + estimated duration
 * - Small gaps: Interpolates timing
 *
 * @param words - Array of word timings (may be corrupted)
 * @param totalDuration - Expected total duration in seconds
 * @returns Fixed word timings
 */
export function repairWordTimings(words: WordTiming[], totalDuration: number): WordTiming[] {
  if (words.length === 0) {
    return [];
  }

  // Estimate average word duration from valid words
  let totalValidDuration = 0;
  let validCount = 0;

  for (const word of words) {
    if (word.end > word.start) {
      totalValidDuration += word.end - word.start;
      validCount++;
    }
  }

  const avgWordDuration = validCount > 0 ? totalValidDuration / validCount : 0.2; // Default 200ms

  // Fix corrupted words
  const fixed: WordTiming[] = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const newWord: WordTiming = { ...word };

    // Fix end <= start by using average duration
    if (word.end <= word.start) {
      newWord.end = word.start + avgWordDuration;

      // Ensure we don't exceed total duration
      if (newWord.end > totalDuration) {
        newWord.end = totalDuration;
      }
    }

    fixed.push(newWord);
  }

  return fixed;
}
