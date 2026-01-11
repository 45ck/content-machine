/**
 * Caption Paging Utilities
 *
 * Groups words into pages based on character limits, line counts, and timing.
 * Based on gyoridavid/short-video-maker createCaptionPages pattern.
 *
 * This is the KEY to TikTok-style captions: showing only a few words at a time.
 *
 * IMPORTANT: This module NEVER breaks words mid-word. Full words only.
 * Contractions (don't, it's) and hyphenated words are kept together.
 */
import { CaptionLayout, type CaptionCleanup } from './config';

/**
 * Pattern for TTS internal markers that should be filtered out.
 * - [_TT_###] - kokoro TTS phoneme/timing markers
 * - [_BEG_], [_END_] - Whisper special tokens
 * - Other potential TTS artifacts
 */
const TTS_MARKER_PATTERN = /^\[_?[A-Z]+_?\d*\]$/;

const DEFAULT_FILLER_WORDS = [
  'um',
  'uh',
  'erm',
  'hmm',
  'mm',
  'uhh',
  'umm',
  'er',
  'ah',
  'eh',
  'like',
  'basically',
  'actually',
  'literally',
  'just',
];

const DEFAULT_FILLER_PHRASES = [
  ['you', 'know'],
  ['i', 'mean'],
  ['kind', 'of'],
  ['sort', 'of'],
];

function normalizeCaptionToken(word: string): string {
  return word
    .toLowerCase()
    .replace(/[^a-z0-9']/g, '')
    .trim();
}

function buildFillerConfig(cleanup?: CaptionCleanup): {
  wordSet: Set<string>;
  phrases: string[][];
} | null {
  if (!cleanup?.dropFillers) return null;

  const customList = cleanup.fillerWords?.map((entry) => entry.trim()).filter(Boolean) ?? [];
  const words: string[] = [];
  const phrases: string[][] = [];

  if (customList.length > 0) {
    for (const entry of customList) {
      if (!entry) continue;
      if (/\s+/.test(entry)) {
        const tokens = entry
          .split(/\s+/)
          .map((token) => normalizeCaptionToken(token))
          .filter(Boolean);
        if (tokens.length > 0) phrases.push(tokens);
      } else {
        words.push(entry);
      }
    }
  } else {
    words.push(...DEFAULT_FILLER_WORDS);
    phrases.push(...DEFAULT_FILLER_PHRASES);
  }

  return {
    wordSet: new Set(words.map((word) => normalizeCaptionToken(word)).filter(Boolean)),
    phrases: phrases
      .map((phrase) => phrase.map((token) => normalizeCaptionToken(token)).filter(Boolean))
      .filter((phrase) => phrase.length > 0),
  };
}

/**
 * Pattern for ASR artifacts that shouldn't be displayed
 * - Standalone punctuation (e.g., "?" or "." as a separate word)
 * - Single dashes not part of a word
 * - Multiple punctuation marks
 */
const ASR_ARTIFACT_PATTERN = /^[.?!,;:\-–—…'"()]+$/;

/**
 * Check if a word is a TTS internal marker that should be filtered
 */
export function isTtsMarker(word: string): boolean {
  const trimmed = word.trim();
  // Match patterns like [_TT_140], [_BEG_], etc.
  return TTS_MARKER_PATTERN.test(trimmed) || /^\[_TT_\d+\]$/.test(trimmed);
}

/**
 * Check if a word is an ASR artifact (standalone punctuation)
 */
export function isAsrArtifact(word: string): boolean {
  return ASR_ARTIFACT_PATTERN.test(word.trim());
}

/**
 * Check if a word should be displayed in captions
 * Filters out TTS markers, ASR artifacts, and empty words
 */
export function isDisplayableWord(word: string): boolean {
  const trimmed = word.trim();
  if (!trimmed) return false;
  if (isTtsMarker(trimmed)) return false;
  if (isAsrArtifact(trimmed)) return false;
  return true;
}

export function filterCaptionWords<T extends { word: string }>(
  words: T[],
  cleanup?: CaptionCleanup
): T[] {
  const fillerConfig = buildFillerConfig(cleanup);
  const result: T[] = [];

  for (let i = 0; i < words.length; i++) {
    const token = words[i];
    if (!token || typeof token.word !== 'string') continue;
    if (!isDisplayableWord(token.word)) continue;

    if (fillerConfig) {
      let matchedPhrase = false;
      for (const phrase of fillerConfig.phrases) {
        if (phrase.length === 0 || i + phrase.length > words.length) continue;

        let matches = true;
        for (let j = 0; j < phrase.length; j++) {
          const nextToken = words[i + j];
          if (!nextToken || typeof nextToken.word !== 'string') {
            matches = false;
            break;
          }
          if (!isDisplayableWord(nextToken.word)) {
            matches = false;
            break;
          }
          const normalized = normalizeCaptionToken(nextToken.word);
          if (normalized !== phrase[j]) {
            matches = false;
            break;
          }
        }

        if (matches) {
          matchedPhrase = true;
          i += phrase.length - 1;
          break;
        }
      }

      if (matchedPhrase) continue;

      const normalized = normalizeCaptionToken(token.word);
      if (normalized && fillerConfig.wordSet.has(normalized)) continue;
    }

    result.push(token);
  }

  return result;
}

/**
 * Sanitize a list of timed words, removing TTS markers and ASR artifacts.
 * This should be called before paging to ensure clean caption output.
 */
export function sanitizeTimedWords(words: TimedWord[]): TimedWord[] {
  return words.filter((w) => isDisplayableWord(w.text));
}

/**
 * Sanitize words with confidence-based filtering.
 * Use this when you have access to confidence scores.
 * @param minConfidence Minimum confidence threshold (default: 0.1)
 */
export function sanitizeTimedWordsWithConfidence(
  words: Array<TimedWord & { confidence?: number }>,
  minConfidence = 0.1
): TimedWord[] {
  return words.filter((w) => {
    if (!isDisplayableWord(w.text)) return false;
    // If confidence is available and below threshold, filter out
    if (w.confidence !== undefined && w.confidence < minConfidence) return false;
    return true;
  });
}

/**
 * Word with timing information
 */
export interface TimedWord {
  text: string;
  startMs: number;
  endMs: number;
}

/**
 * A line of words within a caption page
 */
export interface CaptionLine {
  words: TimedWord[];
  /** Combined text of all words in line */
  text: string;
  /** Start time of first word */
  startMs: number;
  /** End time of last word */
  endMs: number;
}

/**
 * A caption page - displayed as a unit, then replaced
 */
export interface CaptionPage {
  /** All lines in this page */
  lines: CaptionLine[];
  /** All words flattened (for easy iteration) */
  words: TimedWord[];
  /** Combined text of entire page */
  text: string;
  /** Start time of first word */
  startMs: number;
  /** End time of last word */
  endMs: number;
  /** Page index (0-based) */
  index: number;
}

/**
 * Default layout configuration
 */
const DEFAULT_LAYOUT: CaptionLayout = {
  maxCharsPerLine: 25,
  maxLinesPerPage: 2,
  maxGapMs: 1000,
  minWordsPerPage: 1,
  targetWordsPerChunk: 5,
  maxWordsPerPage: 8,
  maxWordsPerMinute: 180,
  maxCharsPerSecond: 15,
  minOnScreenMsShort: 800,
  minOnScreenMs: 1100,
  shortChunkMaxWords: 2,
  chunkGapMs: 50,
};

/**
 * Check if a word ends with sentence-ending punctuation
 * This triggers a new caption page after the sentence
 */
function endsWithSentencePunctuation(word: string): boolean {
  const trimmed = word.trim();
  // Check for sentence-ending punctuation: . ! ?
  // But not abbreviations like "U.S." or ellipsis "..."
  return /[.!?]$/.test(trimmed) && !/\.\.\.$/.test(trimmed);
}

/**
 * Calculate the character count for a line of words
 * Includes spaces between words
 */
function calculateLineCharCount(words: TimedWord[]): number {
  if (words.length === 0) return 0;
  // Sum of all word lengths + spaces between words
  return words.reduce((sum, w) => sum + w.text.trim().length, 0) + (words.length - 1);
}

/**
 * Check if adding a word would exceed the line character limit
 * NEVER breaks words mid-word - returns false if word would fit, true if it wouldn't
 */
function wouldExceedLineLimit(
  currentLineWords: TimedWord[],
  newWord: TimedWord,
  maxChars: number
): boolean {
  const currentCount = calculateLineCharCount(currentLineWords);
  const wordLength = newWord.text.trim().length;
  const spaceNeeded = currentLineWords.length > 0 ? 1 : 0;
  const totalAfterAdd = currentCount + spaceNeeded + wordLength;

  // If line is empty, always allow the word (even if it exceeds limit)
  // This prevents infinite loops on very long words
  if (currentLineWords.length === 0) {
    return false;
  }

  return totalAfterAdd > maxChars;
}

/**
 * Create caption pages from timed words
 *
 * This groups words into pages based on:
 * 1. Character limit per line (NEVER breaks words mid-word)
 * 2. Maximum lines per page
 * 3. Time gaps between words
 * 4. Word count limits
 *
 * @param words - Array of words with timing
 * @param layout - Layout configuration
 * @returns Array of caption pages
 */
export function createCaptionPages(
  words: TimedWord[],
  layout: Partial<CaptionLayout> = {}
): CaptionPage[] {
  const config = { ...DEFAULT_LAYOUT, ...layout };
  const pages: CaptionPage[] = [];

  if (words.length === 0) return pages;

  // Current page being built
  let currentPageLines: CaptionLine[] = [];
  let currentPageWords: TimedWord[] = [];
  let currentPageStartMs = words[0].startMs;

  // Current line being built
  let currentLineWords: TimedWord[] = [];

  /**
   * Finalize the current line and add it to the page
   */
  function finalizeCurrentLine(): void {
    if (currentLineWords.length === 0) return;

    currentPageLines.push(finalizeLine(currentLineWords));
    currentLineWords = [];
  }

  /**
   * Finalize the current page and start a new one
   */
  function finalizeCurrentPage(): void {
    // First finalize any pending line
    finalizeCurrentLine();

    if (currentPageWords.length === 0) return;

    pages.push({
      lines: currentPageLines,
      words: currentPageWords,
      text: currentPageLines.map((l) => l.text).join('\n'),
      startMs: currentPageStartMs,
      endMs: currentPageWords[currentPageWords.length - 1].endMs,
      index: pages.length,
    });

    // Reset for new page
    currentPageLines = [];
    currentPageWords = [];
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const prevWord = i > 0 ? words[i - 1] : null;

    // Check for time gap - forces new page
    const hasTimeGap = prevWord && word.startMs - prevWord.endMs > config.maxGapMs;

    // Check if we've hit max words per page
    const exceedsWordLimit = currentPageWords.length >= config.maxWordsPerPage;

    // Check if previous word ended a sentence (triggers new page)
    // Only trigger if we have at least minWordsPerPage on current page
    const prevEndedSentence =
      prevWord &&
      endsWithSentencePunctuation(prevWord.text) &&
      currentPageWords.length >= (config.minWordsPerPage ?? 1);

    // Force new page on time gap, word limit, or sentence boundary
    if (hasTimeGap || exceedsWordLimit || prevEndedSentence) {
      finalizeCurrentPage();
      currentPageStartMs = word.startMs;
    }

    // Check if adding this word would exceed line character limit
    const exceedsLineLimit = wouldExceedLineLimit(currentLineWords, word, config.maxCharsPerLine);

    if (exceedsLineLimit) {
      // Finalize current line
      finalizeCurrentLine();

      // Check if page is now full (max lines reached)
      if (currentPageLines.length >= config.maxLinesPerPage) {
        finalizeCurrentPage();
        currentPageStartMs = word.startMs;
      }
    }

    // Add word to current line and page
    currentLineWords.push(word);
    currentPageWords.push(word);
  }

  // Finalize last page
  finalizeCurrentPage();

  return pages;
}

/**
 * Finalize a line from its words
 */
function finalizeLine(words: TimedWord[]): CaptionLine {
  return {
    words,
    text: words.map((w) => w.text.trim()).join(' '),
    startMs: words[0].startMs,
    endMs: words[words.length - 1].endMs,
  };
}

/**
 * Convert our WordTimestamp format to TimedWord format
 */
export function toTimedWords(
  words: Array<{ word: string; start: number; end: number }>
): TimedWord[] {
  return words
    .filter((w) => typeof w.word === 'string' && w.word.trim().length > 0)
    .map((w) => ({
      text: w.word,
      startMs: w.start * 1000,
      endMs: w.end * 1000,
    }));
}
