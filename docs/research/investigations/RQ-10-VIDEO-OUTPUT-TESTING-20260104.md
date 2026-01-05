# RQ-10: Video Output Correctness Testing

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P0  
**Question:** How do we verify video output correctness in automated tests?

---

## 1. Problem Statement

Video rendering is non-trivial to test. We need strategies to:

- Detect regressions in video quality
- Ensure deterministic outputs for snapshot testing
- Validate metadata (resolution, duration, codec)
- Measure visual quality objectively

---

## 2. Vendor Evidence

### 2.1 Remotion's Testing Philosophy

**Source:** [vendor/remotion/packages/docs/docs/testing.mdx](../../../vendor/remotion/packages/docs/docs/testing.mdx)

Remotion provides multiple testing approaches:

```typescript
// 1. Component testing (no rendering)
import { render } from "@testing-library/react";
import { MySequence } from "./MySequence";

test("renders scene text", () => {
  const { getByText } = render(<MySequence text="Hello" />);
  expect(getByText("Hello")).toBeInTheDocument();
});

// 2. Screenshot comparison
import { renderFrames } from "@remotion/renderer";

test("frame 50 matches snapshot", async () => {
  await renderFrames({
    composition: myComp,
    frames: [50],
    outputDir: "./test-output",
  });

  const frame = await fs.readFile("./test-output/frame-50.png");
  expect(frame).toMatchImageSnapshot();
});
```

### 2.2 Determinism Requirement

**Critical Finding:** Remotion provides an ESLint rule to enforce deterministic outputs.

**Source:** [vendor/remotion/packages/eslint-plugin](../../../vendor/remotion/packages/eslint-plugin)

```typescript
// eslint-plugin-remotion
{
  "rules": {
    "@remotion/deterministic-randomness": "error"
  }
}

// ❌ BAD: Non-deterministic
const color = Math.random() > 0.5 ? "red" : "blue";

// ✅ GOOD: Deterministic (seeded)
import { random } from "remotion";
const color = random("color-seed") > 0.5 ? "red" : "blue";
```

### 2.3 ffprobe for Metadata Validation

**Source:** [vendor/remotion/packages/renderer/src/validate-output-filename.ts](../../../vendor/remotion/packages/renderer/src/validate-output-filename.ts)

```typescript
import { execa } from 'execa';

interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  fps: number;
  codec: string;
}

async function getVideoMetadata(videoPath: string): Promise<VideoMetadata> {
  const { stdout } = await execa('ffprobe', [
    '-v',
    'quiet',
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    videoPath,
  ]);

  const data = JSON.parse(stdout);
  const videoStream = data.streams.find((s: any) => s.codec_type === 'video');

  return {
    width: videoStream.width,
    height: videoStream.height,
    duration: parseFloat(data.format.duration),
    fps: eval(videoStream.r_frame_rate), // "30/1" → 30
    codec: videoStream.codec_name,
  };
}
```

### 2.4 Visual Comparison Metrics

**Source:** Various vendor implementations reference FFmpeg quality metrics.

```bash
# PSNR (Peak Signal-to-Noise Ratio) - fastest
ffmpeg -i reference.mp4 -i output.mp4 -lavfi psnr -f null -

# SSIM (Structural Similarity Index) - medium speed
ffmpeg -i reference.mp4 -i output.mp4 -lavfi ssim -f null -

# VMAF (Video Multi-Method Assessment Fusion) - slowest, most accurate
ffmpeg -i reference.mp4 -i output.mp4 -lavfi libvmaf -f null -
```

### 2.5 Playwright Screenshot Testing

**Source:** [vendor/capture/playwright](../../../vendor/capture/playwright)

Playwright's visual comparison approach:

```typescript
import { test, expect } from '@playwright/test';

test('video player matches baseline', async ({ page }) => {
  await page.goto('http://localhost:3000/preview/my-video');
  await page.waitForTimeout(1000); // Wait for render

  // Take screenshot and compare
  await expect(page).toHaveScreenshot('video-frame.png', {
    maxDiffPixels: 100, // Allow small differences
    threshold: 0.2, // 20% pixel difference tolerance
  });
});
```

---

## 3. Testing Levels

### 3.1 Unit Tests (Component Level)

```typescript
// test/unit/Caption.test.tsx
import { render } from "@testing-library/react";
import { Caption } from "../src/components/Caption";

describe("Caption Component", () => {
  it("renders text with correct styling", () => {
    const { container } = render(
      <Caption text="Hello" style="word" />
    );

    expect(container.querySelector(".caption-word")).toHaveTextContent("Hello");
  });

  it("handles special characters", () => {
    const { getByText } = render(
      <Caption text="Don't & Can't" style="word" />
    );

    expect(getByText("Don't & Can't")).toBeInTheDocument();
  });
});
```

### 3.2 Frame Snapshot Tests

```typescript
// test/integration/rendering.test.ts
import { renderFrames, getCompositions } from '@remotion/renderer';
import { toMatchImageSnapshot } from 'jest-image-snapshot';

expect.extend({ toMatchImageSnapshot });

describe('Video Rendering', () => {
  it('renders frame 0 correctly', async () => {
    const compositions = await getCompositions('./src/index.ts');
    const comp = compositions.find((c) => c.id === 'main');

    await renderFrames({
      composition: comp,
      outputDir: './test-output',
      frames: [0],
    });

    const frame = await fs.readFile('./test-output/element-0.png');
    expect(frame).toMatchImageSnapshot({
      failureThreshold: 0.01,
      failureThresholdType: 'percent',
    });
  });

  it('renders last frame correctly', async () => {
    const compositions = await getCompositions('./src/index.ts');
    const comp = compositions.find((c) => c.id === 'main');

    await renderFrames({
      composition: comp,
      outputDir: './test-output',
      frames: [comp.durationInFrames - 1],
    });

    const frame = await fs.readFile('./test-output/element-0.png');
    expect(frame).toMatchImageSnapshot();
  });
});
```

### 3.3 Metadata Validation Tests

```typescript
// test/integration/metadata.test.ts
describe('Video Metadata', () => {
  const testVideo = './test-fixtures/output.mp4';

  beforeAll(async () => {
    await renderVideo({ outputPath: testVideo });
  });

  it('has correct resolution', async () => {
    const meta = await getVideoMetadata(testVideo);
    expect(meta.width).toBe(1080);
    expect(meta.height).toBe(1920);
  });

  it('has correct duration', async () => {
    const meta = await getVideoMetadata(testVideo);
    expect(meta.duration).toBeCloseTo(15.0, 1); // 15 seconds ±0.1
  });

  it('uses expected codec', async () => {
    const meta = await getVideoMetadata(testVideo);
    expect(meta.codec).toBe('h264');
  });

  it('has expected frame rate', async () => {
    const meta = await getVideoMetadata(testVideo);
    expect(meta.fps).toBe(30);
  });
});
```

### 3.4 Quality Metric Tests

```typescript
// test/integration/quality.test.ts
import { computePSNR, computeSSIM } from './video-metrics';

describe('Video Quality', () => {
  const reference = './test-fixtures/reference.mp4';
  const output = './test-output/output.mp4';

  it('meets PSNR threshold', async () => {
    const psnr = await computePSNR(reference, output);
    expect(psnr).toBeGreaterThan(30); // 30dB minimum
  });

  it('meets SSIM threshold', async () => {
    const ssim = await computeSSIM(reference, output);
    expect(ssim).toBeGreaterThan(0.9); // 90% similarity
  });
});
```

---

## 4. Quality Metric Thresholds

| Metric   | Excellent | Good   | Acceptable | Poor   |
| -------- | --------- | ------ | ---------- | ------ |
| **PSNR** | >40 dB    | >35 dB | >30 dB     | <30 dB |
| **SSIM** | >0.98     | >0.95  | >0.90      | <0.90  |
| **VMAF** | >90       | >80    | >70        | <70    |

---

## 5. Recommended Implementation

### 5.1 Test Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.ts', 'test/integration/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 60000, // Video rendering needs time
    snapshotFormat: {
      printBasicPrototype: false,
    },
  },
});
```

### 5.2 Video Metrics Helper

```typescript
// test/helpers/video-metrics.ts
import { execa } from 'execa';

export async function computePSNR(reference: string, output: string): Promise<number> {
  const { stderr } = await execa('ffmpeg', [
    '-i',
    reference,
    '-i',
    output,
    '-lavfi',
    'psnr',
    '-f',
    'null',
    '-',
  ]);

  // Parse: PSNR y:38.25 u:43.12 v:44.56 average:39.58
  const match = stderr.match(/average:([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

export async function computeSSIM(reference: string, output: string): Promise<number> {
  const { stderr } = await execa('ffmpeg', [
    '-i',
    reference,
    '-i',
    output,
    '-lavfi',
    'ssim',
    '-f',
    'null',
    '-',
  ]);

  // Parse: SSIM All:0.954678
  const match = stderr.match(/All:([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}
```

### 5.3 Determinism Enforcement

```json
// .eslintrc.json
{
  "extends": ["@remotion"],
  "rules": {
    "@remotion/deterministic-randomness": "error",
    "@remotion/no-string-assets": "warn"
  }
}
```

### 5.4 CI Pipeline Test Matrix

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:unit

  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:visual
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diffs
          path: test/__image_snapshots__/__diff_output__/

  render-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm test:render
```

---

## 6. Implementation Recommendations

| Test Type           | Priority | CI Stage     | Speed  |
| ------------------- | -------- | ------------ | ------ |
| Unit tests          | P0       | Every commit | Fast   |
| Metadata validation | P0       | Every commit | Fast   |
| Frame snapshots     | P1       | PR merge     | Medium |
| Quality metrics     | P2       | Nightly      | Slow   |

---

## 7. References

- [vendor/remotion/packages/docs/docs/testing.mdx](../../../vendor/remotion/packages/docs/docs/testing.mdx) — Remotion testing docs
- [vendor/remotion/packages/eslint-plugin](../../../vendor/remotion/packages/eslint-plugin) — Determinism rules
- [FFmpeg Filter Documentation](https://ffmpeg.org/ffmpeg-filters.html) — PSNR/SSIM/VMAF
- [jest-image-snapshot](https://github.com/americanexpress/jest-image-snapshot) — Visual comparison
- [SECTION-VIDEO-RENDERING-20260104.md](../sections/SECTION-VIDEO-RENDERING-20260104.md) — Rendering pipeline
