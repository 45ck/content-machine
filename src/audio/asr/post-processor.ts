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
  // Interjections
  ['U', [['gh', 'Ugh']]],
  ['u', [['gh', 'ugh']]],
  ['A', [['h', 'Ah'], ['w', 'Aw']]],
  ['a', [['h', 'ah'], ['w', 'aw']]],
  ['O', [['h', 'Oh'], ['k', 'Ok'], ['kay', 'Okay']]],
  ['o', [['h', 'oh'], ['k', 'ok'], ['kay', 'okay']]],
  // Str- words
  [
    'Str',
    [
      ['uggling', 'Struggling'],
      ['ong', 'Strong'],
      ['eet', 'Street'],
      ['ategic', 'Strategic'],
      ['ess', 'Stress'],
    ],
  ],
  [
    'str',
    [
      ['uggling', 'struggling'],
      ['ong', 'strong'],
      ['eet', 'street'],
      ['ategic', 'strategic'],
      ['ess', 'stress'],
    ],
  ],
  // Hyd- words
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
  // Pro- words
  [
    'pro',
    [
      ['duct', 'product'],
      ['gram', 'program'],
      ['cess', 'process'],
      ['ductivity', 'productivity'],
    ],
  ],
  [
    'Pro',
    [
      ['duct', 'Product'],
      ['gram', 'Program'],
      ['cess', 'Process'],
      ['ductivity', 'Productivity'],
    ],
  ],
  // Con- words
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
  // At + risk pattern (common TTS artifact)
  ['at', [['risk', 'at risk']]],
  ['At', [['risk', 'At risk']]],
  // Optimal split: Opt + imal
  ['Opt', [['imal', 'Optimal']]],
  ['opt', [['imal', 'optimal']]],
  // Melatonin split: mel + aton + in
  ['mel', [['atonin', 'melatonin']]],
  ['Mel', [['atonin', 'Melatonin']]],
  // Common -ing splits
  ['Mess', [['es', 'Messes']]],
  ['mess', [['es', 'messes']]],
  // Ch- words (common splits)
  ['ch', [['ug', 'chug']]],
  ['Ch', [['ug', 'Chug']]],
  // R- words (common splits)
  ['r', [['isk', 'risk']]],
  ['R', [['isk', 'Risk']]],
  // At + risk (should stay as two words, but with proper timing)
  // Already handled above
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

  // Step 1: Merge split words FIRST (before filtering)
  // This allows patterns like r+isk→risk to match
  if (opts.mergeWords) {
    result = mergeSplitWords(result);
  }

  // Step 2: Merge split contractions
  if (opts.mergeContractions) {
    result = mergeSplitContractions(result);
  }

  // Step 3: Merge repeated single characters (like "z" "z" "z" → "zzz")
  result = mergeRepeatedCharacters(result);

  // Step 4: Filter ASR artifacts AFTER merging (so patterns have a chance)
  result = filterASRArtifacts(result);

  // Step 5: Fix overlapping timestamps
  if (opts.fixOverlaps) {
    result = fixOverlappingTimestamps(result);
  }

  // Step 6: Extend very short durations
  if (opts.minDurationMs > 0) {
    result = extendShortDurations(result, opts.minDurationMs);
  }

  return result;
}

/**
 * Valid single-letter words in English
 */
const VALID_SINGLE_LETTERS = new Set(['a', 'A', 'i', 'I', 'o', 'O']);

/**
 * Filter out ASR artifacts - single letters that aren't valid words
 */
function filterASRArtifacts(words: WordTimestamp[]): WordTimestamp[] {
  return words.filter((word) => {
    const text = word.word.trim();
    
    // Keep valid single letters
    if (text.length === 1 && /^[a-zA-Z]$/.test(text)) {
      return VALID_SINGLE_LETTERS.has(text);
    }
    
    // Keep two-letter words only if they're valid
    if (text.length === 2 && /^[a-zA-Z]+$/.test(text)) {
      const validTwoLetter = new Set([
        'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'if', 'in', 
        'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 
        'up', 'us', 'we', 'am', 'ok', 'oh', 'ah', 'aw', 'uh'
      ]);
      return validTwoLetter.has(text.toLowerCase());
    }
    
    // Keep everything else
    return true;
  });
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
          // Merge the words - use AVERAGE confidence for known patterns
          // (pattern match implies high certainty, so boost confidence)
          const avgConfidence = ((current.confidence ?? 1) + (next.confidence ?? 1)) / 2;
          result.push({
            word: match[1], // Complete word with proper casing
            start: current.start,
            end: next.end,
            confidence: Math.max(avgConfidence, 0.8), // Boost to at least 80% for known patterns
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
 * Merge repeated single characters like "z" "z" "z" → "zzz"
 * Common in onomatopoeia like sleeping sounds, hesitations, etc.
 */
function mergeRepeatedCharacters(words: WordTimestamp[]): WordTimestamp[] {
  if (words.length < 2) return words;

  const result: WordTimestamp[] = [];
  let i = 0;

  while (i < words.length) {
    const current = words[i];

    // Check if this is a single character that repeats
    if (current.word.length === 1 && /^[a-zA-Z]$/.test(current.word)) {
      let j = i + 1;
      let merged = current.word;
      let endTime = current.end;
      let minConfidence = current.confidence ?? 1;

      // Collect consecutive same characters
      while (j < words.length && words[j].word.toLowerCase() === current.word.toLowerCase()) {
        merged += words[j].word;
        endTime = words[j].end;
        minConfidence = Math.min(minConfidence, words[j].confidence ?? 1);
        j++;
      }

      // Only merge if we found multiple (3+ makes it worth it)
      if (j - i >= 2) {
        result.push({
          word: merged,
          start: current.start,
          end: endTime,
          confidence: minConfidence,
        });
        i = j; // Skip all merged characters
      } else {
        result.push(current);
        i++;
      }
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

/**
 * Restore punctuation to ASR words by aligning with original script
 *
 * Whisper often strips punctuation. This function aligns ASR words with
 * the original script text to restore punctuation marks.
 *
 * @param words - ASR word timestamps (without punctuation)
 * @param scriptText - Original script text with punctuation
 * @returns Words with punctuation restored
 */
export function restorePunctuation(
  words: WordTimestamp[],
  scriptText: string
): WordTimestamp[] {
  if (!scriptText || words.length === 0) return words;

  // Tokenize script into words, preserving punctuation attached to words
  const scriptWords = scriptText.split(/\s+/).filter(Boolean);

  // Create a normalized lookup map: lowercase word -> original word with punctuation
  const punctuationMap = new Map<string, string>();

  for (const scriptWord of scriptWords) {
    // Extract the base word (remove leading/trailing punctuation for matching)
    const baseWord = scriptWord.replace(/^[^\w]*/, '').replace(/[^\w]*$/, '').toLowerCase();

    // Store the original word with punctuation
    if (baseWord && !punctuationMap.has(baseWord)) {
      punctuationMap.set(baseWord, scriptWord);
    }
  }

  // Apply punctuation to ASR words
  return words.map((word) => {
    const baseWord = word.word.toLowerCase().replace(/[^\w']/g, '');
    const punctuatedWord = punctuationMap.get(baseWord);

    if (punctuatedWord) {
      // Extract trailing punctuation from script word
      const trailingPunct = punctuatedWord.match(/[.!?,;:]+$/)?.[0] || '';

      // If the script word has trailing punctuation, add it to the ASR word
      if (trailingPunct && !word.word.match(/[.!?,;:]+$/)) {
        return {
          ...word,
          word: word.word + trailingPunct,
        };
      }
    }

    return word;
  });
}

/**
 * Extract text from scenes for punctuation restoration
 */
export function extractSceneText(scenes: Array<{ text: string }>): string {
  return scenes.map((s) => s.text).join(' ');
}
