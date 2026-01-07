/**
 * Caption Preset Multi-Line Tests
 *
 * FAIL-FIRST TEST: Verifies that caption presets support multi-line captions.
 * This test was created to catch the bug where PRESET_TIKTOK had maxLinesPerPage: 1
 * which caused all captions to render as single lines.
 *
 * Critical: All major presets should support at least 2 lines by default.
 */
import { describe, it, expect } from 'vitest';
import {
  PRESET_TIKTOK,
  PRESET_YOUTUBE_SHORTS,
  PRESET_REELS,
  PRESET_MINIMAL,
  PRESET_NEON,
  PRESET_BOLD_IMPACT,
  CAPTION_STYLE_PRESETS,
} from '../../../../src/render/captions/presets';
import { createCaptionPages, toTimedWords } from '../../../../src/render/captions/paging';

describe('Caption Presets Multi-Line Support', () => {
  describe('preset layout configuration', () => {
    it('PRESET_TIKTOK should support 2 lines per page', () => {
      // This was the bug: PRESET_TIKTOK had maxLinesPerPage: 1
      expect(PRESET_TIKTOK.layout.maxLinesPerPage).toBeGreaterThanOrEqual(2);
    });

    it('PRESET_YOUTUBE_SHORTS should support 2 lines per page', () => {
      expect(PRESET_YOUTUBE_SHORTS.layout.maxLinesPerPage).toBeGreaterThanOrEqual(2);
    });

    it('PRESET_REELS should support 2 lines per page', () => {
      expect(PRESET_REELS.layout.maxLinesPerPage).toBeGreaterThanOrEqual(2);
    });

    it('PRESET_MINIMAL should support 2 lines per page', () => {
      expect(PRESET_MINIMAL.layout.maxLinesPerPage).toBeGreaterThanOrEqual(2);
    });

    it('PRESET_NEON should support 2 lines per page', () => {
      expect(PRESET_NEON.layout.maxLinesPerPage).toBeGreaterThanOrEqual(2);
    });

    it('PRESET_BOLD_IMPACT can have 1 line (intentional for impact)', () => {
      // Bold impact is intentionally single-line for maximum visual impact
      // This is acceptable as it uses very large font (96px)
      expect(PRESET_BOLD_IMPACT.layout.maxLinesPerPage).toBeGreaterThanOrEqual(1);
    });
  });

  describe('preset generates multi-line captions', () => {
    // Create realistic test words
    const testWords = [
      { word: 'Redis', start: 0, end: 0.3 },
      { word: 'is', start: 0.35, end: 0.45 },
      { word: 'incredibly', start: 0.5, end: 0.8 },
      { word: 'fast', start: 0.85, end: 1.1 },
      { word: 'because', start: 1.15, end: 1.4 },
      { word: 'it', start: 1.45, end: 1.55 },
      { word: 'stores', start: 1.6, end: 1.85 },
      { word: 'data', start: 1.9, end: 2.1 },
    ];

    it('PRESET_TIKTOK creates multi-line pages for typical content', () => {
      const timedWords = toTimedWords(testWords);
      const pages = createCaptionPages(timedWords, PRESET_TIKTOK.layout);

      // With 8 words and maxCharsPerLine: 25, should have multi-line pages
      const hasMultiLine = pages.some((p) => p.lines.length > 1);
      expect(hasMultiLine).toBe(true);
    });

    it('PRESET_YOUTUBE_SHORTS creates multi-line pages for typical content', () => {
      const timedWords = toTimedWords(testWords);
      const pages = createCaptionPages(timedWords, PRESET_YOUTUBE_SHORTS.layout);

      const hasMultiLine = pages.some((p) => p.lines.length > 1);
      expect(hasMultiLine).toBe(true);
    });

    it('PRESET_REELS creates multi-line pages for typical content', () => {
      const timedWords = toTimedWords(testWords);
      const pages = createCaptionPages(timedWords, PRESET_REELS.layout);

      const hasMultiLine = pages.some((p) => p.lines.length > 1);
      expect(hasMultiLine).toBe(true);
    });

    it('PRESET_MINIMAL creates multi-line pages for typical content', () => {
      const timedWords = toTimedWords(testWords);
      const pages = createCaptionPages(timedWords, PRESET_MINIMAL.layout);

      const hasMultiLine = pages.some((p) => p.lines.length > 1);
      expect(hasMultiLine).toBe(true);
    });

    it('PRESET_NEON creates multi-line pages for typical content', () => {
      const timedWords = toTimedWords(testWords);
      const pages = createCaptionPages(timedWords, PRESET_NEON.layout);

      const hasMultiLine = pages.some((p) => p.lines.length > 1);
      expect(hasMultiLine).toBe(true);
    });
  });

  describe('all presets have reasonable layout settings', () => {
    it('all presets (except bold) have maxCharsPerLine >= 15', () => {
      for (const [name, preset] of Object.entries(CAPTION_STYLE_PRESETS)) {
        // Bold impact uses 96px font with intentionally short lines for maximum impact
        if (name === 'bold') continue;
        expect(
          preset.layout.maxCharsPerLine,
          `${name} should have maxCharsPerLine >= 15`
        ).toBeGreaterThanOrEqual(15);
      }
    });

    it('all presets have maxWordsPerPage >= 2', () => {
      for (const [name, preset] of Object.entries(CAPTION_STYLE_PRESETS)) {
        expect(
          preset.layout.maxWordsPerPage,
          `${name} should have maxWordsPerPage >= 2`
        ).toBeGreaterThanOrEqual(2);
      }
    });

    it('traditional presets have maxGapMs >= 500', () => {
      // Short-form presets (capcut, hormozi, karaoke) intentionally use faster pacing
      const shortFormPresets = ['capcut', 'hormozi', 'karaoke'];
      for (const [name, preset] of Object.entries(CAPTION_STYLE_PRESETS)) {
        if (shortFormPresets.includes(name)) continue;
        expect(
          preset.layout.maxGapMs,
          `${name} should have maxGapMs >= 500`
        ).toBeGreaterThanOrEqual(500);
      }
    });

    it('short-form presets have faster pacing (maxGapMs >= 300)', () => {
      const shortFormPresets = ['capcut', 'hormozi', 'karaoke'];
      for (const [name, preset] of Object.entries(CAPTION_STYLE_PRESETS)) {
        if (!shortFormPresets.includes(name)) continue;
        expect(
          preset.layout.maxGapMs,
          `${name} should have maxGapMs >= 300 for fast pacing`
        ).toBeGreaterThanOrEqual(300);
      }
    });
  });
});
