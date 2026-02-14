/**
 * Sync Rater Tests
 *
 * Tests for the sync rating helper functions
 */
import { describe, it, expect } from 'vitest';

import {
  _extractWordAppearances as extractWordAppearances,
  _calculateMetrics as calculateMetrics,
  _calculateRating as calculateRating,
} from './sync-rater';
import {
  CaptionQualityRatingOptionsSchema,
  CaptionQualityRatingOutputSchema,
  SyncRatingOutputSchema,
  SyncMetricsSchema,
  WordMatchSchema,
  SyncErrorSchema,
  SyncRatingOptionsSchema,
  type SyncRatingOutput,
  type WordMatch,
} from '../domain';
import { rateCaptionQuality } from './sync-rater';

describe('Sync Schema Validation', () => {
  describe('WordMatchSchema', () => {
    it('validates a valid word match', () => {
      const wordMatch: WordMatch = {
        word: 'hello',
        ocrTimestamp: 1.5,
        asrTimestamp: 1.45,
        driftMs: 50,
        matchQuality: 'exact',
      };

      const result = WordMatchSchema.safeParse(wordMatch);
      expect(result.success).toBe(true);
    });

    it('accepts negative drift (audio leads)', () => {
      const wordMatch: WordMatch = {
        word: 'world',
        ocrTimestamp: 2.0,
        asrTimestamp: 2.1,
        driftMs: -100,
        matchQuality: 'fuzzy',
      };

      const result = WordMatchSchema.safeParse(wordMatch);
      expect(result.success).toBe(true);
    });
  });

  describe('SyncMetricsSchema', () => {
    it('validates complete metrics', () => {
      const metrics = {
        meanDriftMs: 45.5,
        maxDriftMs: 120,
        rawMaxDriftMs: 120,
        p95DriftMs: 95,
        medianDriftMs: 40,
        meanSignedDriftMs: 30,
        leadingRatio: 0.2,
        laggingRatio: 0.8,
        driftStdDev: 25,
        outlierCount: 0,
        outlierRatio: 0,
        matchedWords: 50,
        totalOcrWords: 55,
        totalAsrWords: 52,
        matchRatio: 0.91,
      };

      const result = SyncMetricsSchema.safeParse(metrics);
      expect(result.success).toBe(true);
    });
  });

  describe('SyncRatingOptionsSchema', () => {
    it('applies defaults for empty options', () => {
      const result = SyncRatingOptionsSchema.parse({});

      expect(result.fps).toBe(2);
      expect(result.ocrEngine).toBe('tesseract');
      expect(result.asrModel).toBe('base');
      expect(result.captionRegion.yRatio).toBe(0.65);
      expect(result.captionRegion.heightRatio).toBe(0.35);
      expect(result.thresholds.minRating).toBe(60);
      expect(result.thresholds.maxMeanDriftMs).toBe(180);
    });

    it('allows overriding specific options', () => {
      const result = SyncRatingOptionsSchema.parse({
        fps: 5,
        thresholds: {
          minRating: 80,
        },
      });

      expect(result.fps).toBe(5);
      expect(result.thresholds.minRating).toBe(80);
    });
  });

  describe('CaptionQualityRatingOptionsSchema', () => {
    it('applies defaults for empty options', () => {
      const result = CaptionQualityRatingOptionsSchema.parse({});
      expect(result.fps).toBe(2);
      expect(result.ocrEngine).toBe('tesseract');
      expect(result.captionRegion.yRatio).toBe(0.65);
      expect(result.captionRegion.heightRatio).toBe(0.35);
    });
  });

  describe('CaptionQualityRatingOutputSchema', () => {
    it('validates OCR-only output from mock rater', async () => {
      const output = await rateCaptionQuality('/path/to/video.mp4', { mock: true });
      const parsed = CaptionQualityRatingOutputSchema.safeParse(output);
      expect(parsed.success).toBe(true);
    });
  });

  describe('SyncRatingOutputSchema', () => {
    it('validates a complete sync rating output', () => {
      const output: SyncRatingOutput = {
        schemaVersion: '1.0.0',
        videoPath: '/path/to/video.mp4',
        rating: 85,
        ratingLabel: 'good',
        passed: true,
        metrics: {
          meanDriftMs: 45,
          maxDriftMs: 120,
          rawMaxDriftMs: 120,
          p95DriftMs: 95,
          medianDriftMs: 40,
          meanSignedDriftMs: 30,
          leadingRatio: 0.2,
          laggingRatio: 0.8,
          driftStdDev: 25,
          outlierCount: 0,
          outlierRatio: 0,
          matchedWords: 50,
          totalOcrWords: 55,
          totalAsrWords: 52,
          matchRatio: 0.91,
        },
        wordMatches: [
          {
            word: 'hello',
            ocrTimestamp: 1.0,
            asrTimestamp: 0.95,
            driftMs: 50,
            matchQuality: 'exact',
          },
        ],
        driftTimeline: [{ timestamp: 0.95, driftMs: 50 }],
        errors: [],
        analysis: {
          ocrEngine: 'tesseract',
          asrEngine: 'whisper-cpp',
          framesAnalyzed: 60,
          analysisTimeMs: 5000,
        },
        createdAt: new Date().toISOString(),
      };

      const result = SyncRatingOutputSchema.safeParse(output);
      expect(result.success).toBe(true);
    });

    it('validates all rating labels', () => {
      const labels = ['excellent', 'good', 'fair', 'poor', 'broken'] as const;

      for (const label of labels) {
        const output = {
          schemaVersion: '1.0.0',
          videoPath: '/test.mp4',
          rating: 50,
          ratingLabel: label,
          passed: false,
          metrics: {
            meanDriftMs: 0,
            maxDriftMs: 0,
            rawMaxDriftMs: 0,
            p95DriftMs: 0,
            medianDriftMs: 0,
            meanSignedDriftMs: 0,
            leadingRatio: 0,
            laggingRatio: 0,
            driftStdDev: 0,
            outlierCount: 0,
            outlierRatio: 0,
            matchedWords: 0,
            totalOcrWords: 0,
            totalAsrWords: 0,
            matchRatio: 0,
          },
          wordMatches: [],
          driftTimeline: [],
          errors: [],
          analysis: {
            ocrEngine: 'tesseract',
            asrEngine: 'whisper-cpp',
            framesAnalyzed: 0,
            analysisTimeMs: 0,
          },
          createdAt: new Date().toISOString(),
        };

        const result = SyncRatingOutputSchema.safeParse(output);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('extractWordAppearances', () => {
    it('filters low-confidence frames', () => {
      const frames = [
        { frameNumber: 1, timestamp: 0.0, text: 'hello world', confidence: 0.9 },
        { frameNumber: 2, timestamp: 0.5, text: 'subway sign noise', confidence: 0.27 },
        { frameNumber: 3, timestamp: 1.0, text: 'hello again', confidence: 0.85 },
      ];
      const result = extractWordAppearances(frames, { minConfidence: 0.5 });
      const words = result.map((r) => r.word);
      expect(words).toContain('hello');
      expect(words).toContain('world');
      expect(words).toContain('again');
      expect(words).not.toContain('subway');
      expect(words).not.toContain('noise');
    });

    it('skips words with no alphabetic characters', () => {
      const frames = [{ frameNumber: 1, timestamp: 0.0, text: 'hello 1234 !!!', confidence: 0.9 }];
      const result = extractWordAppearances(frames);
      const words = result.map((r) => r.word);
      expect(words).toContain('hello');
      expect(words).not.toContain('1234');
    });
  });

  describe('calculateMetrics', () => {
    it('uses ASR word count as matchRatio denominator', () => {
      const matches = Array.from({ length: 80 }, (_, i) => ({
        word: `word${i}`,
        ocrTimestamp: i * 0.5,
        asrTimestamp: i * 0.5,
        driftMs: 0,
        matchQuality: 'exact' as const,
      }));
      // 577 OCR words, 100 ASR words, 80 matches
      const metrics = calculateMetrics(matches, 577, 100);
      // Should be 80/100 = 0.80, NOT 80/577
      expect(metrics.matchRatio).toBeCloseTo(0.8, 2);
    });
  });

  describe('calculateRating', () => {
    it('scores a watchable-but-rough video ~60-70', () => {
      // Profile: decent matchRatio, some drift
      const metrics = {
        meanDriftMs: 80,
        maxDriftMs: 250,
        rawMaxDriftMs: 250,
        p95DriftMs: 150,
        medianDriftMs: 60,
        meanSignedDriftMs: 50,
        leadingRatio: 0.1,
        laggingRatio: 0.9,
        driftStdDev: 60,
        outlierCount: 2,
        outlierRatio: 0.05,
        matchedWords: 70,
        totalOcrWords: 150,
        totalAsrWords: 100,
        matchRatio: 0.7,
      };
      const score = calculateRating(metrics);
      expect(score).toBeGreaterThanOrEqual(55);
      expect(score).toBeLessThanOrEqual(85);
    });

    it('scores perfect sync near 100', () => {
      const metrics = {
        meanDriftMs: 10,
        maxDriftMs: 30,
        rawMaxDriftMs: 30,
        p95DriftMs: 25,
        medianDriftMs: 8,
        meanSignedDriftMs: 5,
        leadingRatio: 0.3,
        laggingRatio: 0.7,
        driftStdDev: 10,
        outlierCount: 0,
        outlierRatio: 0,
        matchedWords: 95,
        totalOcrWords: 100,
        totalAsrWords: 100,
        matchRatio: 0.95,
      };
      const score = calculateRating(metrics);
      expect(score).toBeGreaterThanOrEqual(90);
    });

    it('never returns 0 when there are matched words and some matchRatio', () => {
      const metrics = {
        meanDriftMs: 200,
        maxDriftMs: 500,
        rawMaxDriftMs: 500,
        p95DriftMs: 400,
        medianDriftMs: 150,
        meanSignedDriftMs: 100,
        leadingRatio: 0.0,
        laggingRatio: 1.0,
        driftStdDev: 150,
        outlierCount: 5,
        outlierRatio: 0.1,
        matchedWords: 20,
        totalOcrWords: 200,
        totalAsrWords: 100,
        matchRatio: 0.2,
      };
      const score = calculateRating(metrics);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('SyncErrorSchema', () => {
    it('validates error with all fields', () => {
      const error = {
        type: 'global_offset',
        severity: 'error',
        message: 'Consistent positive drift detected',
        timeRange: { start: 0, end: 30 },
        affectedWords: ['hello', 'world'],
        suggestedFix: 'Apply global offset of -150ms',
      };

      const result = SyncErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });

    it('validates error with minimal fields', () => {
      const error = {
        type: 'low_match_ratio',
        severity: 'critical',
        message: 'Only 40% of words matched',
      };

      const result = SyncErrorSchema.safeParse(error);
      expect(result.success).toBe(true);
    });
  });
});
