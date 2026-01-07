/**
 * Reconcile-to-Script Module
 *
 * Maps ASR-transcribed words back to original script text, preserving
 * ASR timing while using script text. Handles common ASR issues:
 * - Number transcription ("10x" → "tenex")
 * - Compound word splitting ("WebSocket" → "web socket")
 * - Contractions ("don't" → "dont")
 *
 * @module audio/asr/reconcile
 */

/**
 * Word with timing information
 */
export interface WordWithTiming {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

/**
 * Options for reconciliation
 */
export interface ReconcileOptions {
  /** Minimum similarity threshold (0-1). Default: 0.6 */
  minSimilarity?: number;
  /** Preserve punctuation from script. Default: true */
  preservePunctuation?: boolean;
  /** Maximum lookahead for compound word matching. Default: 3 */
  maxLookahead?: number;
}

/**
 * Script word with normalized form for matching
 */
interface ScriptWord {
  original: string; // Full word with punctuation
  normalized: string; // Normalized for matching
  index: number;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity between two strings (0-1)
 */
export function similarity(s1: string, s2: string): number {
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1;
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Normalize a word for comparison (lowercase, remove punctuation)
 */
function normalize(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Create phonetic representation for better matching
 * Handles number→word conversions like "10x" → "tenx"
 */
function phoneticNormalize(word: string): string {
  let result = normalize(word);

  // Common number-to-word mappings
  result = result
    .replace(/10/g, 'ten')
    .replace(/1/g, 'one')
    .replace(/2/g, 'two')
    .replace(/3/g, 'three')
    .replace(/4/g, 'four')
    .replace(/5/g, 'five')
    .replace(/6/g, 'six')
    .replace(/7/g, 'seven')
    .replace(/8/g, 'eight')
    .replace(/9/g, 'nine')
    .replace(/0/g, 'zero');

  return result;
}

/**
 * Calculate similarity with phonetic awareness
 */
function enhancedSimilarity(s1: string, s2: string): number {
  // Try direct similarity first
  const directSim = similarity(s1, s2);
  if (directSim >= 0.8) return directSim;

  // Try phonetic similarity
  const phonetic1 = phoneticNormalize(s1);
  const phonetic2 = phoneticNormalize(s2);
  const phoneticSim = similarity(phonetic1, phonetic2);

  return Math.max(directSim, phoneticSim);
}

/**
 * Extract words from script text with their original form
 */
function extractScriptWords(text: string): ScriptWord[] {
  if (!text.trim()) return [];

  // Split by whitespace but preserve punctuation attached to words
  const words = text.split(/\s+/).filter(Boolean);

  return words.map((word, index) => ({
    original: word,
    normalized: normalize(word),
    index,
  }));
}

/**
 * Check if multiple ASR words combine to match a script word
 * Returns the number of ASR words that match, or 0 if no match
 */
function checkCompoundMatch(
  asrWords: WordWithTiming[],
  startIdx: number,
  scriptWord: ScriptWord,
  maxLookahead: number,
  minSimilarity: number
): number {
  const normalizedScript = scriptWord.normalized;

  // Try combining 2, 3, etc. ASR words
  for (let count = 2; count <= Math.min(maxLookahead, asrWords.length - startIdx); count++) {
    const combined = asrWords
      .slice(startIdx, startIdx + count)
      .map((w) => normalize(w.word))
      .join('');

    const sim = enhancedSimilarity(combined, normalizedScript);
    if (sim >= minSimilarity) {
      return count;
    }
  }

  return 0;
}

/**
 * Find the best matching script word for an ASR word
 */
function findBestMatch(
  asrWord: string,
  scriptWords: ScriptWord[],
  usedIndices: Set<number>,
  minSimilarity: number
): ScriptWord | null {
  const normalizedAsr = normalize(asrWord);

  let bestMatch: ScriptWord | null = null;
  let bestSimilarity = minSimilarity;

  for (const scriptWord of scriptWords) {
    if (usedIndices.has(scriptWord.index)) continue;

    const sim = enhancedSimilarity(normalizedAsr, scriptWord.normalized);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = scriptWord;
    }
  }

  return bestMatch;
}

interface ReconcileSettings {
  minSimilarity: number;
  preservePunctuation: boolean;
  maxLookahead: number;
}

interface ReconcileStepResult {
  output: WordWithTiming;
  asrAdvance: number;
  scriptAdvance: number;
}

function mapWordToScript(
  asrWord: WordWithTiming,
  scriptWord: ScriptWord,
  preservePunctuation: boolean
): WordWithTiming {
  return {
    word: preservePunctuation ? scriptWord.original : scriptWord.normalized,
    start: asrWord.start,
    end: asrWord.end,
    confidence: asrWord.confidence,
  };
}

function mergeWordsToScript(
  mergedWords: WordWithTiming[],
  scriptWord: ScriptWord,
  preservePunctuation: boolean
): WordWithTiming {
  return {
    word: preservePunctuation ? scriptWord.original : scriptWord.normalized,
    start: mergedWords[0].start,
    end: mergedWords[mergedWords.length - 1].end,
    confidence: mergedWords.reduce((sum, w) => sum + (w.confidence ?? 0.9), 0) / mergedWords.length,
  };
}

function reconcileStep(
  asrWords: WordWithTiming[],
  asrIdx: number,
  scriptWords: ScriptWord[],
  scriptIdx: number,
  usedScriptIndices: Set<number>,
  settings: ReconcileSettings
): ReconcileStepResult {
  const asrWord = asrWords[asrIdx];

  if (scriptIdx >= scriptWords.length) {
    return { output: { ...asrWord }, asrAdvance: 1, scriptAdvance: 0 };
  }

  const currentScriptWord = scriptWords[scriptIdx];
  const normalizedAsr = normalize(asrWord.word);
  const sim = enhancedSimilarity(normalizedAsr, currentScriptWord.normalized);

  if (sim >= settings.minSimilarity) {
    usedScriptIndices.add(currentScriptWord.index);
    return {
      output: mapWordToScript(asrWord, currentScriptWord, settings.preservePunctuation),
      asrAdvance: 1,
      scriptAdvance: 1,
    };
  }

  const compoundCount = checkCompoundMatch(
    asrWords,
    asrIdx,
    currentScriptWord,
    settings.maxLookahead,
    settings.minSimilarity
  );

  if (compoundCount > 0) {
    const mergedWords = asrWords.slice(asrIdx, asrIdx + compoundCount);
    usedScriptIndices.add(currentScriptWord.index);
    return {
      output: mergeWordsToScript(mergedWords, currentScriptWord, settings.preservePunctuation),
      asrAdvance: compoundCount,
      scriptAdvance: 1,
    };
  }

  const bestMatch = findBestMatch(
    asrWord.word,
    scriptWords.slice(scriptIdx),
    usedScriptIndices,
    settings.minSimilarity
  );

  if (bestMatch) {
    usedScriptIndices.add(bestMatch.index);
    return {
      output: mapWordToScript(asrWord, bestMatch, settings.preservePunctuation),
      asrAdvance: 1,
      scriptAdvance: 0,
    };
  }

  return { output: { ...asrWord }, asrAdvance: 1, scriptAdvance: 0 };
}

/**
 * Reconciles ASR-transcribed words to original script text.
 *
 * Preserves ASR timing while mapping words back to script text.
 * Handles common ASR issues like:
 * - Number transcription ("10x" → "tenex")
 * - Compound word splitting ("WebSocket" → "web socket")
 * - Contractions ("don't" → "dont")
 *
 * @example
 * ```typescript
 * const asrWords = [{ word: 'tenex', start: 0.5, end: 0.8 }];
 * const result = reconcileToScript(asrWords, '10x faster');
 * // result[0].word === '10x'
 * // result[0].start === 0.5 (timing preserved)
 * ```
 */
export function reconcileToScript(
  asrWords: WordWithTiming[],
  scriptText: string,
  options: ReconcileOptions = {}
): WordWithTiming[] {
  // Edge cases
  if (asrWords.length === 0) return [];

  const scriptWords = extractScriptWords(scriptText);
  if (scriptWords.length === 0) return asrWords.map((w) => ({ ...w }));

  const settings: ReconcileSettings = {
    minSimilarity: options.minSimilarity ?? 0.6,
    preservePunctuation: options.preservePunctuation ?? true,
    maxLookahead: options.maxLookahead ?? 3,
  };

  const result: WordWithTiming[] = [];
  const usedScriptIndices = new Set<number>();
  let asrIdx = 0;
  let scriptIdx = 0;

  while (asrIdx < asrWords.length) {
    const step = reconcileStep(
      asrWords,
      asrIdx,
      scriptWords,
      scriptIdx,
      usedScriptIndices,
      settings
    );
    result.push(step.output);
    asrIdx += step.asrAdvance;
    scriptIdx += step.scriptAdvance;
  }

  return result;
}
