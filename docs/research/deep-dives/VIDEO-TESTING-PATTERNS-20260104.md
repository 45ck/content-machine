# Video Output Testing Patterns for Video Generation Pipelines

**Date:** 2026-01-04  
**Status:** Research Complete  
**Sources:** vendor/render/remotion, vendor/video-processing, vendor/captacity, templates/template-tiktok-base

---

## Executive Summary

This research documents testing patterns for validating video output in video generation pipelines. Key findings:

1. **Remotion has built-in visual snapshot testing** using Vitest + Playwright for frame comparison
2. **FFmpeg provides PSNR/SSIM metrics** for objective video quality measurement
3. **ffprobe is the standard tool** for metadata validation (duration, resolution, codec)
4. **Deterministic rendering requires avoiding `Math.random()`** - Remotion provides `random()` API with seed support
5. **Caption testing uses structured data validation** rather than visual comparison

---

## 1. Frame Snapshot Testing (Visual Regression)

### Remotion's Web Renderer Approach

Remotion uses Vitest with Playwright for visual snapshot testing. Screenshots are compared against golden images stored per-browser.

**File:** [vendor/render/remotion/packages/web-renderer/src/test/utils.ts](../../vendor/render/remotion/packages/web-renderer/src/test/utils.ts)

```typescript
import { expect, onTestFinished } from 'vitest';
import { page } from 'vitest/browser';

export const testImage = async ({
  blob,
  testId,
  threshold = 0.15,
  allowedMismatchedPixelRatio = 0.001,
}: {
  blob: Blob;
  testId: string;
  threshold?: number;
  allowedMismatchedPixelRatio?: number;
}) => {
  const img = document.createElement('img');
  img.src = URL.createObjectURL(blob);
  img.dataset.testid = testId;
  document.body.appendChild(img);

  onTestFinished(() => {
    document.body.removeChild(img);
  });

  // Wait for image to load
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Image failed to load'));
  });

  // Compare against golden screenshot
  await expect(page.getByTestId(testId)).toMatchScreenshot(testId, {
    comparatorOptions: {
      threshold,
      allowedMismatchedPixelRatio,
    },
  });
};
```

### Vitest Config for Visual Testing

**File:** [vendor/render/remotion/packages/web-renderer/vitest.config.ts](../../vendor/render/remotion/packages/web-renderer/vitest.config.ts)

```typescript
import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: playwright(),
      instances: [
        { browser: 'chromium', viewport: { width: 1280, height: 720 } },
        { browser: 'firefox', viewport: { width: 1280, height: 720 } },
        { browser: 'webkit', viewport: { width: 1280, height: 720 } },
      ],
      headless: true,
      screenshotFailures: false,
    },
  },
  plugins: [react()],
});
```

### Golden Screenshot Storage

Screenshots are stored per-browser in `__screenshots__/` directories:

```
__screenshots__/
├── background-color.test.tsx/
│   ├── background-color-chromium-darwin.png
│   ├── background-color-firefox-darwin.png
│   └── background-color-webkit-darwin.png
```

### Test Fixture Pattern

**File:** [vendor/render/remotion/packages/web-renderer/src/test/fixtures/background-color.tsx](../../vendor/render/remotion/packages/web-renderer/src/test/fixtures/background-color.tsx)

```tsx
import { AbsoluteFill } from 'remotion';

const Component: React.FC = () => {
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div
        style={{
          backgroundColor: 'red',
          width: 100,
          height: 100,
          borderRadius: 20,
        }}
      />
    </AbsoluteFill>
  );
};

export const backgroundColor = {
  component: Component,
  id: 'background-color',
  width: 200,
  height: 200,
  fps: 25,
  durationInFrames: 1,
} as const;
```

### Usage in Test

**File:** [vendor/render/remotion/packages/web-renderer/src/test/background-color.test.tsx](../../vendor/render/remotion/packages/web-renderer/src/test/background-color.test.tsx)

```tsx
import { test } from 'vitest';
import { renderStillOnWeb } from '../render-still-on-web';
import { backgroundColor } from './fixtures/background-color';
import { testImage } from './utils';

test('should render background-color', async () => {
  const { blob } = await renderStillOnWeb({
    licenseKey: 'free-license',
    composition: backgroundColor,
    frame: 0,
    inputProps: {},
    imageFormat: 'png',
  });

  await testImage({ blob, testId: 'background-color' });
});
```

---

## 2. Video Metadata Assertions (Duration, Resolution, Codec)

### Using ffprobe via Remotion's RenderInternals

**File:** [vendor/render/remotion/packages/it-tests/src/rendering/rendering.test.ts](../../vendor/render/remotion/packages/it-tests/src/rendering/rendering.test.ts)

```typescript
import { RenderInternals } from '@remotion/renderer';
import { expect, test } from 'bun:test';

test(
  'Should be able to render video with custom port',
  async () => {
    // ... render video to outputPath ...

    const info = await RenderInternals.callFf({
      bin: 'ffprobe',
      args: [outputPath],
      indent: false,
      logLevel: 'info',
      binariesDirectory: null,
      cancelSignal: undefined,
    });

    const data = info.stderr;

    // Assert video codec
    expect(data).toContain('Video: h264');

    // Assert pixel format
    expect(data).toContain('yuv420p');

    // Assert resolution
    expect(data).toContain('1080x1080');

    // Assert color space
    expect(data).toContain('bt709');

    // Assert frame rate
    expect(data).toContain('30 fps');

    // Assert audio codec
    expect(data).toContain('Audio: aac');
  },
  { timeout: 30000 }
);
```

### Remotion's getVideoMetadata API

**File:** [vendor/render/remotion/packages/it-tests/src/rendering/get-video-metadata.test.ts](../../vendor/render/remotion/packages/it-tests/src/rendering/get-video-metadata.test.ts)

```typescript
import { VideoMetadata, getVideoMetadata } from '@remotion/renderer';
import { expect, test } from 'bun:test';

test('Should return video metadata', async () => {
  const metadataResponse = await getVideoMetadata(exampleVideos.framer24fps, {
    logLevel: 'info',
  });

  const videoMetadata: VideoMetadata = {
    fps: 24,
    width: 1080,
    height: 1080,
    durationInSeconds: 4.166667,
    codec: 'h264',
    canPlayInVideoTag: true,
    supportsSeeking: true,
    colorSpace: 'bt601',
    audioCodec: null,
    audioFileExtension: null,
    pixelFormat: 'yuv420p',
  };

  expect(metadataResponse).toEqual(videoMetadata);
});
```

### MoviePy Python Pattern

**File:** [vendor/video-processing/moviepy/tests/test_VideoFileClip.py](../../vendor/video-processing/moviepy/tests/test_VideoFileClip.py)

```python
from moviepy.video.io.VideoFileClip import VideoFileClip

def test_setup(util):
    """Test VideoFileClip setup."""
    filename = os.path.join(util.TMP_DIR, "test.mp4")

    # Create test video
    video.write_videofile(filename, logger=None)

    assert os.path.exists(filename)

    clip = VideoFileClip(filename)
    assert clip.duration == 5
    assert clip.fps == 10
    assert clip.size == [256 * 3, 200]
    assert clip.reader.bitrate == 2
```

---

## 3. Visual Regression Testing Tools

### FFmpeg PSNR (Peak Signal-to-Noise Ratio)

**File:** [vendor/video-processing/ffmpeg/tests/tiny_psnr.c](../../vendor/video-processing/ffmpeg/tests/tiny_psnr.c)

Computes PSNR between two video files:

```c
// Usage: tiny_psnr <file1> <file2> <width>x<height>
// Output: PSNR Y:40.50 U:42.30 V:41.80 All:41.20
```

### FFmpeg SSIM (Structural Similarity Index)

**File:** [vendor/video-processing/ffmpeg/tests/tiny_ssim.c](../../vendor/video-processing/ffmpeg/tests/tiny_ssim.c)

```c
/*
 * Computes the Structural Similarity Metric between two rawYV12 video files.
 * Based on: Z. Wang, A. C. Bovik, H. R. Sheikh and E. P. Simoncelli,
 * "Image quality assessment: From error visibility to structural similarity"
 */

// Usage: tiny_ssim <file1.yuv> <file2.yuv> <width>x<height>
// Output: SSIM Y:0.98542 U:0.99123 V:0.98876 All:0.98847
```

### Frame-by-Frame Color Comparison

**File:** [vendor/render/remotion/packages/it-tests/src/rendering/test-utils.ts](../../vendor/render/remotion/packages/it-tests/src/rendering/test-utils.ts)

```typescript
import sharp from 'sharp';
import { random } from 'remotion';

export const getMissedFramesforCodec = async (
  codec: 'mp4' | 'webm',
  type: 'normal' | 'offthread' | 'codec'
) => {
  const outputPath = await saveSequenceInTempDir(`video-testing-${codec}-${type}`);
  let missedFrames = 0;

  for (let frame = 0; frame < 100; frame++) {
    // Expected color is deterministic based on frame number
    const expectedColor = {
      red: selectColor('red', frame),
      green: selectColor('green', frame),
      blue: selectColor('blue', frame),
    };

    // Extract actual pixel color using sharp
    const filename = path.join(outputPath, `element-${String(frame).padStart(2, '0')}.png`);
    const img = await sharp(filename).raw().toBuffer();

    const actualColor = {
      red: img.readUInt8(0),
      green: img.readUInt8(1),
      blue: img.readUInt8(2),
    };

    missedFrames = missedFrameChecker(expectedColor, actualColor, missedFrames, frame, filename);
  }

  return missedFrames;
};

function selectColor(color: string, frame: number) {
  // Deterministic random color per frame
  return Math.floor((random(`${color}-${frame}`) * 255) % 255);
}

function missedFrameChecker(expected, actual, missedFrames, frame, filename) {
  const colorDistance = {
    red: Math.abs(expected.red - actual.red),
    green: Math.abs(expected.green - actual.green),
    blue: Math.abs(expected.blue - actual.blue),
  };

  // Encoding can shift colors slightly - use threshold
  const highestDistance = Math.max(colorDistance.red, colorDistance.blue, colorDistance.green);
  const threshold = 35;

  if (highestDistance > threshold) {
    console.log(colorDistance, { threshold, frame, filename });
    return missedFrames + 1;
  }
  return missedFrames;
}
```

---

## 4. Caption/Subtitle Validation

### Remotion Caption Testing (Structured Data)

**File:** [vendor/render/remotion/packages/captions/src/test/tiktok.test.ts](../../vendor/render/remotion/packages/captions/src/test/tiktok.test.ts)

```typescript
import { expect, test } from 'bun:test';
import type { Caption } from '../caption';
import { createTikTokStyleCaptions } from '../create-tiktok-style-captions';

const captions: Caption[] = [
  { text: 'Using', startMs: 40, endMs: 300, timestampMs: 200, confidence: 0.948 },
  { text: " Remotion's", startMs: 300, endMs: 900, timestampMs: 440, confidence: 0.548 },
  { text: ' TikTok', startMs: 900, endMs: 1260, timestampMs: 1080, confidence: 0.953 },
  { text: ' template,', startMs: 1260, endMs: 1950, timestampMs: 1600, confidence: 0.968 },
];

test('Should create captions', () => {
  const { pages: tikTokStyleCaptions } = createTikTokStyleCaptions({
    captions,
    combineTokensWithinMilliseconds: 500,
  });

  expect(tikTokStyleCaptions).toEqual([
    {
      durationMs: 860,
      text: "Using Remotion's",
      startMs: 40,
      tokens: [
        { text: 'Using', fromMs: 40, toMs: 300 },
        { text: " Remotion's", fromMs: 300, toMs: 900 },
      ],
    },
    {
      text: 'TikTok template,',
      startMs: 900,
      durationMs: 1050,
      tokens: [
        { text: 'TikTok', fromMs: 900, toMs: 1260 },
        { text: ' template,', fromMs: 1260, toMs: 1950 },
      ],
    },
  ]);
});
```

### SRT Parsing/Serialization Roundtrip

**File:** [vendor/render/remotion/packages/captions/src/test/srt.test.ts](../../vendor/render/remotion/packages/captions/src/test/srt.test.ts)

```typescript
import { expect, test } from 'bun:test';
import { parseSrt } from '../parse-srt';
import { serializeSrt } from '../serialize-srt';

const input = `
1
00:00:00,000 --> 00:00:02,500
Welcome to the Example Subtitle File!

2
00:00:03,000 --> 00:00:06,000
This is a demonstration of SRT subtitles.
`.trim();

test('Should create captions', () => {
  const { captions } = parseSrt({ input });

  expect(captions).toEqual([
    {
      confidence: 1,
      endMs: 2500,
      startMs: 0,
      text: 'Welcome to the Example Subtitle File!',
      timestampMs: 1250,
    },
    {
      confidence: 1,
      endMs: 6000,
      startMs: 3000,
      text: 'This is a demonstration of SRT subtitles.',
      timestampMs: 4500,
    },
  ]);

  // Roundtrip test
  const serialized = serializeSrt({ lines: captions.map((c) => [c]) });
  expect(serialized).toEqual(input);
});
```

### MoviePy Subtitle Testing

**File:** [vendor/video-processing/moviepy/tests/test_SubtitlesClip.py](../../vendor/video-processing/moviepy/tests/test_SubtitlesClip.py)

```python
MEDIA_SUBTITLES_DATA = [
    ([0.0, 1.0], "Red!"),
    ([2.0, 3.5], "More Red!"),
    ([5.0, 6.0], "Green!"),
]

def test_subtitles(util):
    subtitles = SubtitlesClip("media/subtitles.srt", make_textclip=generator)

    # Validate parsed subtitle data matches expected
    assert subtitles.subtitles == MEDIA_SUBTITLES_DATA

def test_file_to_subtitles():
    assert MEDIA_SUBTITLES_DATA == file_to_subtitles("media/subtitles.srt")
```

---

## 5. Audio Sync Testing

### Frame Accuracy Testing

**File:** [vendor/render/remotion/packages/it-tests/src/rendering/frame-accuracy.test.ts](../../vendor/render/remotion/packages/it-tests/src/rendering/frame-accuracy.test.ts)

```typescript
import { expect, test } from 'bun:test';
import { getMissedFramesforCodec } from './test-utils';

test(
  'should render correct frames from embedded videos - MP4 offthread',
  async () => {
    // Uses deterministic colors per frame, validates each frame matches expected
    const missedFrames = await getMissedFramesforCodec('mp4', 'offthread');
    expect(missedFrames).toBe(0); // Zero tolerance for offthread rendering
  },
  { timeout: 30000 }
);

test(
  'should render correct frames from embedded videos - WebM onthread',
  async () => {
    // Onthread has slightly less accuracy due to browser timing
    const missedFrames = await getMissedFramesforCodec('webm', 'normal');
    expect(missedFrames).toBeLessThanOrEqual(8); // Allow small tolerance
  },
  { timeout: 30000 }
);
```

### Audio Codec Validation

```typescript
test('Should be able to render a WAV audio file', async () => {
  const out = outputPath.replace('mp4', 'wav');
  await execa('bun', ['x', 'remotion', 'render', 'build', 'audio-testing', out]);

  const info = await RenderInternals.callFf({
    bin: 'ffprobe',
    args: [out],
  });

  const data = info.stderr;
  expect(data).toContain('pcm_s16le'); // Audio codec
  expect(data).toContain('2 channels'); // Stereo
  expect(data).toContain('Kevin MacLeod'); // Metadata preserved
  expect(data).toMatch(/bitrate: 15\d\d kb/); // Bitrate range
  expect(data).toContain('Stream #0'); // Has one stream
  expect(data).not.toContain('Stream #1'); // No extra streams
});
```

---

## 6. Deterministic Video Rendering

### Remotion's ESLint Rule for Deterministic Randomness

**File:** [vendor/render/remotion/packages/eslint-plugin/src/rules/deterministic-randomness.ts](../../vendor/render/remotion/packages/eslint-plugin/src/rules/deterministic-randomness.ts)

```typescript
const DeterministicRandomness = [
  'The result of Math.random() will change between frames while in rendering mode.',
  'Use the `random()` API from Remotion to get a deterministic pseudorandom value.',
  'If you are sure you want a true random value, use `random(null)` to hide this warning.',
  'See: https://remotion.dev/docs/using-randomness',
].join('\n');

export default createRule({
  name: 'deterministic-randomness',
  create: (context) => {
    return {
      CallExpression: (node) => {
        // Warn on Math.random() usage
        if (callee.object.name === 'Math' && callee.property.name === 'random') {
          context.report({
            messageId: 'DeterministicRandomness',
            node,
          });
        }
      },
    };
  },
});
```

### Using Remotion's Seeded Random

```typescript
import { random } from 'remotion';

// BAD: Non-deterministic, different each render
const badValue = Math.random();

// GOOD: Deterministic based on seed, same across renders
const goodValue = random('my-seed');

// GOOD: Frame-specific deterministic value
const frameValue = random(`animation-${frame}`);

// OK: Explicitly non-deterministic (suppress warning)
const trulyRandom = random(null);
```

---

## 7. CI Pipeline Patterns

### Remotion's GitHub Actions Workflow

**File:** [vendor/render/remotion/.github/workflows/push.yml](../../vendor/render/remotion/.github/workflows/push.yml)

```yaml
name: Install and Test

jobs:
  webrenderer-tests:
    runs-on: macos-latest
    name: Web renderer tests
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2.0.2
      - name: Install
        run: bun ci
      - name: Install deps
        run: cd packages/web-renderer && bunx playwright install --with-deps
      - name: Test web renderer
        run: bun run testwebrenderer

  ssr-tests:
    runs-on: ubuntu-latest
    name: SSR integration
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Test SSR
        timeout-minutes: 8
        run: bun run testssr

  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
          - os: windows-latest
          - os: macos-latest
    steps:
      - name: Build & Test
        timeout-minutes: 30
        run: bun run ci
```

### FFmpeg's FATE Test System

**File:** [vendor/video-processing/ffmpeg/tests/fate-run.sh](../../vendor/video-processing/ffmpeg/tests/fate-run.sh)

```bash
#!/bin/sh
# FATE = FFmpeg Automated Testing Environment

test="${1#fate-}"
ref="${7:-${base}/ref/fate/${test}}"  # Reference output
fuzz=${8:-1}                           # Allowed difference

# Compare using tiny_psnr
do_tiny_psnr(){
    psnr=$(tests/tiny_psnr "$1" "$2" $cmp_unit $cmp_shift 0)
    val=$(expr "$psnr" : ".*$3: *\([0-9.]*\)")
    val_cmp=$(compare $val $cmp_target $fuzz)

    if [ "$val_cmp" != 0 ]; then
        echo "$psnr"
        echo "$3: |$val - $cmp_target| >= $fuzz"
        return 1
    fi
}

# Compare standard deviation
stddev(){
    do_tiny_psnr "$1" "$2" stddev
}

# One-off max difference check
oneoff(){
    do_tiny_psnr "$1" "$2" MAXDIFF
}
```

---

## 8. Summary: Testing Strategy for content-machine

### Recommended Test Layers

| Layer                   | Tool                | Purpose                                |
| ----------------------- | ------------------- | -------------------------------------- |
| **Unit Tests**          | Vitest/Bun          | Caption parsing, timing calculations   |
| **Visual Regression**   | Vitest + Playwright | Frame snapshot comparison              |
| **Metadata Validation** | ffprobe             | Duration, resolution, codec assertions |
| **Quality Metrics**     | FFmpeg PSNR/SSIM    | Objective quality scoring              |
| **Integration Tests**   | Full pipeline       | End-to-end video generation            |

### Key Patterns to Implement

1. **Frame Snapshot Testing**
   - Store golden images per composition
   - Use pixel ratio tolerance (0.1-1%)
   - Run across multiple browsers for cross-platform validation

2. **Metadata Assertions**
   - Validate duration matches expected (within frame tolerance)
   - Check codec matches spec (h264, aac, etc.)
   - Verify resolution and aspect ratio

3. **Deterministic Rendering**
   - Use seeded random for all animations
   - Enable `@remotion/deterministic-randomness` ESLint rule
   - Fix timestamps for date-based content

4. **Caption Validation**
   - Test parse/serialize roundtrip
   - Validate timing accuracy (startMs, endMs)
   - Check character limits per line

5. **CI Integration**
   - Run visual tests on macOS (best browser support)
   - Run metadata tests on Linux (fastest)
   - Set appropriate timeouts (30s for renders)
   - Store artifacts on failure

### Example Test File Structure

```
tests/
├── unit/
│   ├── captions/
│   │   ├── parse-srt.test.ts
│   │   ├── tiktok-style.test.ts
│   │   └── timing-validation.test.ts
│   └── rendering/
│       └── deterministic.test.ts
├── integration/
│   ├── video-metadata.test.ts
│   ├── audio-sync.test.ts
│   └── caption-overlay.test.ts
├── visual/
│   ├── fixtures/
│   │   └── caption-styles.tsx
│   ├── __screenshots__/
│   │   └── caption-styles-chromium.png
│   └── caption-rendering.test.tsx
└── e2e/
    └── full-pipeline.test.ts
```

---

## References

- [Remotion Testing Docs](https://www.remotion.dev/docs/testing)
- [Remotion Deterministic Rendering](https://www.remotion.dev/docs/using-randomness)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [FFmpeg FATE System](https://ffmpeg.org/fate.html)
- [SSIM Paper](https://ieeexplore.ieee.org/document/1284395)
