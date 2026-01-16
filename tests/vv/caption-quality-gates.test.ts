/**
 * FAIL-FIRST V&V: caption quality gates for short-form readability.
 */
import { describe, expect, it } from 'vitest';
import { createCaptionChunks, layoutToChunkingConfig } from '../../src/render/captions/chunking';
import { PRESET_TIKTOK } from '../../src/render/captions/presets';

function buildTimedWords(
  words: string[],
  wpm: number
): Array<{ word: string; startMs: number; endMs: number }> {
  const msPerWord = Math.round((60_000 / wpm) * 1000) / 1000;
  let currentMs = 0;
  return words.map((word) => {
    const startMs = currentMs;
    const endMs = currentMs + msPerWord;
    currentMs = endMs;
    return { word, startMs, endMs };
  });
}

describe('V&V: caption quality gates', () => {
  it('keeps chunks within readable bounds for TikTok preset', () => {
    const scriptWords = [
      'Short-form',
      'captions',
      'need',
      'breathing',
      'room,',
      'not',
      'cramped',
      'text.',
      'Group',
      'words',
      'into',
      'small',
      'phrases',
      'that',
      'land',
      'naturally.',
      'Keep',
      'pacing',
      'steady',
      'so',
      'viewers',
      'stay',
      'locked',
      'in.',
    ];
    const timedWords = buildTimedWords(scriptWords, 120);
    const chunkConfig = layoutToChunkingConfig(PRESET_TIKTOK.layout);
    const chunks = createCaptionChunks(timedWords, chunkConfig);

    expect(chunks.length).toBeGreaterThan(0);

    const wordCounts = chunks.map((chunk) => chunk.words.length);
    const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

    expect(avgWords).toBeGreaterThanOrEqual(2);
    expect(avgWords).toBeLessThanOrEqual(5);

    for (const chunk of chunks) {
      const durationMs = chunk.endMs - chunk.startMs;
      expect(chunk.words.length).toBeLessThanOrEqual(6);
      if (chunk.words.length <= 2) {
        expect(durationMs).toBeGreaterThanOrEqual(chunkConfig.minOnScreenMsShort ?? 800);
      } else {
        expect(durationMs).toBeGreaterThanOrEqual(chunkConfig.minOnScreenMs ?? 1100);
      }
      const cps = durationMs > 0 ? (chunk.charCount / durationMs) * 1000 : Infinity;
      expect(cps).toBeLessThanOrEqual((chunkConfig.maxCharsPerSecond ?? 15) + 0.5);
    }
  });
});
