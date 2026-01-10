/**
 * Audio Quality Metrics Tests
 *
 * PHOENIX LOOP #6 - Layer 5 (AUDIO)
 *
 * Tests for silence gaps, overlaps, pace consistency, and breathing room.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  analyzeAudioQuality,
  formatAudioReport,
  AUDIO_THRESHOLDS,
  type AudioQualityReport,
} from '../../../src/score/audio-quality';
import type { TimestampsOutput } from '../../../src/audio/schema';

const shouldRunRealOutput = process.env.CM_RUN_REAL_OUTPUT_TESTS === 'true';
const describeRealOutput = shouldRunRealOutput ? describe : describe.skip;

describe('Audio Quality Metrics', () => {
  describe('Unit Tests', () => {
    it('should detect unnatural silence gaps (>800ms)', () => {
      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0,
            audioEnd: 5,
            words: [
              { word: 'Hello', start: 0, end: 0.5, confidence: 0.9 },
              { word: 'world', start: 2.0, end: 2.5, confidence: 0.9 }, // 1500ms gap!
            ],
          },
        ],
        pages: [],
      };

      const report = analyzeAudioQuality(mockTimestamps);

      expect(report.metrics.silenceGaps).toBeLessThan(100);
      expect(report.issues.some((i) => i.type === 'silence-gap')).toBe(true);
    });

    it('should detect word overlaps', () => {
      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0,
            audioEnd: 2,
            words: [
              { word: 'Hello', start: 0, end: 0.6, confidence: 0.9 },
              { word: 'world', start: 0.5, end: 1.0, confidence: 0.9 }, // Overlaps by 100ms!
            ],
          },
        ],
        pages: [],
      };

      const report = analyzeAudioQuality(mockTimestamps);

      expect(report.metrics.overlapFree).toBeLessThan(100);
      expect(report.details.overlapsFound).toBe(1);
      expect(report.issues.some((i) => i.type === 'word-overlap')).toBe(true);
    });

    it('should detect missing pauses after punctuation', () => {
      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0,
            audioEnd: 3,
            words: [
              { word: 'Hello.', start: 0, end: 0.5, confidence: 0.9 },
              { word: 'World', start: 0.55, end: 1.0, confidence: 0.9 }, // Only 50ms gap after period!
            ],
          },
        ],
        pages: [],
      };

      const report = analyzeAudioQuality(mockTimestamps);

      expect(report.details.expectedPauses).toBe(1);
      expect(report.details.pausesFound).toBe(0);
      expect(report.issues.some((i) => i.type === 'missing-pause')).toBe(true);
    });

    it('should give 100% for proper pauses after punctuation', () => {
      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0,
            audioEnd: 3,
            words: [
              { word: 'Hello.', start: 0, end: 0.5, confidence: 0.9 },
              { word: 'World', start: 0.8, end: 1.3, confidence: 0.9 }, // 300ms gap after period
            ],
          },
        ],
        pages: [],
      };

      const report = analyzeAudioQuality(mockTimestamps);

      expect(report.details.expectedPauses).toBe(1);
      expect(report.details.pausesFound).toBe(1);
      expect(report.metrics.breathingRoom).toBe(100);
    });

    it('should detect abrupt scene transitions', () => {
      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0,
            audioEnd: 1,
            words: [{ word: 'End', start: 0.8, end: 1.0, confidence: 0.9 }],
          },
          {
            sceneId: 'scene-2',
            audioStart: 1,
            audioEnd: 2,
            words: [{ word: 'Start', start: 1.02, end: 1.3, confidence: 0.9 }], // Only 20ms gap!
          },
        ],
        pages: [],
      };

      const report = analyzeAudioQuality(mockTimestamps);

      expect(report.details.abruptTransitions).toBe(1);
      expect(report.issues.some((i) => i.type === 'abrupt-transition')).toBe(true);
    });

    it('should give 100% for healthy audio', () => {
      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0,
            audioEnd: 5,
            words: [
              { word: 'Hello,', start: 0, end: 0.4, confidence: 0.9 },
              { word: 'how', start: 0.5, end: 0.7, confidence: 0.9 },
              { word: 'are', start: 0.8, end: 0.95, confidence: 0.9 },
              { word: 'you?', start: 1.0, end: 1.3, confidence: 0.9 },
              { word: 'I', start: 1.6, end: 1.7, confidence: 0.9 }, // Good pause after ?
              { word: 'am', start: 1.75, end: 1.9, confidence: 0.9 },
              { word: 'fine.', start: 1.95, end: 2.2, confidence: 0.9 },
            ],
          },
          {
            sceneId: 'scene-2',
            audioStart: 2.5,
            audioEnd: 5,
            words: [
              { word: 'Next', start: 2.5, end: 2.7, confidence: 0.9 }, // 300ms gap after scene
              { word: 'scene', start: 2.8, end: 3.0, confidence: 0.9 },
              { word: 'starts.', start: 3.1, end: 3.4, confidence: 0.9 },
            ],
          },
        ],
        pages: [],
      };

      const report = analyzeAudioQuality(mockTimestamps);

      expect(report.metrics.overlapFree).toBe(100);
      expect(report.overallScore).toBeGreaterThanOrEqual(80);
    });
  });

  describeRealOutput('Real Output Quality Gates', () => {
    let timestamps: TimestampsOutput;
    let report: AudioQualityReport;

    beforeAll(() => {
      const timestampsPath = path.join(process.cwd(), 'output', 'timestamps.json');

      if (!fs.existsSync(timestampsPath)) {
        console.log('Skipping real output tests - file not found');
        return;
      }

      timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      report = analyzeAudioQuality(timestamps);
    });

    it('QUALITY GATE: No word overlaps', () => {
      if (!report) return;

      console.log(`Overlaps found: ${report.details.overlapsFound}`);

      expect(report.details.overlapsFound).toBe(0);
      expect(report.metrics.overlapFree).toBe(100);
    });

    it('QUALITY GATE: No extreme silence gaps (>1500ms)', () => {
      if (!report) return;

      console.log(`Max gap: ${report.details.maxGapMs.toFixed(0)}ms`);
      console.log(`Avg gap: ${report.details.avgGapMs.toFixed(0)}ms`);

      expect(report.details.maxGapMs).toBeLessThan(
        AUDIO_THRESHOLDS.extremeGapMs
      );
    });

    it('QUALITY GATE: Breathing room at punctuation >= 50%', () => {
      if (!report) return;

      console.log(
        `Pauses: ${report.details.pausesFound}/${report.details.expectedPauses}`
      );
      console.log(`Breathing room score: ${report.metrics.breathingRoom}%`);

      expect(report.metrics.breathingRoom).toBeGreaterThanOrEqual(50);
    });

    it('QUALITY GATE: Scene transitions are smooth', () => {
      if (!report) return;

      console.log(`Scene transitions: ${report.details.sceneTransitions}`);
      console.log(`Abrupt transitions: ${report.details.abruptTransitions}`);

      expect(report.metrics.transitionSmoothness).toBeGreaterThanOrEqual(60);
    });

    it('QUALITY GATE: Overall audio score >= 70%', () => {
      if (!report) return;

      console.log('\n' + formatAudioReport(report));

      expect(report.overallScore).toBeGreaterThanOrEqual(70);
    });
  });
});
