import { describe, expect, it } from 'vitest';
import { analyzeFrameEdgesFromRgb, runFrameBoundsGate } from '../../../src/validate/frame-bounds';

function makeRgb(
  width: number,
  height: number,
  fn: (x: number, y: number) => [number, number, number]
): Uint8Array {
  const data = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * width + x) * 3;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }
  return data;
}

describe('frame-bounds', () => {
  it('detects dark border relative to inner area', () => {
    const width = 200;
    const height = 120;
    const border = 6;
    const data = makeRgb(width, height, (x, y) => {
      const isBorder = x < border || x >= width - border || y < border || y >= height - border;
      return isBorder ? [0, 0, 0] : [40, 60, 80];
    });

    const sides = analyzeFrameEdgesFromRgb({
      width,
      height,
      data,
      borderRatio: border / Math.min(width, height),
      brightLuma: 0.78,
      chromaSat: 0.42,
      sampleStepPx: 1,
    });

    expect(sides.top.meanLumaInner).toBeGreaterThan(sides.top.meanLumaBorder);
    expect(sides.left.meanLumaInner).toBeGreaterThan(sides.left.meanLumaBorder);
  });

  it('detects colorful content touching border', () => {
    const width = 220;
    const height = 140;
    const border = 8;
    const data = makeRgb(width, height, (x, y) => {
      const isTopBorder = y < border;
      // Bright cyan at the very top edge.
      if (isTopBorder) return [40, 220, 240];
      return [10, 10, 12];
    });

    const sides = analyzeFrameEdgesFromRgb({
      width,
      height,
      data,
      borderRatio: border / Math.min(width, height),
      brightLuma: 0.78,
      chromaSat: 0.42,
      sampleStepPx: 1,
    });

    expect(sides.top.chromaRatioBorder).toBeGreaterThan(0.5);
  });

  it('does not fail edge-only content when darkening is negligible', () => {
    const gate = runFrameBoundsGate({
      schemaVersion: '1.0.0',
      videoPath: 'test.mp4',
      frames: [],
      thresholds: {
        borderRatio: 0.01,
        maxDarkening: 0.12,
        maxEdgeContentRatio: 0.035,
        brightLuma: 0.78,
        chromaSat: 0.42,
      },
      worst: {
        maxDarkening: 0.002,
        maxEdgeContentRatio: 0.09,
        side: 'right',
        timestampSeconds: 12,
      },
    });

    expect(gate.passed).toBe(true);
  });

  it('fails edge content when darkening indicates frame-bound issue', () => {
    const gate = runFrameBoundsGate({
      schemaVersion: '1.0.0',
      videoPath: 'test.mp4',
      frames: [],
      thresholds: {
        borderRatio: 0.01,
        maxDarkening: 0.12,
        maxEdgeContentRatio: 0.035,
        brightLuma: 0.78,
        chromaSat: 0.42,
      },
      worst: {
        maxDarkening: 0.05,
        maxEdgeContentRatio: 0.09,
        side: 'right',
        timestampSeconds: 12,
      },
    });

    expect(gate.passed).toBe(false);
  });
});
