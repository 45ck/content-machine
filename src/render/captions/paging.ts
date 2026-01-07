/**
 * Caption Paging Utilities
 *
 * Groups words into pages based on character limits, line counts, and timing.
 * Based on gyoridavid/short-video-maker createCaptionPages pattern.
 *
 * This is the KEY to TikTok-style captions: showing only a few words at a time.
 */
import { CaptionLayout } from './config';

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
  maxCharsPerLine: 20,
  maxLinesPerPage: 1,
  maxGapMs: 1000,
  minWordsPerPage: 1,
  maxWordsPerPage: 6,
};

/**
 * Create caption pages from timed words
 *
 * This groups words into pages based on:
 * 1. Character limit per line
 * 2. Maximum lines per page
 * 3. Time gaps between words
 * 4. Word count limits
 *
 * @param words - Array of words with timing
 * @param layout - Layout configuration
 * @returns Array of caption pages
 */
// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export function createCaptionPages(
  words: TimedWord[],
  layout: Partial<CaptionLayout> = {}
): CaptionPage[] {
  const config = { ...DEFAULT_LAYOUT, ...layout };
  const pages: CaptionPage[] = [];

  if (words.length === 0) return pages;

  let currentPage: {
    lines: CaptionLine[];
    words: TimedWord[];
    startMs: number;
    endMs: number;
  } = {
    lines: [],
    words: [],
    startMs: words[0].startMs,
    endMs: words[0].endMs,
  };

  let currentLine: {
    words: TimedWord[];
    charCount: number;
  } = {
    words: [],
    charCount: 0,
  };

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordText = word.text.trim();
    const wordCharCount = wordText.length;
    const prevWord = i > 0 ? words[i - 1] : null;

    // Check if we need a new page due to time gap
    const hasTimeGap = prevWord && word.startMs - prevWord.endMs > config.maxGapMs;

    // Check if adding this word would exceed line character limit
    const lineWithWord =
      currentLine.charCount + (currentLine.words.length > 0 ? 1 : 0) + wordCharCount;
    const exceedsLineLimit = lineWithWord > config.maxCharsPerLine && currentLine.words.length > 0;

    // Check if we've hit max words per page
    const exceedsWordLimit = currentPage.words.length >= config.maxWordsPerPage;

    // Determine if we need to finalize current line
    if (exceedsLineLimit || hasTimeGap || exceedsWordLimit) {
      // Finalize current line if it has words
      if (currentLine.words.length > 0) {
        const line = finalizeLine(currentLine.words);
        currentPage.lines.push(line);
        currentPage.endMs = line.endMs;
      }

      // Check if page is full (max lines reached) or has time gap or word limit
      const pageIsFull = currentPage.lines.length >= config.maxLinesPerPage;

      if (pageIsFull || hasTimeGap || exceedsWordLimit) {
        // Finalize current page if it has content
        if (currentPage.words.length > 0) {
          pages.push(finalizePage(currentPage, pages.length));
        }

        // Start new page
        currentPage = {
          lines: [],
          words: [],
          startMs: word.startMs,
          endMs: word.endMs,
        };
      }

      // Start new line
      currentLine = {
        words: [],
        charCount: 0,
      };
    }

    // Add word to current line and page
    currentLine.words.push(word);
    currentLine.charCount += (currentLine.words.length > 1 ? 1 : 0) + wordCharCount;
    currentPage.words.push(word);
    currentPage.endMs = word.endMs;
  }

  // Finalize last line
  if (currentLine.words.length > 0) {
    const line = finalizeLine(currentLine.words);
    currentPage.lines.push(line);
    currentPage.endMs = line.endMs;
  }

  // Finalize last page
  if (currentPage.words.length > 0) {
    pages.push(finalizePage(currentPage, pages.length));
  }

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
 * Finalize a page from its accumulated data
 */
function finalizePage(
  page: { lines: CaptionLine[]; words: TimedWord[]; startMs: number; endMs: number },
  index: number
): CaptionPage {
  return {
    lines: page.lines,
    words: page.words,
    text: page.lines.map((l) => l.text).join('\n'),
    startMs: page.startMs,
    endMs: page.endMs,
    index,
  };
}

/**
 * Convert our WordTimestamp format to TimedWord format
 */
export function toTimedWords(
  words: Array<{ word: string; start: number; end: number }>
): TimedWord[] {
  return words.map((w) => ({
    text: w.word,
    startMs: w.start * 1000,
    endMs: w.end * 1000,
  }));
}
