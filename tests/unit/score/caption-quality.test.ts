/**
 * Caption Quality Metrics Tests
 *
 * These tests define quality gates for caption generation.
 * Many will FAIL initially - that's intentional (fail-first/TDD).
 *
 * The goal is to improve the system until all tests pass.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  analyzeCaptionQuality,
  QUALITY_THRESHOLDS,
  formatQualityReport,
  type CaptionQualityReport,
} from '../../../src/score/caption-quality';
import type { WordTimestamp } from '../../../src/audio/schema';

const shouldRunRealOutput = process.env.CM_RUN_REAL_OUTPUT_TESTS === 'true';
const describeRealOutput = shouldRunRealOutput ? describe : describe.skip;

/**
 * Load real timestamps from output directory
 * Supports both flat format (data.words) and scene-based format (data.scenes[].words)
 */
function loadRealTimestamps(): WordTimestamp[] | null {
  const path = join(process.cwd(), 'output', 'timestamps.json');
  if (!existsSync(path)) {
    return null;
  }
  const data = JSON.parse(readFileSync(path, 'utf-8'));

  // Try flat format first
  if (data.words && Array.isArray(data.words)) {
    return data.words;
  }

  // Try scene-based format
  if (data.scenes && Array.isArray(data.scenes)) {
    return data.scenes.flatMap((scene: { words?: WordTimestamp[] }) => scene.words || []);
  }

  return [];
}

describe('Caption Quality Metrics', () => {
  describe('Unit Tests - Known Issue Detection', () => {
    it('should detect split words like "Str" + "uggling"', () => {
      const words: WordTimestamp[] = [
        { word: 'Str', start: 0.17, end: 0.366, confidence: 0.79 },
        { word: 'uggling', start: 0.32, end: 0.56, confidence: 0.99 },
        { word: 'to', start: 0.6, end: 0.7, confidence: 0.99 },
      ];

      const report = analyzeCaptionQuality(words);

      expect(report.issues.some((i) => i.type === 'split-word')).toBe(true);
      expect(report.metrics.wordIntegrity).toBeLessThan(1);
    });

    it('should detect split contractions like "It" + "\'s"', () => {
      const words: WordTimestamp[] = [
        { word: 'It', start: 6.51, end: 6.6, confidence: 0.56 },
        { word: "'s", start: 6.6, end: 0.69, confidence: 0.98 },
        { word: 'great', start: 0.7, end: 0.9, confidence: 0.99 },
      ];

      const report = analyzeCaptionQuality(words);

      expect(report.issues.some((i) => i.type === 'split-contraction')).toBe(true);
      expect(report.metrics.contractionIntegrity).toBeLessThan(1);
    });

    it('should detect very short word durations', () => {
      const words: WordTimestamp[] = [
        { word: 'day', start: 1.0, end: 1.01, confidence: 0.99 }, // 10ms - too short
        { word: 'by', start: 1.1, end: 1.2, confidence: 0.99 },
        { word: 'day', start: 1.2, end: 1.4, confidence: 0.99 },
      ];

      const report = analyzeCaptionQuality(words);

      expect(report.issues.some((i) => i.type === 'short-duration')).toBe(true);
      expect(report.metrics.durationHealth).toBeLessThan(1);
    });

    it('should detect overlapping timestamps', () => {
      const words: WordTimestamp[] = [
        { word: 'hello', start: 0.0, end: 0.5, confidence: 0.99 },
        { word: 'world', start: 0.3, end: 0.8, confidence: 0.99 }, // Overlaps!
      ];

      const report = analyzeCaptionQuality(words);

      expect(report.issues.some((i) => i.type === 'overlap')).toBe(true);
      expect(report.metrics.timestampValidity).toBe(0);
    });

    it('should detect low confidence words', () => {
      const words: WordTimestamp[] = [
        { word: 'maybe', start: 0.0, end: 0.3, confidence: 0.2 }, // Very low
        { word: 'something', start: 0.3, end: 0.6, confidence: 0.99 },
      ];

      const report = analyzeCaptionQuality(words);

      expect(report.issues.some((i) => i.type === 'low-confidence')).toBe(true);
      expect(report.metrics.confidenceHealth).toBeLessThan(1);
    });
  });

  describe('Perfect Quality - Should Pass', () => {
    it('should give perfect score for well-formed captions', () => {
      const words: WordTimestamp[] = [
        { word: 'Hello', start: 0.0, end: 0.3, confidence: 0.99 },
        { word: 'world', start: 0.35, end: 0.6, confidence: 0.98 },
        { word: "It's", start: 0.65, end: 0.9, confidence: 0.97 }, // Contraction together
        { word: 'great', start: 0.95, end: 1.2, confidence: 0.99 },
        { word: 'to', start: 1.25, end: 1.4, confidence: 0.96 },
        { word: 'be', start: 1.45, end: 1.6, confidence: 0.98 },
        { word: 'here', start: 1.65, end: 1.9, confidence: 0.99 },
      ];

      const report = analyzeCaptionQuality(words);

      // Debug: log issues if any
      if (report.issues.length > 0) {
        console.log('Unexpected issues:', JSON.stringify(report.issues, null, 2));
      }

      expect(report.issues.length).toBe(0);
      expect(report.overallScore).toBeGreaterThanOrEqual(0.95);
      expect(report.passed).toBe(true);
    });
  });

  describeRealOutput('Real Output Quality Gates', () => {
    let realWords: WordTimestamp[] | null;
    let report: CaptionQualityReport | null;

    beforeAll(() => {
      realWords = loadRealTimestamps();
      if (realWords && realWords.length > 0) {
        report = analyzeCaptionQuality(realWords);
        // Print report for debugging
        console.log(formatQualityReport(report));
      }
    });

    it('should have timestamps.json available for testing', () => {
      // This may fail if no video has been generated
      expect(realWords).not.toBeNull();
      expect(realWords!.length).toBeGreaterThan(0);
    });

    it('QUALITY GATE: Word integrity should be >= 95%', () => {
      if (!report) return; // Skip if no data
      expect(report.metrics.wordIntegrity).toBeGreaterThanOrEqual(QUALITY_THRESHOLDS.wordIntegrity);
    });

    it('QUALITY GATE: Contraction integrity should be >= 90%', () => {
      if (!report) return;
      expect(report.metrics.contractionIntegrity).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.contractionIntegrity
      );
    });

    it('QUALITY GATE: Duration health should be >= 90%', () => {
      if (!report) return;
      expect(report.metrics.durationHealth).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.durationHealth
      );
    });

    it('QUALITY GATE: No overlapping timestamps', () => {
      if (!report) return;
      expect(report.metrics.timestampValidity).toBe(1);
    });

    it('QUALITY GATE: Confidence health should be >= 80%', () => {
      if (!report) return;
      expect(report.metrics.confidenceHealth).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.confidenceHealth
      );
    });

    it('QUALITY GATE: Readability rate should be >= 85%', () => {
      if (!report) return;
      expect(report.metrics.readabilityRate).toBeGreaterThanOrEqual(
        QUALITY_THRESHOLDS.readabilityRate
      );
    });

    it('QUALITY GATE: Overall score should be >= 85%', () => {
      if (!report) return;
      expect(report.overallScore).toBeGreaterThanOrEqual(QUALITY_THRESHOLDS.overallMinimum);
    });

    it('QUALITY GATE: All metrics should pass', () => {
      if (!report) return;
      expect(report.passed).toBe(true);
    });
  });

  describe('Specific Known Issues from Real Output', () => {
    // These tests document specific issues found in output/timestamps.json
    // They serve as regression tests after fixes are applied

    it('should NOT have "Str" + "uggling" split', () => {
      const realWords = loadRealTimestamps();
      if (!realWords) return;

      // Check for this specific split
      const hasStrSplit = realWords.some(
        (w, i) => w.word === 'Str' && realWords[i + 1]?.word.toLowerCase().includes('uggling')
      );

      expect(hasStrSplit).toBe(false);
    });

    it('should NOT have "hyd" + "rate" split', () => {
      const realWords = loadRealTimestamps();
      if (!realWords) return;

      const hasHydSplit = realWords.some(
        (w, i) => w.word.toLowerCase() === 'hyd' && realWords[i + 1]?.word.toLowerCase() === 'rate'
      );

      expect(hasHydSplit).toBe(false);
    });

    it('should NOT have "It" + "\'s" split contractions', () => {
      const realWords = loadRealTimestamps();
      if (!realWords) return;

      const hasSplitContraction = realWords.some(
        (w, i) => (w.word === 'It' || w.word === 'it') && realWords[i + 1]?.word === "'s"
      );

      expect(hasSplitContraction).toBe(false);
    });

    it('should NOT have any word with duration < 29ms', () => {
      // 29ms threshold accounts for floating point precision
      // Words between 30-50ms are acceptable for short function words like "a", "or"
      const realWords = loadRealTimestamps();
      if (!realWords) return;

      const veryShortWords = realWords.filter((w) => (w.end - w.start) * 1000 < 29);

      expect(veryShortWords).toEqual([]);
    });
  });
});

describe('Quality Report Formatting', () => {
  it('should format report as readable string', () => {
    const words: WordTimestamp[] = [
      { word: 'Str', start: 0.17, end: 0.366, confidence: 0.79 },
      { word: 'uggling', start: 0.32, end: 0.56, confidence: 0.99 },
    ];

    const report = analyzeCaptionQuality(words);
    const formatted = formatQualityReport(report);

    expect(formatted).toContain('Caption Quality Report');
    expect(formatted).toContain('Overall Score');
    expect(formatted).toContain('split-word');
  });
});
