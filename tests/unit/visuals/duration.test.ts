/**
 * Visual Duration Coverage Tests
 *
 * TDD tests for ensuring visual scenes cover the full audio duration.
 * Prevents the v3 bug where scenes ended at 20.32s but audio continued to 25.22s.
 *
 * @see docs/research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260610.md
 */
import { describe, it, expect } from 'vitest';
import {
  ensureVisualCoverage,
  calculateVisualGap,
  type VisualScene,
} from '../../../src/visuals/duration';

describe('calculateVisualGap', () => {
  it('returns 0 when scenes perfectly cover audio duration', () => {
    const scenes: VisualScene[] = [
      { startMs: 0, endMs: 5000, url: 'video1.mp4' },
      { startMs: 5000, endMs: 10000, url: 'video2.mp4' },
    ];
    const audioDurationMs = 10000;

    expect(calculateVisualGap(scenes, audioDurationMs)).toBe(0);
  });

  it('returns positive gap when scenes end before audio', () => {
    const scenes: VisualScene[] = [{ startMs: 0, endMs: 5000, url: 'video1.mp4' }];
    const audioDurationMs = 10000;

    expect(calculateVisualGap(scenes, audioDurationMs)).toBe(5000);
  });

  it('returns the exact gap from v3 render failure', () => {
    // From visuals.json: last scene ends at 20.32s
    // From timestamps.json: total duration is 25.22s
    const scenes: VisualScene[] = [{ startMs: 0, endMs: 20320, url: 'video.mp4' }];
    const audioDurationMs = 25220;

    expect(calculateVisualGap(scenes, audioDurationMs)).toBe(4900); // ~4.9s gap
  });

  it('handles empty scenes array', () => {
    expect(calculateVisualGap([], 10000)).toBe(10000);
  });
});

describe('ensureVisualCoverage', () => {
  describe('when scenes already cover audio', () => {
    it('returns scenes unchanged', () => {
      const scenes: VisualScene[] = [
        { startMs: 0, endMs: 5000, url: 'video1.mp4' },
        { startMs: 5000, endMs: 10000, url: 'video2.mp4' },
      ];
      const audioDurationMs = 10000;

      const result = ensureVisualCoverage(scenes, audioDurationMs);

      expect(result).toEqual(scenes);
      expect(result.length).toBe(2);
    });
  });

  describe('when scenes end before audio (the v3 bug)', () => {
    it('extends the last scene to cover the gap', () => {
      const scenes: VisualScene[] = [
        { startMs: 0, endMs: 5000, url: 'video1.mp4' },
        { startMs: 5000, endMs: 9000, url: 'video2.mp4' }, // 4s scene, 1s gap = 25% extension
      ];
      const audioDurationMs = 10000;

      const result = ensureVisualCoverage(scenes, audioDurationMs);

      expect(result.length).toBe(2);
      expect(result[1].endMs).toBe(10000); // Extended to match audio
    });

    it('loops the last video when extending beyond 1.5x original duration', () => {
      const scenes: VisualScene[] = [
        { startMs: 0, endMs: 3000, url: 'short-video.mp4', durationMs: 3000 },
      ];
      const audioDurationMs = 10000; // Need 10s but video is only 3s

      const result = ensureVisualCoverage(scenes, audioDurationMs);

      // Should create multiple loops of the last video
      expect(result.length).toBeGreaterThan(1);
      const lastScene = result[result.length - 1];
      expect(lastScene.endMs).toBe(10000);
    });

    it('adds fallback color scene when no video exists', () => {
      const scenes: VisualScene[] = [{ startMs: 0, endMs: 5000, url: null }];
      const audioDurationMs = 10000;
      const fallbackColor = '#1a1a1a';

      const result = ensureVisualCoverage(scenes, audioDurationMs, {
        fallbackColor,
      });

      expect(result.length).toBe(2);
      expect(result[1]).toEqual({
        startMs: 5000,
        endMs: 10000,
        url: null, // No video
        backgroundColor: fallbackColor,
      });
    });

    it('can force fallback even when video exists', () => {
      const scenes: VisualScene[] = [{ startMs: 0, endMs: 5000, url: 'video1.mp4' }];
      const audioDurationMs = 10000;
      const fallbackColor = '#1a1a1a';

      const result = ensureVisualCoverage(scenes, audioDurationMs, {
        fallbackColor,
        useFallbackColor: true,
      });

      expect(result.length).toBe(2);
      expect(result[1]).toEqual({
        startMs: 5000,
        endMs: 10000,
        url: null,
        backgroundColor: fallbackColor,
      });
    });
  });

  describe('v3 regression case: exact data from render failure', () => {
    it('fixes the exact gap from v3 render', () => {
      // Simplified version of the actual visuals.json scenes
      const scenes: VisualScene[] = [
        { startMs: 0, endMs: 3400, url: 'pexels-1.mp4' },
        { startMs: 3400, endMs: 6800, url: 'pexels-2.mp4' },
        { startMs: 6800, endMs: 10200, url: 'pexels-3.mp4' },
        { startMs: 10200, endMs: 13600, url: 'pexels-4.mp4' },
        { startMs: 13600, endMs: 17000, url: 'pexels-5.mp4' },
        { startMs: 17000, endMs: 20320, url: 'pexels-6.mp4' }, // Last scene
      ];
      const audioDurationMs = 25220; // Actual audio duration

      const result = ensureVisualCoverage(scenes, audioDurationMs);

      // Verify full coverage
      const lastScene = result[result.length - 1];
      expect(lastScene.endMs).toBe(25220);

      // Verify no gaps in middle
      for (let i = 1; i < result.length; i++) {
        expect(result[i].startMs).toBe(result[i - 1].endMs);
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty scenes by creating single fallback scene', () => {
      const result = ensureVisualCoverage([], 10000, {
        fallbackColor: '#000000',
      });

      expect(result.length).toBe(1);
      expect(result[0]).toEqual({
        startMs: 0,
        endMs: 10000,
        url: null,
        backgroundColor: '#000000',
      });
    });

    it('handles audioDuration of 0', () => {
      const scenes: VisualScene[] = [{ startMs: 0, endMs: 5000, url: 'video.mp4' }];

      const result = ensureVisualCoverage(scenes, 0);
      expect(result).toEqual(scenes);
    });

    it('handles scenes that exceed audio duration (trims last scene)', () => {
      const scenes: VisualScene[] = [{ startMs: 0, endMs: 15000, url: 'video.mp4' }];
      const audioDurationMs = 10000;

      const result = ensureVisualCoverage(scenes, audioDurationMs);

      expect(result[0].endMs).toBe(10000); // Trimmed to audio duration
    });
  });
});

describe('VisualScene interface', () => {
  it('supports required properties', () => {
    const scene: VisualScene = {
      startMs: 0,
      endMs: 5000,
      url: 'video.mp4',
    };

    expect(scene.startMs).toBe(0);
    expect(scene.endMs).toBe(5000);
    expect(scene.url).toBe('video.mp4');
  });

  it('supports optional properties', () => {
    const scene: VisualScene = {
      startMs: 0,
      endMs: 5000,
      url: null,
      backgroundColor: '#1a1a1a',
      durationMs: 5000,
    };

    expect(scene.backgroundColor).toBe('#1a1a1a');
    expect(scene.durationMs).toBe(5000);
  });
});
