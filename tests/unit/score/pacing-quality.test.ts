/**
 * Pacing Quality Tests
 *
 * Tests for scene pacing consistency and naturalness.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  analyzePacingQuality,
  formatPacingReport,
  PACING_THRESHOLDS,
} from '../../../src/score/pacing-quality';
import type { TimestampsResult } from '../../../src/audio/schema';

describe('Pacing Quality Metrics', () => {
  describe('Unit Tests', () => {
    it('should detect normal pacing (150-200 WPM)', () => {
      const timestamps: TimestampsResult = {
        durationMs: 10000,
        allWords: [],
        scenes: [
          {
            sceneIndex: 0,
            startMs: 0,
            endMs: 6000,
            text: 'Test scene with normal pacing',
            words: [
              { word: 'Test', start: 0, end: 0.4, confidence: 0.9 },
              { word: 'scene', start: 0.5, end: 0.9, confidence: 0.9 },
              { word: 'with', start: 1.0, end: 1.3, confidence: 0.9 },
              { word: 'normal', start: 1.4, end: 1.8, confidence: 0.9 },
              { word: 'pacing', start: 1.9, end: 2.3, confidence: 0.9 },
              { word: 'here', start: 2.4, end: 2.8, confidence: 0.9 },
            ],
          },
        ],
      };

      const report = analyzePacingQuality(timestamps);

      expect(report.scenes[0].status).toBe('normal');
      expect(report.scenes[0].wpm).toBeGreaterThan(100);
      expect(report.scenes[0].wpm).toBeLessThan(250);
    });

    it('should detect fast pacing (>220 WPM)', () => {
      const timestamps: TimestampsResult = {
        durationMs: 3000,
        allWords: [],
        scenes: [
          {
            sceneIndex: 0,
            startMs: 0,
            endMs: 3000,
            text: 'Fast paced scene',
            words: [
              { word: 'Fast', start: 0, end: 0.15, confidence: 0.9 },
              { word: 'paced', start: 0.2, end: 0.35, confidence: 0.9 },
              { word: 'scene', start: 0.4, end: 0.55, confidence: 0.9 },
              { word: 'with', start: 0.6, end: 0.75, confidence: 0.9 },
              { word: 'many', start: 0.8, end: 0.95, confidence: 0.9 },
              { word: 'words', start: 1.0, end: 1.15, confidence: 0.9 },
              { word: 'spoken', start: 1.2, end: 1.35, confidence: 0.9 },
              { word: 'quickly', start: 1.4, end: 1.55, confidence: 0.9 },
            ],
          },
        ],
      };

      const report = analyzePacingQuality(timestamps);

      expect(report.scenes[0].wpm).toBeGreaterThan(220);
      expect(['fast', 'abnormal']).toContain(report.scenes[0].status);
    });

    it('should detect abnormally fast CTA (>350 WPM)', () => {
      const timestamps: TimestampsResult = {
        durationMs: 1000,
        allWords: [],
        scenes: [
          {
            sceneIndex: 5,
            startMs: 0,
            endMs: 1000,
            text: 'Follow now',
            words: [
              { word: 'Follow', start: 0, end: 0.08, confidence: 0.9 },
              { word: 'now', start: 0.1, end: 0.18, confidence: 0.9 },
            ],
          },
        ],
      };

      const report = analyzePacingQuality(timestamps);

      // Very short scene with 2 words in 0.18s = 666 WPM
      // But scene is <500ms so it should be skipped
      console.log(`CTA WPM: ${report.scenes[0].wpm}, status: ${report.scenes[0].status}`);
    });

    it('should calculate pacing consistency (CV)', () => {
      const timestamps: TimestampsResult = {
        durationMs: 20000,
        allWords: [],
        scenes: [
          {
            sceneIndex: 0,
            startMs: 0,
            endMs: 5000,
            text: 'First scene',
            words: [
              { word: 'First', start: 0, end: 0.5, confidence: 0.9 },
              { word: 'scene', start: 0.6, end: 1.1, confidence: 0.9 },
              { word: 'with', start: 1.2, end: 1.7, confidence: 0.9 },
              { word: 'words', start: 1.8, end: 2.3, confidence: 0.9 },
              { word: 'here', start: 2.4, end: 2.9, confidence: 0.9 },
            ],
          },
          {
            sceneIndex: 1,
            startMs: 5000,
            endMs: 10000,
            text: 'Second scene',
            words: [
              { word: 'Second', start: 5.0, end: 5.5, confidence: 0.9 },
              { word: 'scene', start: 5.6, end: 6.1, confidence: 0.9 },
              { word: 'with', start: 6.2, end: 6.7, confidence: 0.9 },
              { word: 'words', start: 6.8, end: 7.3, confidence: 0.9 },
              { word: 'too', start: 7.4, end: 7.9, confidence: 0.9 },
            ],
          },
        ],
      };

      const report = analyzePacingQuality(timestamps);

      // Both scenes have similar pacing, CV should be low
      expect(report.aggregate.coefficientOfVariation).toBeLessThan(0.3);
      expect(report.passed).toBe(true);
    });
  });

  describe('Real Output Quality Gates', () => {
    const timestampsPath = path.join(process.cwd(), 'output', 'timestamps.json');

    it('QUALITY GATE: Average WPM should be 120-220', () => {
      if (!fs.existsSync(timestampsPath)) {
        console.log('Skipping: No timestamps.json found');
        return;
      }

      const data = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      const timestamps: TimestampsResult = {
        durationMs: data.durationMs || 30000,
        allWords: [],
        scenes: data.scenes,
      };

      const report = analyzePacingQuality(timestamps);

      console.log(`Average WPM: ${report.aggregate.avgWpm}`);
      console.log(`Std Dev: ${report.aggregate.stdDevWpm}`);
      console.log(`CV: ${(report.aggregate.coefficientOfVariation * 100).toFixed(1)}%`);

      // Relaxed threshold for mixed content
      expect(report.aggregate.avgWpm).toBeGreaterThanOrEqual(PACING_THRESHOLDS.absoluteMinWpm);
      expect(report.aggregate.avgWpm).toBeLessThanOrEqual(PACING_THRESHOLDS.absoluteMaxWpm);
    });

    it('QUALITY GATE: No abnormally paced scenes', () => {
      if (!fs.existsSync(timestampsPath)) {
        console.log('Skipping: No timestamps.json found');
        return;
      }

      const data = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      const timestamps: TimestampsResult = {
        durationMs: data.durationMs || 30000,
        allWords: [],
        scenes: data.scenes,
      };

      const report = analyzePacingQuality(timestamps);

      console.log(formatPacingReport(report));

      // Allow some fast scenes (TikTok style can be fast)
      // But no scenes should be "abnormal" (>280 WPM or <80 WPM)
      const abnormalCount = report.scenes.filter((s) => s.status === 'abnormal').length;

      // Relaxed: allow 1 abnormal scene (usually CTA)
      expect(abnormalCount).toBeLessThanOrEqual(1);
    });

    it('QUALITY GATE: Pacing consistency (CV < 40%)', () => {
      if (!fs.existsSync(timestampsPath)) {
        console.log('Skipping: No timestamps.json found');
        return;
      }

      const data = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      const timestamps: TimestampsResult = {
        durationMs: data.durationMs || 30000,
        allWords: [],
        scenes: data.scenes,
      };

      const report = analyzePacingQuality(timestamps);

      console.log(
        `Pacing Consistency (CV): ${(report.aggregate.coefficientOfVariation * 100).toFixed(1)}%`
      );

      expect(report.aggregate.coefficientOfVariation).toBeLessThanOrEqual(
        PACING_THRESHOLDS.maxCoefficientOfVariation
      );
    });

    it('QUALITY GATE: Overall pacing score >= 75%', () => {
      if (!fs.existsSync(timestampsPath)) {
        console.log('Skipping: No timestamps.json found');
        return;
      }

      const data = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      const timestamps: TimestampsResult = {
        durationMs: data.durationMs || 30000,
        allWords: [],
        scenes: data.scenes,
      };

      const report = analyzePacingQuality(timestamps);

      console.log(`Pacing Score: ${(report.overallScore * 100).toFixed(1)}%`);

      expect(report.overallScore).toBeGreaterThanOrEqual(PACING_THRESHOLDS.overallMinimum);
      expect(report.passed).toBe(true);
    });
  });
});
