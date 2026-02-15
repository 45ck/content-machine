/**
 * Caption Timing Helper
 *
 * Provides timing utilities for TikTok-style caption rendering.
 * Handles the critical conversion from absolute word times to
 * Sequence-relative times (Remotion's frame resets to 0 at each Sequence start).
 *
 * @see docs/dev/architecture/CAPTION-TIMING-20260610.md
 * @see docs/research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260610.md
 */

export interface Word {
  word?: string;
  text?: string;
  startMs: number;
  endMs: number;
}

export interface PageTiming {
  startMs: number;
  endMs: number;
}

/**
 * Find the active word at a given absolute time.
 *
 * Uses word start times as boundaries (a word stays active until the next word starts),
 * which makes highlighting more stable when ASR end times are very short.
 */
export function getActiveWord(words: Word[], absoluteTimeMs: number): Word | null {
  if (words.length === 0) return null;

  // Ensure deterministic order even if input isn't strictly sorted.
  const sorted = [...words].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  if (absoluteTimeMs < sorted[0].startMs) return null;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    if (absoluteTimeMs >= current.startMs && (!next || absoluteTimeMs < next.startMs)) {
      return current;
    }
  }

  return sorted[sorted.length - 1];
}

/**
 * Determines if a word is currently active (should be highlighted) within a Sequence.
 *
 * This solves the critical bug from v3 where highlighting didn't work because:
 * - `useCurrentFrame()` returns frame relative to Sequence start (resets to 0)
 * - Word times are absolute (from start of audio)
 *
 * The fix: Convert word times to page-relative by subtracting page.startMs.
 *
 * @param word - The word with absolute timing
 * @param pageStartMs - The page start time in ms (or PageTiming object)
 * @param sequenceTimeMs - Current time within the Sequence (from useCurrentFrame)
 * @returns true if the word should be highlighted
 *
 * @example
 * ```ts
 * // Word at 1000-1500ms absolute, page starts at 500ms
 * // Sequence time at 500ms means we're at 1000ms absolute
 * isWordActive(
 *   { text: 'hello', startMs: 1000, endMs: 1500 },
 *   500, // pageStartMs
 *   500  // sequenceTimeMs
 * ); // => true (1000ms is between 1000-1500ms)
 * ```
 */
export function isWordActive(
  word: Word,
  pageStartMs: number | PageTiming,
  sequenceTimeMs: number
): boolean {
  // Support both number and PageTiming object
  const pageStart = typeof pageStartMs === 'number' ? pageStartMs : pageStartMs.startMs;

  // Convert sequence-relative time to absolute time
  const absoluteTimeMs = pageStart + sequenceTimeMs;

  // Check if absolute time is within the word's duration
  return absoluteTimeMs >= word.startMs && absoluteTimeMs < word.endMs;
}

/**
 * Gets the progress through the current word (0 to 1).
 * Useful for animated highlight effects.
 *
 * @param word - The word with absolute timing
 * @param pageStartMs - The page start time in ms
 * @param sequenceTimeMs - Current time within the Sequence
 * @returns Progress from 0 (start) to 1 (end), or null if not active
 */
export function getWordProgress(
  word: Word,
  pageStartMs: number | PageTiming,
  sequenceTimeMs: number
): number | null {
  if (!isWordActive(word, pageStartMs, sequenceTimeMs)) {
    return null;
  }

  const pageStart = typeof pageStartMs === 'number' ? pageStartMs : pageStartMs.startMs;
  const absoluteTimeMs = pageStart + sequenceTimeMs;
  const wordDuration = word.endMs - word.startMs;

  if (wordDuration <= 0) {
    return 0;
  }

  const elapsed = absoluteTimeMs - word.startMs;
  return Math.min(1, Math.max(0, elapsed / wordDuration));
}

/**
 * Converts frame number to milliseconds for a given FPS.
 *
 * @param frame - The frame number
 * @param fps - Frames per second
 * @returns Time in milliseconds
 */
export function frameToMs(frame: number, fps: number): number {
  return (frame / fps) * 1000;
}

/**
 * Converts milliseconds to frame number for a given FPS.
 *
 * @param ms - Time in milliseconds
 * @param fps - Frames per second
 * @returns Frame number (floored)
 */
export function msToFrame(ms: number, fps: number): number {
  return Math.floor((ms / 1000) * fps);
}
