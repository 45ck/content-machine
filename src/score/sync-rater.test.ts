/**
 * Sync Rater Tests
 *
 * Tests for the sync rating helper functions
 */
import { describe, it, expect } from 'vitest';

// Import helper functions - we need to export them for testing
// For now, test the schema imports
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
        p95DriftMs: 95,
        medianDriftMs: 40,
        meanSignedDriftMs: 30,
        leadingRatio: 0.2,
        laggingRatio: 0.8,
        driftStdDev: 25,
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
          p95DriftMs: 95,
          medianDriftMs: 40,
          meanSignedDriftMs: 30,
          leadingRatio: 0.2,
          laggingRatio: 0.8,
          driftStdDev: 25,
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
            p95DriftMs: 0,
            medianDriftMs: 0,
            meanSignedDriftMs: 0,
            leadingRatio: 0,
            laggingRatio: 0,
            driftStdDev: 0,
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
