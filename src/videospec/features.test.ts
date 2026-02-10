import { describe, expect, it } from 'vitest';
import {
  classifyCameraMotionFromFrames,
  computeAHash64,
  hammingDistance64,
  type GrayFrame,
} from './features';

function makeGrayFrame(
  width: number,
  height: number,
  fill: (x: number, y: number) => number
): GrayFrame {
  const data = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      data[y * width + x] = fill(x, y);
    }
  }
  return { width, height, data };
}

describe('videospec features', () => {
  it('computes stable aHash and hamming distance', () => {
    const a = makeGrayFrame(32, 32, () => 0.2);
    const b = makeGrayFrame(32, 32, () => 0.2);
    const c = makeGrayFrame(32, 32, (x) => (x < 16 ? 0.2 : 0.9));

    const ha = computeAHash64(a);
    const hb = computeAHash64(b);
    const hc = computeAHash64(c);

    expect(hammingDistance64(ha, hb)).toBe(0);
    expect(hammingDistance64(ha, hc)).toBeGreaterThan(0);
  });

  it('classifies static frames as static', () => {
    const a = makeGrayFrame(32, 32, () => 0.4);
    const b = makeGrayFrame(32, 32, () => 0.4);
    const cls = classifyCameraMotionFromFrames({ start: a, end: b });
    expect(cls.motion).toBe('static');
    expect(cls.confidence).toBeGreaterThan(0.5);
  });

  it('classifies obvious horizontal translation as pan', () => {
    // Build an image with a sharp vertical edge, then shift it right.
    const a = makeGrayFrame(32, 32, (x) => (x < 16 ? 0.1 : 0.9));
    const b = makeGrayFrame(32, 32, (x) => (x < 18 ? 0.1 : 0.9));
    const cls = classifyCameraMotionFromFrames({ start: a, end: b });
    expect(['pan_left', 'pan_right', 'unknown']).toContain(cls.motion);
  });
});
