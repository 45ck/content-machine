# Video Quality Metrics Research Report

**Date:** 2026-01-04  
**Status:** Research Complete  
**Scope:** Programmatic video quality measurement patterns from vendored repos

---

## Executive Summary

This research documents how to measure video quality programmatically using patterns from the vendored repositories. The primary tools are FFmpeg's built-in quality filters (VMAF, SSIM, PSNR) and encoding quality settings from Remotion.

---

## 1. Quality Metrics Overview

### 1.1 VMAF (Video Multimethod Assessment Fusion)
**Best for:** Perceptual quality assessment, streaming quality validation  
**Range:** 0-100 (higher is better)  
**Thresholds:**
- **90+** = Excellent (indistinguishable from reference)
- **80-90** = Good (high quality)
- **70-80** = Fair (acceptable for most use cases)
- **<70** = Poor (noticeable artifacts)

### 1.2 SSIM (Structural Similarity Index)
**Best for:** Structural distortion detection  
**Range:** 0-1 (higher is better)  
**Thresholds:**
- **>0.98** = Excellent
- **0.95-0.98** = Good
- **0.90-0.95** = Fair
- **<0.90** = Poor

### 1.3 PSNR (Peak Signal-to-Noise Ratio)
**Best for:** Quick quality checks, codec comparison  
**Range:** 0-∞ dB (higher is better)  
**Thresholds:**
- **>40 dB** = Excellent (nearly lossless)
- **35-40 dB** = Good
- **30-35 dB** = Fair
- **<30 dB** = Poor

---

## 2. FFmpeg Quality Filters

### 2.1 VMAF Filter Usage

**Source:** [vendor/video-processing/ffmpeg/libavfilter/vf_libvmaf.c](vendor/video-processing/ffmpeg/libavfilter/vf_libvmaf.c)

**Requires:** libvmaf library (Netflix's VMAF implementation)

```bash
# Basic VMAF comparison
ffmpeg -i distorted.mp4 -i reference.mp4 -lavfi libvmaf=log_path=vmaf.json:log_fmt=json -f null -

# With multiple models
ffmpeg -i distorted.mp4 -i reference.mp4 -lavfi \
  "libvmaf='model=version=vmaf_v0.6.1:name=vmaf|version=vmaf_v0.6.1neg:name=vmaf_neg'" \
  -f null -

# With PSNR and SSIM features
ffmpeg -i distorted.mp4 -i reference.mp4 -lavfi \
  "libvmaf='feature=name=psnr|name=ciede'" -f null -
```

**Filter Options (from source):**

```c
// vendor/video-processing/ffmpeg/libavfilter/vf_libvmaf.c#L69-L77
static const AVOption libvmaf_options[] = {
    {"log_path",  "Set file path for log.",          ...},
    {"log_fmt",   "Format: csv, json, xml, or sub.", ...},
    {"pool",      "Pool method: min, harmonic_mean, mean (default).", ...},
    {"n_threads", "Number of threads (0 = auto).",   ...},
    {"n_subsample", "Frame subsampling interval.",   ...},
    {"model",     "VMAF model (default: vmaf_v0.6.1).", ...},
    {"feature",   "Additional features to compute.", ...},
};
```

### 2.2 SSIM Filter Usage

**Source:** [vendor/video-processing/ffmpeg/libavfilter/vf_ssim.c](vendor/video-processing/ffmpeg/libavfilter/vf_ssim.c)

```bash
# Basic SSIM comparison
ffmpeg -i main.mp4 -i reference.mp4 -lavfi ssim=stats_file=ssim.log -f null -

# Combined SSIM + PSNR
ffmpeg -i main.mp4 -i reference.mp4 -lavfi "ssim;[0:v][1:v]psnr" -f null -
```

**Algorithm (from source):**

```c
// vendor/video-processing/ffmpeg/libavfilter/vf_ssim.c#L22-L30
/* Original algorithm:
 * Z. Wang, A. C. Bovik, H. R. Sheikh and E. P. Simoncelli,
 *   "Image quality assessment: From error visibility to structural similarity,"
 *   IEEE Transactions on Image Processing, vol. 13, no. 4, pp. 600-612, Apr. 2004.
 *
 * Uses overlapped 8x8 block sums for speed (vs original gaussian weights).
 */
```

### 2.3 PSNR Filter Usage

**Source:** [vendor/video-processing/ffmpeg/libavfilter/vf_psnr.c](vendor/video-processing/ffmpeg/libavfilter/vf_psnr.c)

```bash
# Basic PSNR comparison
ffmpeg -i distorted.mp4 -i reference.mp4 -lavfi psnr=stats_file=psnr.log -f null -
```

**PSNR Formula (from source):**

```c
// vendor/video-processing/ffmpeg/libavfilter/vf_psnr.c#L78-L81
static inline double get_psnr(double mse, uint64_t nb_frames, int max)
{
    return 10.0 * log10(pow_2(max) / (mse / nb_frames));
}
```

---

## 3. Standalone Quality Measurement Tools

### 3.1 FFmpeg tiny_ssim.c

**Source:** [vendor/video-processing/ffmpeg/tests/tiny_ssim.c](vendor/video-processing/ffmpeg/tests/tiny_ssim.c)

A lightweight standalone tool for SSIM + PSNR calculation:

```c
// Key SSIM constants (vendor/video-processing/ffmpeg/tests/tiny_ssim.c#L82-87)
#if BIT_DEPTH > 9
    static const float ssim_c1 = .01*.01*PIXEL_MAX*PIXEL_MAX*64;
    static const float ssim_c2 = .03*.03*PIXEL_MAX*PIXEL_MAX*64*63;
#else
    static const int ssim_c1 = (int)(.01*.01*PIXEL_MAX*PIXEL_MAX*64 + .5);
    static const int ssim_c2 = (int)(.03*.03*PIXEL_MAX*PIXEL_MAX*64*63 + .5);
#endif

// SSIM formula (vendor/video-processing/ffmpeg/tests/tiny_ssim.c#L95-96)
return (float)(2*fs1*fs2 + ssim_c1) * (float)(2*covar + ssim_c2)
     / ((float)(fs1*fs1 + fs2*fs2 + ssim_c1) * (float)(vars + ssim_c2));
```

**Usage:**
```bash
tiny_ssim <file1.yuv> <file2.yuv> <width>x<height> [<seek>]
```

**Output:**
```
PSNR Y:%.3f U:%.3f V:%.3f All:%.3f | SSIM Y:%.5f U:%.5f V:%.5f All:%.5f
```

### 3.2 FFmpeg tiny_psnr.c

**Source:** [vendor/video-processing/ffmpeg/tests/tiny_psnr.c](vendor/video-processing/ffmpeg/tests/tiny_psnr.c)

```bash
tiny_psnr <file1> <file2> [<elem size>|u8|s16|f32|f64 [<shift> [<skip bytes>]]]
```

---

## 4. Encoding Quality Settings

### 4.1 Remotion CRF Settings

**Source:** [vendor/render/remotion/packages/renderer/src/crf.ts](vendor/render/remotion/packages/renderer/src/crf.ts)

```typescript
// Default CRF values by codec
const defaultCrfMap: {[key in Codec]: number | null} = {
  h264: 18,       // High quality default
  h265: 23,       // HEVC default
  vp8: 9,         // WebM/VP8
  vp9: 28,        // WebM/VP9
  prores: null,   // ProRes doesn't use CRF
  gif: null,
  'h264-mkv': 18,
  'h264-ts': 18,
  aac: null,
  mp3: null,
  wav: null,
};

// Valid CRF ranges by codec
const crfRanges: {[key in Codec]: [number, number]} = {
  h264: [1, 51],    // Lower = better quality, higher file size
  h265: [0, 51],
  vp8: [4, 63],
  vp9: [0, 63],
  prores: [0, 0],   // Not applicable
  gif: [0, 0],
  'h264-mkv': [1, 51],
  'h264-ts': [1, 51],
  // Audio codecs...
};
```

**Quality Guidelines for H.264:**
- **CRF 18**: Visually lossless (Remotion default)
- **CRF 23**: Good quality, smaller files
- **CRF 28**: Acceptable quality, much smaller
- **CRF 0**: Disabled for H.264 (iOS/macOS compatibility issues)

### 4.2 Remotion JPEG Quality

**Source:** [vendor/render/remotion/packages/renderer/src/jpeg-quality.ts](vendor/render/remotion/packages/renderer/src/jpeg-quality.ts)

```typescript
export const DEFAULT_JPEG_QUALITY = 80;  // Range: 0-100

export const validateJpegQuality = (q: unknown) => {
  if (typeof q !== 'undefined' && typeof q !== 'number') {
    throw new Error(`JPEG Quality must be a number or undefined.`);
  }
  if (q > 100 || q < 0) {
    throw new RangeError('JPEG Quality option must be between 0 and 100.');
  }
};
```

### 4.3 Remotion Quality Validation

**Source:** [vendor/render/remotion/packages/renderer/src/crf.ts#L50-L139](vendor/render/remotion/packages/renderer/src/crf.ts#L50-L139)

```typescript
export const validateQualitySettings = ({
  codec, crf, videoBitrate, encodingMaxRate, encodingBufferSize, hardwareAcceleration,
}: {...}): string[] => {
  // Mutual exclusion: CRF vs bitrate
  if (crf && videoBitrate) {
    throw new Error('"crf" and "videoBitrate" can not both be set.');
  }

  // Hardware acceleration doesn't support CRF
  if (crf && hardwareAcceleration === 'required') {
    throw new Error('"crf" is not supported with hardware acceleration');
  }

  // Validate CRF ranges
  const range = getValidCrfRanges(codec);
  if (crf < range[0] || crf > range[1]) {
    throw new TypeError(`CRF must be between ${range[0]} and ${range[1]} for ${codec}`);
  }

  return ['-crf', String(crf), ...bufSizeArray, ...maxRateArray];
};
```

---

## 5. Resolution Quality Validation

### 5.1 MoneyPrinterTurbo Minimum Resolution

**Source:** [vendor/MoneyPrinterTurbo/app/services/video.py#L500-502](vendor/MoneyPrinterTurbo/app/services/video.py#L500-502)

```python
width = clip.size[0]
height = clip.size[1]
if width < 480 or height < 480:
    logger.warning(f"low resolution material: {width}x{height}, minimum 480x480 required")
    continue
```

### 5.2 Pexels Quality Tiers

**Source:** [vendor/short-video-maker-gyori/__mocks__/pexels-response.json](vendor/short-video-maker-gyori/__mocks__/pexels-response.json)

```json
{
  "video_files": [
    { "quality": "uhd", "width": 3840, "height": 2160 },
    { "quality": "hd",  "width": 1920, "height": 1080 },
    { "quality": "sd",  "width": 1280, "height": 720 }
  ]
}
```

---

## 6. MoviePy Encoding Options

### 6.1 FFmpeg Writer Presets

**Source:** [vendor/video-processing/moviepy/moviepy/video/io/ffmpeg_writer.py#L48-53](vendor/video-processing/moviepy/moviepy/video/io/ffmpeg_writer.py#L48-53)

```python
class FFMPEG_VideoWriter:
    """
    preset : str, optional
      Time FFMPEG takes to compress. Slower = better compression.
      Options: "ultrafast", "superfast", "veryfast", "faster", "fast",
               "medium" (default), "slow", "slower", "veryslow", "placebo".
    """

    def __init__(
        self,
        filename,
        size,
        fps,
        codec="libx264",         # Default codec
        preset="medium",         # Balance speed/quality
        bitrate=None,            # e.g., "5000k"
        ...
    ):
```

**Codec Quality Hierarchy (from comments):**

```python
# vendor/video-processing/moviepy/moviepy/video/io/ffmpeg_writer.py#L32-35
"""
In terms of quality: 'rawvideo' = 'png' > 'mpeg4' > 'libx264'
'png' is lossless like 'rawvideo' but yields smaller files.
"""
```

---

## 7. Performance Considerations

### 7.1 VMAF Performance

From FFmpeg documentation:
- **n_threads**: Use multiple threads for faster processing
- **n_subsample**: Skip frames (e.g., `n_subsample=5` = every 5th frame)
- **GPU acceleration**: Available via `libvmaf_cuda`

```bash
# Fast VMAF (subsample every 5 frames, 4 threads)
ffmpeg -i dist.mp4 -i ref.mp4 -lavfi "libvmaf=n_threads=4:n_subsample=5" -f null -
```

### 7.2 SSIM/PSNR Performance

- **SSIM**: ~10-20% slower than PSNR (block-based calculation)
- **PSNR**: Fastest metric (simple MSE calculation)
- Both use multi-threaded processing in FFmpeg

### 7.3 Encoding Presets vs Quality

| Preset | Speed | File Size | Quality |
|--------|-------|-----------|---------|
| ultrafast | Fastest | Largest | Lower |
| medium | Balanced | Medium | Good |
| veryslow | Slowest | Smallest | Best |

---

## 8. Recommended Quality Thresholds

### 8.1 For Short-Form Video (TikTok/Reels/Shorts)

```typescript
const QUALITY_THRESHOLDS = {
  // Video encoding
  crf: {
    h264: 18,      // Remotion default - high quality
    minimum: 23,   // Acceptable for social media
    maximum: 28,   // Smallest acceptable
  },
  
  // Resolution
  resolution: {
    minimum: { width: 480, height: 480 },    // MoneyPrinterTurbo
    recommended: { width: 1080, height: 1920 }, // Portrait HD
  },
  
  // Quality metrics (if comparing to reference)
  vmaf: {
    excellent: 90,
    good: 80,
    acceptable: 70,
  },
  
  ssim: {
    excellent: 0.98,
    good: 0.95,
    acceptable: 0.90,
  },
  
  psnr: {
    excellent: 40,  // dB
    good: 35,
    acceptable: 30,
  },
  
  // Image quality (stills, thumbnails)
  jpeg: {
    default: 80,   // Remotion default
    minimum: 60,
    highQuality: 95,
  },
};
```

### 8.2 Validation Function Pattern

```typescript
// Based on Remotion patterns
function validateVideoQuality(params: {
  width: number;
  height: number;
  crf?: number;
  codec: 'h264' | 'h265' | 'vp9';
}): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Resolution check (MoneyPrinterTurbo pattern)
  if (params.width < 480 || params.height < 480) {
    warnings.push(`Low resolution: ${params.width}x${params.height}, minimum 480x480`);
  }
  
  // CRF validation (Remotion pattern)
  if (params.crf !== undefined) {
    const ranges = { h264: [1, 51], h265: [0, 51], vp9: [0, 63] };
    const [min, max] = ranges[params.codec];
    if (params.crf < min || params.crf > max) {
      warnings.push(`CRF ${params.crf} out of range [${min}, ${max}] for ${params.codec}`);
    }
    if (params.crf > 28) {
      warnings.push(`CRF ${params.crf} may produce visible quality loss`);
    }
  }
  
  return { valid: warnings.length === 0, warnings };
}
```

---

## 9. Implementation Recommendations

### 9.1 Quality Validation Pipeline

```
┌─────────────────┐
│ Input Video     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Resolution Check│ → Warn if < 480x480
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Encoding Config │ → Validate CRF/bitrate
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Render Video    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Quality Check   │ → Optional VMAF/SSIM
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Output Video    │
└─────────────────┘
```

### 9.2 When to Use Each Metric

| Use Case | Recommended Metric | Why |
|----------|-------------------|-----|
| Pre-upload validation | SSIM (fast) | Quick structural check |
| A/B codec testing | VMAF | Perceptual accuracy |
| Regression testing | PSNR | Fast, deterministic |
| Thumbnail quality | JPEG quality score | Simple 0-100 range |
| Production monitoring | VMAF (sampled) | Industry standard |

### 9.3 Node.js/TypeScript Integration

```typescript
import { execSync } from 'child_process';

interface QualityResult {
  vmaf?: number;
  ssim?: number;
  psnr?: number;
}

function measureQuality(
  distortedPath: string,
  referencePath: string,
  metrics: ('vmaf' | 'ssim' | 'psnr')[] = ['ssim']
): QualityResult {
  const filters = metrics.map(m => {
    switch (m) {
      case 'vmaf': return 'libvmaf=log_fmt=json:log_path=/tmp/vmaf.json';
      case 'ssim': return 'ssim=f=/tmp/ssim.log';
      case 'psnr': return 'psnr=f=/tmp/psnr.log';
    }
  }).join(';');

  execSync(
    `ffmpeg -i "${distortedPath}" -i "${referencePath}" -lavfi "${filters}" -f null -`,
    { stdio: 'pipe' }
  );

  // Parse output files...
  return { /* parsed results */ };
}
```

---

## 10. Key Takeaways

1. **Default CRF 18** (Remotion) is a safe high-quality default for H.264
2. **VMAF 80+** is the industry threshold for "good quality"
3. **480x480 minimum** resolution for any video content
4. **JPEG quality 80** is a balanced default
5. **Use subsampling** for faster VMAF analysis in CI/CD
6. **SSIM > PSNR** for structural quality assessment
7. **Preset "medium"** balances encode speed and quality

---

## References

- FFmpeg Filters Documentation: [vendor/video-processing/ffmpeg/doc/filters.texi](vendor/video-processing/ffmpeg/doc/filters.texi)
- Remotion CRF: [vendor/render/remotion/packages/renderer/src/crf.ts](vendor/render/remotion/packages/renderer/src/crf.ts)
- Netflix VMAF: https://github.com/Netflix/vmaf
- SSIM Paper: Wang et al., IEEE TIP 2004

