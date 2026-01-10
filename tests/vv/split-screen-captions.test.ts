/**
 * V&V tests for split-screen captions placement.
 *
 * Goal: Captions should stay in a CapCut-like position relative to the full
 * video frame (not constrained to the top/bottom half container).
 */
import { describe, expect, it } from 'vitest';
import { computeSplitScreenLayout } from '../../src/render/remotion/split-screen-layout';

describe('V&V: split-screen captions placement', () => {
  it('keeps captions full-frame when content is on top', () => {
    const layout = computeSplitScreenLayout({
      height: 1920,
      ratio: 0.55,
      contentPosition: 'top',
      gameplayPosition: 'bottom',
    });

    expect(layout.captions.top).toBe(0);
    expect(layout.captions.height).toBe(1920);
    expect(layout.content.top).toBe(0);
    expect(layout.gameplay.top).toBeGreaterThan(0);
  });

  it('keeps captions full-frame when content is on bottom', () => {
    const layout = computeSplitScreenLayout({
      height: 1920,
      ratio: 0.55,
      contentPosition: 'bottom',
    });

    expect(layout.captions.top).toBe(0);
    expect(layout.captions.height).toBe(1920);
    expect(layout.gameplay.top).toBe(0);
    expect(layout.content.top).toBeGreaterThan(0);
  });
});

