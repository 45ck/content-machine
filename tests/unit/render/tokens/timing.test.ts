/**
 * Timing Tokens Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import { TIMING_MS, msToFrames, framesToMs } from '../../../../src/render/tokens/timing';

describe('TIMING_MS', () => {
  it('should export wordPop timing (100ms)', () => {
    expect(TIMING_MS.wordPop).toBe(100);
  });

  it('should export titleEntrance timing (280ms)', () => {
    expect(TIMING_MS.titleEntrance).toBe(280);
  });

  it('should export sceneTransition timing (400ms)', () => {
    expect(TIMING_MS.sceneTransition).toBe(400);
  });

  it('should export highlightTransition timing (100ms)', () => {
    expect(TIMING_MS.highlightTransition).toBe(100);
  });

  it('should export micro timing (50ms)', () => {
    expect(TIMING_MS.micro).toBe(50);
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(TIMING_MS)).toBe(true);
  });

  it('should have all timing values within research-backed range', () => {
    // Word pop should be 70-130ms per research
    expect(TIMING_MS.wordPop).toBeGreaterThanOrEqual(70);
    expect(TIMING_MS.wordPop).toBeLessThanOrEqual(130);

    // Title entrance should be 200-350ms per research
    expect(TIMING_MS.titleEntrance).toBeGreaterThanOrEqual(200);
    expect(TIMING_MS.titleEntrance).toBeLessThanOrEqual(350);
  });
});

describe('msToFrames', () => {
  it('should convert 1000ms to 30 frames at 30fps', () => {
    expect(msToFrames(1000, 30)).toBe(30);
  });

  it('should convert 100ms to 3 frames at 30fps', () => {
    expect(msToFrames(100, 30)).toBe(3);
  });

  it('should convert 1000ms to 60 frames at 60fps', () => {
    expect(msToFrames(1000, 60)).toBe(60);
  });

  it('should round to nearest frame', () => {
    // 33.33ms at 30fps = 1 frame
    expect(msToFrames(33, 30)).toBe(1);
    // 50ms at 30fps = 1.5 → rounds to 2
    expect(msToFrames(50, 30)).toBe(2);
  });

  it('should handle 0ms', () => {
    expect(msToFrames(0, 30)).toBe(0);
  });
});

describe('framesToMs', () => {
  it('should convert 30 frames to 1000ms at 30fps', () => {
    expect(framesToMs(30, 30)).toBe(1000);
  });

  it('should convert 3 frames to 100ms at 30fps', () => {
    expect(framesToMs(3, 30)).toBe(100);
  });

  it('should convert 60 frames to 1000ms at 60fps', () => {
    expect(framesToMs(60, 60)).toBe(1000);
  });

  it('should handle 0 frames', () => {
    expect(framesToMs(0, 30)).toBe(0);
  });
});
