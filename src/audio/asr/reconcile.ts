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

import { similarity as similarityCore } from '../../core/text/similarity';

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
  /**
   * Maximum number of script words ahead to consider for a "best match".
   * Keeps reconciliation mostly in-order (prevents jumping far forward and scrambling captions).
   * Default: 12
   */
  maxScriptLookahead?: number;
}

/**
 * Script word with normalized form for matching
 */
interface ScriptWord {
  original: string; // Full word with punctuation
  normalized: string; // Normalized for matching
  index: number;
}

interface LcsPair {
  scriptIndex: number;
  asrIndex: number;
}

/**
 * Calculate similarity between two strings (0-1)
 */
export function similarity(s1: string, s2: string): number {
  return similarityCore(s1, s2);
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
  const phoneticSim = similarityCore(phonetic1, phonetic2);

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
  maxScriptLookahead: number;
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
    scriptWords.slice(scriptIdx, scriptIdx + settings.maxScriptLookahead),
    usedScriptIndices,
    settings.minSimilarity
  );

  if (bestMatch) {
    usedScriptIndices.add(bestMatch.index);
    // Advance scriptIdx to preserve order. If we matched a word ahead of the current script word,
    // skip forward to (match + 1). This prevents repeated "best match" jumps from scrambling output.
    const advance = Math.max(1, bestMatch.index - currentScriptWord.index + 1);
    return {
      output: mapWordToScript(asrWord, bestMatch, settings.preservePunctuation),
      asrAdvance: 1,
      scriptAdvance: advance,
    };
  }

  return { output: { ...asrWord }, asrAdvance: 1, scriptAdvance: 0 };
}

function computeLcsPairs(
  script: ScriptWord[],
  asr: WordWithTiming[]
): { length: number; pairs: LcsPair[] } {
  const s = script.map((w) => w.normalized);
  const a = asr.map((w) => normalize(w.word));
  const n = s.length;
  const m = a.length;
  const cols = m + 1;
  const dp = new Uint16Array((n + 1) * (m + 1));

  for (let i = 1; i <= n; i++) {
    const si = s[i - 1];
    for (let j = 1; j <= m; j++) {
      const idx = i * cols + j;
      if (si === a[j - 1]) {
        dp[idx] = (dp[(i - 1) * cols + (j - 1)] + 1) as number;
      } else {
        const up = dp[(i - 1) * cols + j];
        const left = dp[i * cols + (j - 1)];
        dp[idx] = up > left ? up : left;
      }
    }
  }

  const pairs: LcsPair[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    const si = s[i - 1];
    const aj = a[j - 1];
    if (si === aj) {
      pairs.push({ scriptIndex: i - 1, asrIndex: j - 1 });
      i--;
      j--;
      continue;
    }
    const up = dp[(i - 1) * cols + j];
    const left = dp[i * cols + (j - 1)];
    if (up >= left) i--;
    else j--;
  }

  pairs.reverse();
  return { length: dp[n * cols + m] ?? 0, pairs };
}

function clampTime(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function forceScriptWordsWithTiming(params: {
  asrWords: WordWithTiming[];
  scriptWords: ScriptWord[];
  pairs: LcsPair[];
  preservePunctuation: boolean;
}): WordWithTiming[] {
  const { asrWords, scriptWords, pairs, preservePunctuation } = params;
  if (scriptWords.length === 0) return [];
  if (asrWords.length === 0) {
    // No timing source; return script words with 0..N*0.2s fake timings.
    return scriptWords.map((w, idx) => ({
      word: preservePunctuation ? w.original : w.normalized,
      start: idx * 0.2,
      end: idx * 0.2 + 0.2,
      confidence: 0.5,
    }));
  }

  const audioStart = asrWords[0].start;
  const audioEnd = asrWords[asrWords.length - 1].end;
  const total = Math.max(0.001, audioEnd - audioStart);

  // Build anchors from LCS pairs.
  const anchors = pairs
    .map((p) => ({
      scriptIndex: p.scriptIndex,
      start: asrWords[p.asrIndex].start,
      end: asrWords[p.asrIndex].end,
    }))
    .filter((a) => Number.isFinite(a.start) && Number.isFinite(a.end) && a.end >= a.start)
    .sort((x, y) => x.scriptIndex - y.scriptIndex);

  const out: WordWithTiming[] = new Array(scriptWords.length);

  const writeWindow = (
    fromScript: number,
    toScriptInclusive: number,
    windowStart: number,
    windowEnd: number
  ) => {
    const count = toScriptInclusive - fromScript + 1;
    if (count <= 0) return;
    const start = clampTime(windowStart, audioStart, audioEnd);
    const end = clampTime(windowEnd, audioStart, audioEnd);
    const span = Math.max(0.001, end - start);
    const per = span / count;
    for (let i = 0; i < count; i++) {
      const sIdx = fromScript + i;
      const word = scriptWords[sIdx];
      const wStart = start + per * i;
      const wEnd = start + per * (i + 1);
      out[sIdx] = {
        word: preservePunctuation ? word.original : word.normalized,
        start: wStart,
        end: Math.max(wStart + 0.01, wEnd),
        confidence: 0.6,
      };
    }
  };

  // Prefix before first anchor
  if (anchors.length === 0) {
    writeWindow(0, scriptWords.length - 1, audioStart, audioStart + total);
  } else {
    const first = anchors[0];
    if (first.scriptIndex > 0) {
      writeWindow(0, first.scriptIndex - 1, audioStart, first.start);
    }

    // Place anchored words and interpolate gaps between anchors.
    for (let ai = 0; ai < anchors.length; ai++) {
      const a = anchors[ai];
      const word = scriptWords[a.scriptIndex];
      out[a.scriptIndex] = {
        word: preservePunctuation ? word.original : word.normalized,
        start: clampTime(a.start, audioStart, audioEnd),
        end: clampTime(Math.max(a.start + 0.01, a.end), audioStart, audioEnd),
        confidence: asrWords[0].confidence ?? 0.8,
      };

      const next = anchors[ai + 1];
      if (next) {
        const gapFrom = a.scriptIndex + 1;
        const gapTo = next.scriptIndex - 1;
        if (gapTo >= gapFrom) {
          writeWindow(gapFrom, gapTo, a.end, next.start);
        }
      }
    }

    // Suffix after last anchor
    const last = anchors[anchors.length - 1];
    if (last.scriptIndex < scriptWords.length - 1) {
      writeWindow(last.scriptIndex + 1, scriptWords.length - 1, last.end, audioEnd);
    }
  }

  // Final pass: ensure monotonic non-decreasing timings and fill any undefined slots.
  let prevEnd = audioStart;
  for (let i = 0; i < out.length; i++) {
    if (!out[i]) {
      const word = scriptWords[i];
      out[i] = {
        word: preservePunctuation ? word.original : word.normalized,
        start: prevEnd,
        end: prevEnd + 0.02,
        confidence: 0.5,
      };
    }
    if (out[i].start < prevEnd) out[i].start = prevEnd;
    if (out[i].end <= out[i].start) out[i].end = out[i].start + 0.01;
    prevEnd = out[i].end;
  }

  return out;
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
    maxScriptLookahead: options.maxScriptLookahead ?? 12,
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

  // If the ASR mostly matches the script but is missing words (common with fast TTS),
  // force a word-for-word script stream by interpolating timings between matched anchors.
  // This makes captions match the script even if Whisper dropped some tokens.
  //
  // Guard rails:
  // - only for non-trivial scripts (>= 20 tokens)
  // - only when ASR length is close to script length (>= 70% of script tokens)
  // - only when LCS ratio is below "good" threshold
  const { length: lcsLen, pairs } = computeLcsPairs(scriptWords, asrWords);
  const scriptTokenCount = scriptWords.length;
  const asrTokenCount = asrWords.length;
  const lcsRatio = lcsLen / Math.max(1, Math.max(scriptTokenCount, asrTokenCount));
  if (
    scriptTokenCount >= 20 &&
    asrTokenCount >= Math.round(scriptTokenCount * 0.7) &&
    lcsRatio < 0.92
  ) {
    return forceScriptWordsWithTiming({
      asrWords,
      scriptWords,
      pairs,
      preservePunctuation: settings.preservePunctuation,
    });
  }

  return result;
}
