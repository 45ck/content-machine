/**
 * TikTok-Native Caption Chunking
 *
 * Readability-driven word grouping that feels native to TikTok/CapCut.
 * Key principles:
 * - 2-5 words per chunk (not 8 like traditional captions)
 * - CPS (characters-per-second) cap for reading speed
 * - Minimum on-screen time to prevent flashing
 * - Emphasis detection for power words, numbers, negations
 * - Natural break points: punctuation, pauses, phrase boundaries
 */

import { CaptionLayout, EmphasisType } from './config';

/**
 * Word with timing and emphasis information
 */
export interface ChunkedWord {
  /** The word text */
  text: string;
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
  /** Whether this word is emphasized */
  isEmphasized: boolean;
  /** Type of emphasis (if any) */
  emphasisType?: EmphasisType;
}

/**
 * A chunk of words displayed together
 */
export interface CaptionChunk {
  /** Words in this chunk */
  words: ChunkedWord[];
  /** Combined text */
  text: string;
  /** Start time (first word) */
  startMs: number;
  /** End time (last word) */
  endMs: number;
  /** Total character count (for CPS calculation) */
  charCount: number;
  /** Chunk index (0-based) */
  index: number;
  /** Has emphasized word */
  hasEmphasis: boolean;
}

/**
 * Configuration for chunking
 */
export interface ChunkingConfig {
  /** Maximum words per chunk (default: 5) */
  maxWordsPerChunk: number;
  /** Minimum words per chunk (default: 2) */
  minWordsPerChunk: number;
  /** Maximum characters per second (default: 15) */
  maxCharsPerSecond: number;
  /** Minimum on-screen time in ms (default: 350) */
  minOnScreenMs: number;
  /** Gap in ms that forces a new chunk (default: 500) */
  pauseGapMs: number;
  /** Types of emphasis to detect */
  emphasisTypes: EmphasisType[];
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  maxWordsPerChunk: 5,
  minWordsPerChunk: 2,
  maxCharsPerSecond: 15,
  minOnScreenMs: 350,
  pauseGapMs: 500,
  emphasisTypes: ['number', 'power', 'negation', 'pause'],
};

// Power words that get emphasized
const POWER_WORDS = new Set([
  // Superlatives
  'best',
  'worst',
  'most',
  'least',
  'biggest',
  'smallest',
  'fastest',
  'slowest',
  // Absolutes
  'never',
  'always',
  'everything',
  'nothing',
  'everyone',
  'nobody',
  // Emphasis
  'actually',
  'literally',
  'absolutely',
  'definitely',
  'exactly',
  'completely',
  // Drama
  'insane',
  'crazy',
  'amazing',
  'incredible',
  'unbelievable',
  'shocking',
  'secret',
  'hidden',
  'truth',
  'lie',
  'wrong',
  'right',
  'real',
  'fake',
  // Tech/business
  'free',
  'money',
  'million',
  'billion',
  'percent',
  // Negations (stronger emphasis)
  "don't",
  "can't",
  "won't",
  "shouldn't",
  "couldn't",
  "wouldn't",
  'not',
  'no',
  'never',
  'none',
]);

// Patterns for number detection
const NUMBER_PATTERN = /^[$€£¥]?\d+[%kKmMbB]?$|^\d+[,.]\d+[%]?$|^#\d+$/;

/**
 * Detect if a word should be emphasized and what type
 */
export function detectEmphasis(
  word: string,
  isBeforePause: boolean,
  isBeforePunctuation: boolean,
  enabledTypes: EmphasisType[]
): { isEmphasized: boolean; type?: EmphasisType } {
  // Normalize: lowercase and strip punctuation (except apostrophes in contractions)
  const normalized = word.toLowerCase().replace(/[.,!?;:"]/g, '');

  // Check for numbers: $50, 100%, 5K, etc.
  if (enabledTypes.includes('number') && NUMBER_PATTERN.test(word)) {
    return { isEmphasized: true, type: 'number' };
  }

  // Check for negations (highest priority power word)
  if (enabledTypes.includes('negation')) {
    // Normalize apostrophes (both straight and curly)
    const normalizedApostrophe = normalized.replace(/['']/g, "'");
    const isNegation = [
      "don't",
      "can't",
      "won't",
      "shouldn't",
      "couldn't",
      "wouldn't",
      'not',
      'no',
      'never',
      'none',
    ].includes(normalizedApostrophe);
    if (isNegation) {
      return { isEmphasized: true, type: 'negation' };
    }
  }

  // Check for power words
  if (enabledTypes.includes('power') && POWER_WORDS.has(normalized)) {
    return { isEmphasized: true, type: 'power' };
  }

  // Check for significant punctuation
  if (enabledTypes.includes('punctuation') && isBeforePunctuation) {
    return { isEmphasized: true, type: 'punctuation' };
  }

  // Check for pause (last word before gap)
  if (enabledTypes.includes('pause') && isBeforePause) {
    return { isEmphasized: true, type: 'pause' };
  }

  return { isEmphasized: false };
}

/**
 * Check if word ends with sentence punctuation
 */
function endsWithSentencePunctuation(word: string): boolean {
  const trimmed = word.trim();
  return /[.!?]$/.test(trimmed) && !/\.\.\.$/.test(trimmed);
}

/**
 * Check if word ends with strong punctuation (! or ?)
 */
function endsWithStrongPunctuation(word: string): boolean {
  const trimmed = word.trim();
  return /[!?]$/.test(trimmed);
}

/**
 * Context for break decision logic
 */
interface BreakContext {
  wordIndex: number;
  totalWords: number;
  currentWordsCount: number;
  cfg: ChunkingConfig;
  wouldCPS: number;
  prevChunkWord?: ChunkedWord;
  gapFromPrevWord: number;
}

/**
 * Determine if we should break before adding the current word
 */
function shouldBreakChunk(ctx: BreakContext): { shouldBreak: boolean; reason: string } {
  // 1. Max words reached
  if (ctx.currentWordsCount >= ctx.cfg.maxWordsPerChunk) {
    return { shouldBreak: true, reason: 'max-words' };
  }

  // 2. Pause gap (natural break)
  if (ctx.currentWordsCount > 0 && ctx.gapFromPrevWord >= ctx.cfg.pauseGapMs) {
    return { shouldBreak: true, reason: 'pause-gap' };
  }

  // 3. CPS would exceed limit (but respect min words)
  if (
    ctx.currentWordsCount >= ctx.cfg.minWordsPerChunk &&
    ctx.wouldCPS > ctx.cfg.maxCharsPerSecond
  ) {
    return { shouldBreak: true, reason: 'cps-limit' };
  }

  // 4. Sentence boundary (but respect min words)
  if (ctx.currentWordsCount >= ctx.cfg.minWordsPerChunk && ctx.prevChunkWord) {
    if (endsWithSentencePunctuation(ctx.prevChunkWord.text)) {
      return { shouldBreak: true, reason: 'sentence-end' };
    }
  }

  return { shouldBreak: false, reason: '' };
}

/**
 * Check for orphan prevention (don't leave a single word at the end)
 */
function shouldPreventOrphan(
  breakDecision: { shouldBreak: boolean; reason: string },
  wordIndex: number,
  totalWords: number,
  currentWordsCount: number,
  maxWordsPerChunk: number
): boolean {
  if (!breakDecision.shouldBreak || breakDecision.reason === 'max-words') {
    return false;
  }
  const remainingWords = totalWords - wordIndex - 1;
  return remainingWords === 0 && currentWordsCount < maxWordsPerChunk;
}

/**
 * Create a ChunkedWord from raw word data
 */
function createChunkedWord(
  word: { word: string; startMs: number; endMs: number },
  nextWord: { startMs: number } | undefined,
  cfg: ChunkingConfig
): ChunkedWord {
  const gapToNext = nextWord ? nextWord.startMs - word.endMs : 0;
  const isBeforePause = gapToNext >= cfg.pauseGapMs;
  const isBeforePunctuation = endsWithStrongPunctuation(word.word);

  const emphasis = detectEmphasis(word.word, isBeforePause, isBeforePunctuation, cfg.emphasisTypes);

  return {
    text: word.word,
    startMs: word.startMs,
    endMs: word.endMs,
    isEmphasized: emphasis.isEmphasized,
    emphasisType: emphasis.type,
  };
}

/**
 * Finalize a chunk from accumulated words
 */
function finalizeChunk(
  currentWords: ChunkedWord[],
  currentCharCount: number,
  chunkIndex: number
): CaptionChunk | null {
  if (currentWords.length === 0) return null;

  return {
    words: currentWords,
    text: currentWords.map((w) => w.text).join(' '),
    startMs: currentWords[0].startMs,
    endMs: currentWords[currentWords.length - 1].endMs,
    charCount: currentCharCount,
    index: chunkIndex,
    hasEmphasis: currentWords.some((w) => w.isEmphasized),
  };
}

interface ChunkingState {
  chunks: CaptionChunk[];
  currentWords: ChunkedWord[];
  currentCharCount: number;
}

function processTimedWord(params: {
  state: ChunkingState;
  word: { word: string; startMs: number; endMs: number };
  prevWord?: { word: string; startMs: number; endMs: number };
  nextWord?: { word: string; startMs: number; endMs: number };
  wordIndex: number;
  totalWords: number;
  cfg: ChunkingConfig;
}): void {
  const { state, word, prevWord, nextWord, wordIndex, totalWords, cfg } = params;
  const wordLength = word.word.trim().length;

  const chunkedWord = createChunkedWord(word, nextWord, cfg);
  const newCharCount = state.currentCharCount + (state.currentWords.length > 0 ? 1 : 0) + wordLength;
  const chunkDurationMs =
    state.currentWords.length > 0
      ? word.endMs - state.currentWords[0].startMs
      : word.endMs - word.startMs;
  const wouldCps = (newCharCount / Math.max(chunkDurationMs, 1)) * 1000;

  const gapFromPrevWord = prevWord ? word.startMs - prevWord.endMs : 0;
  const breakDecision = shouldBreakChunk({
    wordIndex,
    totalWords,
    currentWordsCount: state.currentWords.length,
    cfg,
    wouldCPS: wouldCps,
    prevChunkWord: state.currentWords[state.currentWords.length - 1],
    gapFromPrevWord,
  });

  const preventOrphan = shouldPreventOrphan(
    breakDecision,
    wordIndex,
    totalWords,
    state.currentWords.length,
    cfg.maxWordsPerChunk
  );

  if (breakDecision.shouldBreak && !preventOrphan) {
    const chunk = finalizeChunk(state.currentWords, state.currentCharCount, state.chunks.length);
    if (chunk) state.chunks.push(chunk);
    state.currentWords = [];
    state.currentCharCount = 0;
  }

  state.currentWords.push(chunkedWord);
  state.currentCharCount = state.currentWords.length > 1 ? newCharCount : wordLength;
}

/**
 * Create caption chunks from timed words
 *
 * This is the main chunking algorithm that creates TikTok-native captions:
 * - Small groups (2-5 words) for quick reading
 * - Respects CPS limits for readability
 * - Breaks at natural phrase boundaries
 * - Detects emphasis for styling
 */
export function createCaptionChunks(
  words: Array<{ word: string; startMs: number; endMs: number }>,
  config: Partial<ChunkingConfig> = {}
): CaptionChunk[] {
  const cfg = { ...DEFAULT_CHUNKING_CONFIG, ...config };
  if (words.length === 0) return [];

  const state: ChunkingState = { chunks: [], currentWords: [], currentCharCount: 0 };

  for (let i = 0; i < words.length; i++) {
    processTimedWord({
      state,
      word: words[i],
      prevWord: i > 0 ? words[i - 1] : undefined,
      nextWord: words[i + 1],
      wordIndex: i,
      totalWords: words.length,
      cfg,
    });
  }

  // Finalize last chunk
  const lastChunk = finalizeChunk(state.currentWords, state.currentCharCount, state.chunks.length);
  if (lastChunk) state.chunks.push(lastChunk);

  return enforceMinOnScreenTime(state.chunks, cfg.minOnScreenMs);
}

/**
 * Ensure chunks have minimum on-screen time
 * Extends end time if chunk is too short
 */
function enforceMinOnScreenTime(chunks: CaptionChunk[], minMs: number): CaptionChunk[] {
  return chunks.map((chunk, i) => {
    const duration = chunk.endMs - chunk.startMs;
    if (duration < minMs) {
      const nextChunk = chunks[i + 1];
      const maxEndMs = nextChunk ? nextChunk.startMs - 50 : chunk.endMs + (minMs - duration);
      return {
        ...chunk,
        endMs: Math.min(chunk.startMs + minMs, maxEndMs),
      };
    }
    return chunk;
  });
}

/**
 * Convert layout config to chunking config
 */
export function layoutToChunkingConfig(layout: Partial<CaptionLayout>): Partial<ChunkingConfig> {
  return {
    maxWordsPerChunk: layout.maxWordsPerPage ?? 5,
    minWordsPerChunk: layout.minWordsPerPage ?? 2,
    maxCharsPerSecond: layout.maxCharsPerSecond ?? 15,
    minOnScreenMs: layout.minOnScreenMs ?? 350,
    pauseGapMs: layout.maxGapMs ?? 500,
  };
}

/**
 * Convert chunk to CaptionPage format for backward compatibility
 */
export function chunkToPage(chunk: CaptionChunk): {
  lines: Array<{
    words: Array<{ text: string; startMs: number; endMs: number }>;
    text: string;
    startMs: number;
    endMs: number;
  }>;
  words: Array<{ text: string; startMs: number; endMs: number }>;
  text: string;
  startMs: number;
  endMs: number;
  index: number;
} {
  const words = chunk.words.map((w) => ({
    text: w.text,
    startMs: w.startMs,
    endMs: w.endMs,
  }));

  return {
    lines: [
      {
        words,
        text: chunk.text,
        startMs: chunk.startMs,
        endMs: chunk.endMs,
      },
    ],
    words,
    text: chunk.text,
    startMs: chunk.startMs,
    endMs: chunk.endMs,
    index: chunk.index,
  };
}
