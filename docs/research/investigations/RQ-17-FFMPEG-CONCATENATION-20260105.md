# RQ-17: FFmpeg Video Concatenation Without Artifacts

**Date:** 2026-01-05  
**Status:** Research Complete  
**Priority:** P1  
**Question:** How do we concatenate video chunks without audio pops or visual artifacts?

---

## 1. Problem Statement

When splitting long renders to avoid Remotion memory leaks (RQ-11), we need to concatenate chunks without:

- Audio pops/clicks at boundaries
- Frame timing drift
- Re-encoding quality loss
- Timestamp discontinuities

---

## 2. Vendor Evidence

### 2.1 Three Concatenation Methods

| Method              | Use Case                  | Re-encode? | Speed   |
| ------------------- | ------------------------- | ---------- | ------- |
| **Concat demuxer**  | Same codec/resolution/fps | No         | ⚡ Fast |
| **Concat protocol** | MPEG-TS only              | No         | ⚡ Fast |
| **Concat filter**   | Different formats         | Yes        | 🐢 Slow |

### 2.2 Concat Demuxer (Recommended)

**Best for:** Pre-normalized clips with identical parameters.

```bash
# Create file list
cat > concat.txt << EOF
file 'chunk-001.mp4'
file 'chunk-002.mp4'
file 'chunk-003.mp4'
EOF

# Concatenate without re-encoding
ffmpeg -f concat -safe 0 -i concat.txt -c copy output.mp4
```

**Requirement:** All clips must have:

- Same codec (h264)
- Same resolution (1080x1920)
- Same frame rate (30fps)
- Same pixel format (yuv420p)
- Same audio sample rate (48000Hz)

### 2.3 Audio Pop Prevention

**Problem:** Audio pops occur when waveforms don't align at boundaries.

**Solution 1: Micro-fades at boundaries**

```bash
# Add 20ms fade in/out to each chunk before concatenation
ffmpeg -i chunk.mp4 \
  -af "afade=t=in:d=0.02,afade=t=out:st=-0.02:d=0.02" \
  chunk-faded.mp4
```

**Solution 2: Crossfade during concatenation**

```bash
# Crossfade 0.5s between clips (requires re-encoding)
ffmpeg -i chunk1.mp4 -i chunk2.mp4 \
  -filter_complex "acrossfade=d=0.5:c1=tri:c2=tri" \
  output.mp4
```

**Solution 3: Cut at AAC frame boundaries**

**Source:** [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer)

AAC frames are 1024 samples. At 48kHz, that's ~21.33ms per frame.

```typescript
// Remotion calculates cuts in microseconds to align with AAC frames
const AAC_FRAME_DURATION_US = (1024 / 48000) * 1_000_000; // ~21333 microseconds

function alignToAacFrame(microseconds: number): number {
  return Math.round(microseconds / AAC_FRAME_DURATION_US) * AAC_FRAME_DURATION_US;
}
```

### 2.4 Timestamp Preservation

**Problem:** Concatenation can create timestamp discontinuities.

**Solution:** Use `-fflags +genpts` to regenerate timestamps:

```bash
ffmpeg -fflags +genpts -f concat -safe 0 -i concat.txt -c copy output.mp4
```

---

## 3. Parameter Normalization

Before concatenation, normalize all clips:

```typescript
async function normalizeClip(
  inputPath: string,
  outputPath: string,
  params: {
    width: number;
    height: number;
    fps: number;
    sampleRate: number;
  }
): Promise<void> {
  const { width, height, fps, sampleRate } = params;

  await execa('ffmpeg', [
    '-i',
    inputPath,
    // Video normalization
    '-vf',
    `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,fps=${fps}`,
    '-pix_fmt',
    'yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    // Audio normalization
    '-ar',
    String(sampleRate),
    '-ac',
    '2',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    // Output
    outputPath,
  ]);
}
```

### 3.1 Standard Parameters for TikTok/Reels

```typescript
const STANDARD_PARAMS = {
  width: 1080,
  height: 1920,
  fps: 30,
  sampleRate: 48000,
  pixelFormat: 'yuv420p',
  videoCodec: 'libx264',
  audioCodec: 'aac',
  audioBitrate: '192k',
  crf: 18,
};
```

---

## 4. Recommended Implementation

### 4.1 Chunk Rendering with Aligned Cuts

```typescript
interface RenderChunk {
  startFrame: number;
  endFrame: number;
  outputPath: string;
}

async function renderInChunks(
  composition: Composition,
  chunkSize: number = 300 // ~10 seconds at 30fps
): Promise<string[]> {
  const totalFrames = composition.durationInFrames;
  const chunks: RenderChunk[] = [];

  for (let start = 0; start < totalFrames; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalFrames);
    chunks.push({
      startFrame: start,
      endFrame: end,
      outputPath: `./temp/chunk-${String(chunks.length).padStart(3, '0')}.mp4`,
    });
  }

  // Render each chunk
  for (const chunk of chunks) {
    await renderMedia({
      composition,
      outputLocation: chunk.outputPath,
      frameRange: [chunk.startFrame, chunk.endFrame - 1],
      codec: 'h264',
      crf: 18,
      audioBitrate: '192k',
    });

    // Force GC between chunks to avoid memory leaks
    if (global.gc) global.gc();
  }

  return chunks.map((c) => c.outputPath);
}
```

### 4.2 Safe Concatenation

```typescript
import { execa } from 'execa';
import { writeFile, unlink } from 'fs/promises';
import { join, dirname } from 'path';

async function concatenateChunks(
  chunkPaths: string[],
  outputPath: string,
  options?: {
    addMicroFades?: boolean;
    regenerateTimestamps?: boolean;
  }
): Promise<void> {
  const { addMicroFades = true, regenerateTimestamps = true } = options ?? {};

  let pathsToConcat = chunkPaths;

  // Step 1: Add micro-fades if requested
  if (addMicroFades) {
    pathsToConcat = await Promise.all(
      chunkPaths.map(async (path, i) => {
        const fadedPath = path.replace('.mp4', '-faded.mp4');

        // First chunk: fade out only
        // Last chunk: fade in only
        // Middle chunks: both
        let fadeFilter = '';
        if (i === 0) {
          fadeFilter = 'afade=t=out:st=-0.02:d=0.02';
        } else if (i === chunkPaths.length - 1) {
          fadeFilter = 'afade=t=in:d=0.02';
        } else {
          fadeFilter = 'afade=t=in:d=0.02,afade=t=out:st=-0.02:d=0.02';
        }

        await execa('ffmpeg', [
          '-i',
          path,
          '-af',
          fadeFilter,
          '-c:v',
          'copy', // Don't re-encode video
          fadedPath,
        ]);

        return fadedPath;
      })
    );
  }

  // Step 2: Create concat file list
  const concatFilePath = join(dirname(outputPath), 'concat.txt');
  const concatContent = pathsToConcat.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n');
  await writeFile(concatFilePath, concatContent);

  // Step 3: Concatenate
  const ffmpegArgs = [
    ...(regenerateTimestamps ? ['-fflags', '+genpts'] : []),
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatFilePath,
    '-c',
    'copy',
    outputPath,
  ];

  await execa('ffmpeg', ffmpegArgs);

  // Step 4: Cleanup
  await unlink(concatFilePath);
  if (addMicroFades) {
    await Promise.all(pathsToConcat.map((p) => unlink(p)));
  }
}
```

### 4.3 Quality Validation After Concatenation

```typescript
async function validateConcatenation(
  chunkPaths: string[],
  outputPath: string
): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  // Check durations match
  const chunkDurations = await Promise.all(chunkPaths.map((p) => getVideoDuration(p)));
  const expectedDuration = chunkDurations.reduce((a, b) => a + b, 0);
  const actualDuration = await getVideoDuration(outputPath);

  const durationDrift = Math.abs(actualDuration - expectedDuration);
  if (durationDrift > 0.1) {
    // More than 100ms drift
    issues.push(`Duration drift: expected ${expectedDuration}s, got ${actualDuration}s`);
  }

  // Check for audio discontinuities (would require audio analysis)
  // This is a placeholder for more sophisticated validation

  return {
    valid: issues.length === 0,
    issues,
  };
}
```

---

## 5. Trade-offs

| Approach             | Quality       | Speed               | Complexity |
| -------------------- | ------------- | ------------------- | ---------- |
| No fades (pure copy) | May have pops | ⚡ Fastest          | Simple     |
| Micro-fades          | Good          | Fast                | Medium     |
| Crossfades           | Best          | 🐢 Slow (re-encode) | Complex    |

**Recommendation:** Use micro-fades (20ms) as default. They're imperceptible and prevent most pops without re-encoding video.

---

## 6. Implementation Recommendations

| Decision             | Recommendation    | Rationale                     |
| -------------------- | ----------------- | ----------------------------- |
| Concatenation method | Concat demuxer    | No re-encoding                |
| Audio handling       | 20ms micro-fades  | Prevents pops, imperceptible  |
| Timestamp handling   | `-fflags +genpts` | Prevents discontinuities      |
| Pre-normalization    | Required          | Ensures compatible parameters |
| Chunk size           | 300 frames (~10s) | Balances memory vs overhead   |

---

## 7. References

- [FFmpeg Concatenation Wiki](https://trac.ffmpeg.org/wiki/Concatenate) — Official documentation
- [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer) — AAC frame alignment
- [vendor/video-processing/moviepy](../../../vendor/video-processing/moviepy) — Python concatenation patterns
- [RQ-11-REMOTION-MEMORY](./RQ-11-REMOTION-MEMORY-20260104.md) — Why chunking is needed
