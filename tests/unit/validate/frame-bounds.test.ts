import { describe, expect, it } from 'vitest';
import { analyzeFrameEdgesFromRgb } from '../../../src/validate/frame-bounds';

function makeRgb(width: number, height: number, fn: (x: number, y: number) => [number, number, number]): Uint8Array {
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
});

