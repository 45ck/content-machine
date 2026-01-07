/**
 * ASR Word Post-Processor
 *
 * Fixes common Whisper ASR issues:
 * - Merges split words (e.g., "Str" + "uggling" → "Struggling")
 * - Merges split contractions (e.g., "It" + "'s" → "It's")
 * - Fixes overlapping timestamps
 * - Extends very short word durations
 *
 * @module audio/asr/post-processor
 */

import type { WordTimestamp } from '../schema';

/**
 * Options for post-processing
 */
export interface PostProcessorOptions {
  /** Merge split words (default: true) */
  mergeWords?: boolean;

  /** Merge split contractions (default: true) */
  mergeContractions?: boolean;

  /** Fix overlapping timestamps (default: true) */
  fixOverlaps?: boolean;

  /** Minimum word duration in ms (default: 50) */
  minDurationMs?: number;
}

const DEFAULT_OPTIONS: Required<PostProcessorOptions> = {
  mergeWords: true,
  mergeContractions: true,
  fixOverlaps: true,
  minDurationMs: 50,
};

/**
 * Known split word patterns
 * Key: prefix fragment
 * Value: array of [suffix, complete word] pairs
 */
const SPLIT_WORD_PATTERNS: Map<string, Array<[string, string]>> = new Map([
  [
    'Str',
    [
      ['uggling', 'Struggling'],
      ['ong', 'Strong'],
      ['eet', 'Street'],
      ['ategic', 'Strategic'],
    ],
  ],
  [
    'str',
    [
      ['uggling', 'struggling'],
      ['ong', 'strong'],
      ['eet', 'street'],
      ['ategic', 'strategic'],
    ],
  ],
  [
    'hyd',
    [
      ['rate', 'hydrate'],
      ['rogen', 'hydrogen'],
      ['ration', 'hydration'],
    ],
  ],
  [
    'Hyd',
    [
      ['rate', 'Hydrate'],
      ['rogen', 'Hydrogen'],
      ['ration', 'Hydration'],
    ],
  ],
  [
    'pro',
    [
      ['duct', 'product'],
      ['gram', 'program'],
      ['cess', 'process'],
    ],
  ],
  [
    'Pro',
    [
      ['duct', 'Product'],
      ['gram', 'Program'],
      ['cess', 'Process'],
    ],
  ],
  [
    'con',
    [
      ['tent', 'content'],
      ['trol', 'control'],
      ['sider', 'consider'],
    ],
  ],
  [
    'Con',
    [
      ['tent', 'Content'],
      ['trol', 'Control'],
      ['sider', 'Consider'],
    ],
  ],
]);

/**
 * Contraction suffixes to merge
 */
const CONTRACTION_SUFFIXES = ["'s", "'t", "'re", "'ve", "'ll", "'d", "'m"];

/**
 * Post-process ASR word timestamps to fix common issues
 *
 * @param words - Array of word timestamps from ASR
 * @param options - Processing options
 * @returns Fixed array of word timestamps
 */
export function postProcessASRWords(
  words: WordTimestamp[],
  options: PostProcessorOptions = {}
): WordTimestamp[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let result = [...words];

  // Step 1: Merge split words
  if (opts.mergeWords) {
    result = mergeSplitWords(result);
  }

  // Step 2: Merge split contractions
  if (opts.mergeContractions) {
    result = mergeSplitContractions(result);
  }

  // Step 3: Fix overlapping timestamps
  if (opts.fixOverlaps) {
    result = fixOverlappingTimestamps(result);
  }

  // Step 4: Extend very short durations
  if (opts.minDurationMs > 0) {
    result = extendShortDurations(result, opts.minDurationMs);
  }

  return result;
}

/**
 * Merge split words like "Str" + "uggling" → "Struggling"
 */
function mergeSplitWords(words: WordTimestamp[]): WordTimestamp[] {
  if (words.length < 2) return words;

  const result: WordTimestamp[] = [];
  let i = 0;

  while (i < words.length) {
    const current = words[i];
    const next = words[i + 1];

    if (next) {
      // Check for known split pattern
      const patterns = SPLIT_WORD_PATTERNS.get(current.word);
      if (patterns) {
        const match = patterns.find(([suffix]) => next.word.toLowerCase() === suffix.toLowerCase());
        if (match) {
          // Merge the words
          result.push({
            word: match[1], // Complete word with proper casing
            start: current.start,
            end: next.end,
            confidence: Math.min(current.confidence ?? 1, next.confidence ?? 1),
          });
          i += 2; // Skip both words
          continue;
        }
      }

      // Check for generic split (short capitalized prefix + lowercase suffix)
      if (
        current.word.length <= 3 &&
        /^[A-Z][a-z]*$/.test(current.word) &&
        /^[a-z]+$/.test(next.word) &&
        next.word.length >= 4 &&
        isLikelySplitWord(current.word, next.word)
      ) {
        // Merge with proper casing
        const merged =
          current.word.charAt(0).toUpperCase() +
          current.word.slice(1).toLowerCase() +
          next.word.toLowerCase();
        result.push({
          word: merged,
          start: current.start,
          end: next.end,
          confidence: Math.min(current.confidence ?? 1, next.confidence ?? 1),
        });
        i += 2;
        continue;
      }
    }

    result.push(current);
    i++;
  }

  return result;
}

/**
 * Merge split contractions like "It" + "'s" → "It's"
 */
function mergeSplitContractions(words: WordTimestamp[]): WordTimestamp[] {
  if (words.length < 2) return words;

  const result: WordTimestamp[] = [];
  let i = 0;

  while (i < words.length) {
    const current = words[i];
    const next = words[i + 1];

    if (next && CONTRACTION_SUFFIXES.includes(next.word)) {
      // Merge contraction
      result.push({
        word: current.word + next.word,
        start: current.start,
        end: next.end,
        confidence: Math.min(current.confidence ?? 1, next.confidence ?? 1),
      });
      i += 2; // Skip both words
    } else {
      result.push(current);
      i++;
    }
  }

  return result;
}

/**
 * Fix overlapping timestamps by adjusting end times
 */
function fixOverlappingTimestamps(words: WordTimestamp[]): WordTimestamp[] {
  if (words.length < 2) return words;

  const result = [...words];

  for (let i = 0; i < result.length - 1; i++) {
    const current = result[i];
    const next = result[i + 1];

    // If next word starts before current word ends, adjust
    if (next.start < current.end) {
      // Split the difference
      const midpoint = (current.end + next.start) / 2;
      result[i] = { ...current, end: midpoint };
      result[i + 1] = { ...next, start: midpoint };
    }
  }

  return result;
}

/**
 * Extend words with very short durations
 */
function extendShortDurations(words: WordTimestamp[], minDurationMs: number): WordTimestamp[] {
  const minDuration = minDurationMs / 1000;

  return words.map((word, i) => {
    const duration = word.end - word.start;

    if (duration < minDuration) {
      // Extend end time, but don't overlap with next word
      const maxEnd =
        i < words.length - 1 ? words[i + 1].start : word.end + (minDuration - duration);

      return {
        ...word,
        end: Math.min(word.start + minDuration, maxEnd),
      };
    }

    return word;
  });
}

/**
 * Check if two fragments likely form a split word
 * Uses heuristics since we can't have a full dictionary
 */
function isLikelySplitWord(prefix: string, suffix: string): boolean {
  const combined = prefix.toLowerCase() + suffix.toLowerCase();

  // Common words that get split
  const knownWords = new Set([
    'struggling',
    'strong',
    'street',
    'strategic',
    'hydrate',
    'hydrogen',
    'hydration',
    'product',
    'program',
    'process',
    'content',
    'control',
    'consider',
    'together',
    'different',
    'important',
    'something',
    'everything',
    'anything',
    'beautiful',
    'wonderful',
    'powerful',
    'successful',
  ]);

  return knownWords.has(combined);
}

/**
 * Statistics about what was fixed
 */
export interface PostProcessorStats {
  mergedWords: number;
  mergedContractions: number;
  fixedOverlaps: number;
  extendedDurations: number;
  originalCount: number;
  finalCount: number;
}

/**
 * Post-process with statistics
 */
export function postProcessASRWordsWithStats(
  words: WordTimestamp[],
  options: PostProcessorOptions = {}
): { words: WordTimestamp[]; stats: PostProcessorStats } {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const stats: PostProcessorStats = {
    mergedWords: 0,
    mergedContractions: 0,
    fixedOverlaps: 0,
    extendedDurations: 0,
    originalCount: words.length,
    finalCount: 0,
  };

  let result = [...words];
  let prevCount = result.length;

  // Step 1: Merge split words
  if (opts.mergeWords) {
    result = mergeSplitWords(result);
    stats.mergedWords = prevCount - result.length;
    prevCount = result.length;
  }

  // Step 2: Merge split contractions
  if (opts.mergeContractions) {
    result = mergeSplitContractions(result);
    stats.mergedContractions = prevCount - result.length;
    prevCount = result.length;
  }

  // Step 3: Fix overlapping timestamps
  if (opts.fixOverlaps) {
    let overlapCount = 0;
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i + 1].start < result[i].end) {
        overlapCount++;
      }
    }
    result = fixOverlappingTimestamps(result);
    stats.fixedOverlaps = overlapCount;
  }

  // Step 4: Extend very short durations
  if (opts.minDurationMs > 0) {
    let extendCount = 0;
    const minDuration = opts.minDurationMs / 1000;
    for (const word of result) {
      if (word.end - word.start < minDuration) {
        extendCount++;
      }
    }
    result = extendShortDurations(result, opts.minDurationMs);
    stats.extendedDurations = extendCount;
  }

  stats.finalCount = result.length;

  return { words: result, stats };
}
