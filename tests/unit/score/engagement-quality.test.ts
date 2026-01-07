/**
 * Engagement Quality Metrics Tests
 *
 * PHOENIX LOOP #5 - Layer 4 (ENGAGEMENT)
 *
 * Tests for hook timing, CTA presence, list structure, and scene progression.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  analyzeEngagementQuality,
  formatEngagementReport,
  ENGAGEMENT_THRESHOLDS,
  type EngagementQualityReport,
} from '../../../src/score/engagement-quality';
import type { ScriptOutput } from '../../../src/script/schema';
import type { TimestampsOutput } from '../../../src/audio/schema';

describe('Engagement Quality Metrics', () => {
  describe('Unit Tests', () => {
    it('should detect hook starting after 3 seconds', () => {
      const mockScript: ScriptOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          { id: 'scene-1', text: 'Welcome to the video', visualDirection: '', mood: '' },
        ],
        title: 'Test',
        hook: 'Welcome to the video',
        cta: 'Follow!',
        hashtags: [],
        reasoning: '',
      };

      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 4.0, // Late start!
            audioEnd: 8.0,
            words: [
              { word: 'Welcome', start: 4.0, end: 4.5, confidence: 0.9 },
              { word: 'to', start: 4.5, end: 4.7, confidence: 0.9 },
              { word: 'the', start: 4.7, end: 4.9, confidence: 0.9 },
              { word: 'video', start: 4.9, end: 5.5, confidence: 0.9 },
            ],
          },
        ],
        pages: [],
      };

      const report = analyzeEngagementQuality(mockScript, mockTimestamps);

      expect(report.metrics.hookTiming).toBeLessThan(100);
      expect(report.issues.some((i) => i.type === 'late-hook')).toBe(true);
    });

    it('should give high engagement score for question hooks', () => {
      const mockScript: ScriptOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          { id: 'scene-1', text: 'Want to know a secret?', visualDirection: '', mood: '' },
        ],
        title: 'Test',
        hook: 'Want to know a secret?',
        cta: '',
        hashtags: [],
        reasoning: '',
      };

      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0.1,
            audioEnd: 2.0,
            words: [
              { word: 'Want', start: 0.1, end: 0.3, confidence: 0.9 },
              { word: 'to', start: 0.3, end: 0.4, confidence: 0.9 },
              { word: 'know', start: 0.4, end: 0.6, confidence: 0.9 },
              { word: 'a', start: 0.6, end: 0.7, confidence: 0.9 },
              { word: 'secret?', start: 0.7, end: 1.0, confidence: 0.9 },
            ],
          },
        ],
        pages: [],
      };

      const report = analyzeEngagementQuality(mockScript, mockTimestamps);

      // Should score higher because:
      // - Starts with "Want"
      // - Ends with "?"
      // - Short hook (5 words)
      expect(report.metrics.hookEngagement).toBeGreaterThanOrEqual(75);
    });

    it('should detect missing CTA', () => {
      const mockScript: ScriptOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          { id: 'scene-1', text: 'That is all', visualDirection: '', mood: '' },
        ],
        title: 'Test',
        hook: 'Hook',
        cta: 'That is all', // No CTA patterns
        hashtags: [],
        reasoning: '',
      };

      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 0.1,
            audioEnd: 2.0,
            words: [{ word: 'That', start: 0.1, end: 0.5, confidence: 0.9 }],
          },
        ],
        pages: [],
      };

      const report = analyzeEngagementQuality(mockScript, mockTimestamps);

      expect(report.metrics.ctaPresence).toBe(0);
      expect(report.issues.some((i) => i.type === 'missing-cta')).toBe(true);
    });

    it('should detect good CTA', () => {
      const mockScript: ScriptOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          { id: 'scene-1', text: 'Follow for more tips!', visualDirection: '', mood: '' },
        ],
        title: 'Test',
        hook: 'Hook',
        cta: 'Follow for more tips!',
        hashtags: [],
        reasoning: '',
      };

      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          {
            sceneId: 'scene-1',
            audioStart: 20.0,
            audioEnd: 23.0,
            words: [{ word: 'Follow', start: 20.0, end: 20.5, confidence: 0.9 }],
          },
        ],
        pages: [],
      };

      const report = analyzeEngagementQuality(mockScript, mockTimestamps);

      // "Follow" and "more tips" should match patterns
      expect(report.metrics.ctaPresence).toBeGreaterThan(50);
    });

    it('should detect numbered items in listicles', () => {
      const mockScript: ScriptOutput = {
        schemaVersion: '1.0.0',
        scenes: [
          { id: 'intro', text: 'Here are 3 tips', visualDirection: '', mood: '' },
          { id: 'tip1', text: 'Number 1: First tip', visualDirection: '', mood: '' },
          { id: 'tip2', text: 'Number 2: Second tip', visualDirection: '', mood: '' },
          { id: 'tip3', text: 'Number 3: Third tip', visualDirection: '', mood: '' },
          { id: 'outro', text: 'Follow for more!', visualDirection: '', mood: '' },
        ],
        title: 'Test',
        hook: 'Here are 3 tips',
        cta: 'Follow for more!',
        hashtags: [],
        reasoning: '',
        meta: { archetype: 'listicle' } as ScriptOutput['meta'],
      };

      const mockTimestamps: TimestampsOutput = {
        schemaVersion: '1.0.0',
        scenes: mockScript.scenes.map((s, i) => ({
          sceneId: s.id,
          audioStart: i * 5,
          audioEnd: i * 5 + 4,
          words: [{ word: 'Word', start: i * 5, end: i * 5 + 1, confidence: 0.9 }],
        })),
        pages: [],
      };

      const report = analyzeEngagementQuality(mockScript, mockTimestamps);

      expect(report.details.numberedItems).toBe(3);
      expect(report.metrics.listStructure).toBeGreaterThanOrEqual(75);
    });
  });

  describe('Real Output Quality Gates', () => {
    let script: ScriptOutput;
    let timestamps: TimestampsOutput;
    let report: EngagementQualityReport;

    beforeAll(() => {
      const scriptPath = path.join(process.cwd(), 'output', 'script.json');
      const timestampsPath = path.join(process.cwd(), 'output', 'timestamps.json');

      if (!fs.existsSync(scriptPath) || !fs.existsSync(timestampsPath)) {
        console.log('Skipping real output tests - files not found');
        return;
      }

      script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
      timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf-8'));
      report = analyzeEngagementQuality(script, timestamps);
    });

    it('QUALITY GATE: Hook should start within 3 seconds', () => {
      if (!report) return;

      console.log(`Hook starts at: ${report.details.hookStartTime.toFixed(2)}s`);
      console.log(`Hook text: "${report.details.hookText}"`);

      expect(report.details.hookStartTime).toBeLessThanOrEqual(
        ENGAGEMENT_THRESHOLDS.hookMaxStartTime
      );
      expect(report.metrics.hookTiming).toBe(100);
    });

    it('QUALITY GATE: Hook should be engaging (questions/pain points)', () => {
      if (!report) return;

      console.log(`Hook engagement score: ${report.metrics.hookEngagement}%`);

      expect(report.metrics.hookEngagement).toBeGreaterThanOrEqual(60);
    });

    it('QUALITY GATE: CTA should be present', () => {
      if (!report) return;

      console.log(`CTA: "${report.details.ctaText}"`);
      console.log(`CTA presence score: ${report.metrics.ctaPresence}%`);

      expect(report.metrics.ctaPresence).toBeGreaterThan(0);
    });

    it('QUALITY GATE: Listicle should have numbered items', () => {
      if (!report) return;
      if (report.details.archetype !== 'listicle') {
        console.log('Skipping - not a listicle');
        return;
      }

      console.log(`Numbered items: ${report.details.numberedItems}`);
      console.log(`List structure score: ${report.metrics.listStructure}%`);

      expect(report.details.numberedItems).toBeGreaterThanOrEqual(3);
      expect(report.metrics.listStructure).toBeGreaterThanOrEqual(75);
    });

    it('QUALITY GATE: Overall engagement score >= 70%', () => {
      if (!report) return;

      console.log('\n' + formatEngagementReport(report));

      expect(report.overallScore).toBeGreaterThanOrEqual(70);
    });
  });
});
