# RQ-13: Video Quality Metrics and Thresholds

**Date:** 2026-01-04  
**Status:** Research Complete  
**Priority:** P1  
**Question:** What video quality metrics should we measure and what thresholds indicate problems?

---

## 1. Problem Statement

Video quality is subjective, but we need objective metrics to:
- Detect rendering regressions automatically
- Set quality baselines for CI/CD
- Compare encoding presets
- Validate compression trade-offs

---

## 2. Vendor Evidence

### 2.1 Industry Standard Metrics

| Metric | Full Name | Range | Speed | Best For |
|--------|-----------|-------|-------|----------|
| **PSNR** | Peak Signal-to-Noise Ratio | 0-∞ dB | Fast | Quick regression checks |
| **SSIM** | Structural Similarity Index | 0-1 | Medium | Perceptual quality |
| **VMAF** | Video Multi-method Assessment Fusion | 0-100 | Slow | Netflix/professional |
| **CRF** | Constant Rate Factor | 0-51 | N/A | Encoding quality |

### 2.2 Remotion Default Quality Settings

**Source:** [vendor/remotion/packages/renderer/src/options/crf.tsx](../../../vendor/remotion/packages/renderer/src/options/crf.tsx)

```typescript
const CRF_DEFAULTS = {
  h264: 18,    // High quality, reasonable file size
  h265: 23,    // Equivalent quality to h264@18
  vp8: 9,
  vp9: 28,
  prores: null, // Not applicable (lossless)
};
```

### 2.3 Quality Thresholds from Research

**Based on industry standards and vendor implementations:**

#### PSNR Thresholds

| Quality Level | PSNR (dB) | Description |
|---------------|-----------|-------------|
| **Excellent** | >40 | Visually lossless |
| **Good** | 35-40 | Minor artifacts, acceptable |
| **Acceptable** | 30-35 | Noticeable degradation |
| **Poor** | <30 | Significant quality loss |

#### SSIM Thresholds

| Quality Level | SSIM | Description |
|---------------|------|-------------|
| **Excellent** | >0.98 | Near-identical |
| **Good** | 0.95-0.98 | High quality |
| **Acceptable** | 0.90-0.95 | Moderate quality |
| **Poor** | <0.90 | Visible differences |

#### VMAF Thresholds

| Quality Level | VMAF | Description |
|---------------|------|-------------|
| **Excellent** | >90 | Netflix broadcast quality |
| **Good** | 80-90 | High quality streaming |
| **Acceptable** | 70-80 | Standard streaming |
| **Poor** | <70 | Noticeable compression |

### 2.4 FFmpeg Quality Commands

```bash
# PSNR (fastest)
ffmpeg -i reference.mp4 -i encoded.mp4 \
  -lavfi psnr=stats_file=psnr.log \
  -f null -

# SSIM (medium speed)
ffmpeg -i reference.mp4 -i encoded.mp4 \
  -lavfi ssim=stats_file=ssim.log \
  -f null -

# VMAF (slowest, most accurate)
ffmpeg -i reference.mp4 -i encoded.mp4 \
  -lavfi libvmaf=log_path=vmaf.json:log_fmt=json \
  -f null -
```

---

## 3. CRF Guidelines

### 3.1 CRF vs File Size vs Quality

| CRF (h264) | Quality | File Size | Use Case |
|------------|---------|-----------|----------|
| 0 | Lossless | Huge | Master/Archive |
| 15-17 | Excellent | Large | Final delivery |
| 18-20 | Very Good | Medium | **Default** |
| 21-23 | Good | Smaller | Web streaming |
| 24-28 | Acceptable | Small | Mobile/preview |
| 29+ | Poor | Tiny | Thumbnails only |

### 3.2 Remotion CRF Recommendations

**Source:** [vendor/remotion/packages/docs](../../../vendor/remotion/packages/docs)

```typescript
// For TikTok/Reels (1080x1920)
const tiktokConfig = {
  codec: "h264",
  crf: 18,
  // Results in ~2-4 MB per 15 seconds
};

// For YouTube Shorts (high quality)
const youtubeConfig = {
  codec: "h264",
  crf: 16,
  // Results in ~4-6 MB per 15 seconds
};

// For previews (fast encoding)
const previewConfig = {
  codec: "h264",
  crf: 28,
  // Results in ~500KB-1MB per 15 seconds
};
```

---

## 4. Recommended Implementation

### 4.1 Quality Measurement Helper

```typescript
// src/render/quality.ts
import { execa } from "execa";

interface QualityMetrics {
  psnr: number;      // dB
  ssim: number;      // 0-1
  vmaf?: number;     // 0-100 (optional, slow)
  fileSize: number;  // bytes
  bitrate: number;   // bps
}

export async function measureQuality(
  reference: string,
  encoded: string,
  includeVmaf: boolean = false
): Promise<QualityMetrics> {
  const psnr = await measurePSNR(reference, encoded);
  const ssim = await measureSSIM(reference, encoded);
  const vmaf = includeVmaf ? await measureVMAF(reference, encoded) : undefined;
  const { size, bitrate } = await getFileStats(encoded);
  
  return { psnr, ssim, vmaf, fileSize: size, bitrate };
}

async function measurePSNR(ref: string, enc: string): Promise<number> {
  const { stderr } = await execa("ffmpeg", [
    "-i", ref, "-i", enc,
    "-lavfi", "psnr",
    "-f", "null", "-"
  ]);
  
  const match = stderr.match(/average:([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

async function measureSSIM(ref: string, enc: string): Promise<number> {
  const { stderr } = await execa("ffmpeg", [
    "-i", ref, "-i", enc,
    "-lavfi", "ssim",
    "-f", "null", "-"
  ]);
  
  const match = stderr.match(/All:([\d.]+)/);
  return match ? parseFloat(match[1]) : 0;
}

async function measureVMAF(ref: string, enc: string): Promise<number> {
  const { stderr } = await execa("ffmpeg", [
    "-i", ref, "-i", enc,
    "-lavfi", "libvmaf=log_fmt=json:log_path=/dev/stdout",
    "-f", "null", "-"
  ]);
  
  try {
    const result = JSON.parse(stderr);
    return result.pooled_metrics.vmaf.mean;
  } catch {
    return 0;
  }
}
```

### 4.2 Quality Validation

```typescript
interface QualityThresholds {
  minPsnr?: number;
  minSsim?: number;
  minVmaf?: number;
  maxFileSize?: number;
}

const DEFAULT_THRESHOLDS: QualityThresholds = {
  minPsnr: 35,      // Good quality
  minSsim: 0.95,    // Good quality
  minVmaf: 80,      // Good streaming
};

export function validateQuality(
  metrics: QualityMetrics,
  thresholds: QualityThresholds = DEFAULT_THRESHOLDS
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  
  if (thresholds.minPsnr && metrics.psnr < thresholds.minPsnr) {
    issues.push(`PSNR ${metrics.psnr.toFixed(1)}dB below threshold ${thresholds.minPsnr}dB`);
  }
  
  if (thresholds.minSsim && metrics.ssim < thresholds.minSsim) {
    issues.push(`SSIM ${metrics.ssim.toFixed(3)} below threshold ${thresholds.minSsim}`);
  }
  
  if (thresholds.minVmaf && metrics.vmaf && metrics.vmaf < thresholds.minVmaf) {
    issues.push(`VMAF ${metrics.vmaf.toFixed(1)} below threshold ${thresholds.minVmaf}`);
  }
  
  if (thresholds.maxFileSize && metrics.fileSize > thresholds.maxFileSize) {
    issues.push(`File size ${formatBytes(metrics.fileSize)} exceeds ${formatBytes(thresholds.maxFileSize)}`);
  }
  
  return { valid: issues.length === 0, issues };
}
```

### 4.3 CI Test Integration

```typescript
// test/quality/video-quality.test.ts
import { measureQuality, validateQuality } from "../src/render/quality";

describe("Video Quality", () => {
  const reference = "./fixtures/reference.mp4";
  const testOutputs = [
    { name: "crf-18", file: "./outputs/crf-18.mp4", minPsnr: 38 },
    { name: "crf-23", file: "./outputs/crf-23.mp4", minPsnr: 33 },
  ];
  
  for (const output of testOutputs) {
    it(`${output.name} meets quality threshold`, async () => {
      const metrics = await measureQuality(reference, output.file);
      const result = validateQuality(metrics, { minPsnr: output.minPsnr });
      
      expect(result.valid).toBe(true);
      expect(result.issues).toEqual([]);
    });
  }
});
```

---

## 5. Platform-Specific Guidelines

### 5.1 TikTok Requirements

| Metric | Requirement |
|--------|-------------|
| Resolution | 1080x1920 |
| Aspect Ratio | 9:16 |
| Max File Size | 287.6 MB |
| Max Duration | 10 minutes |
| Recommended Bitrate | 6-10 Mbps |
| Codec | H.264 |

### 5.2 YouTube Shorts

| Metric | Requirement |
|--------|-------------|
| Resolution | 1080x1920 |
| Aspect Ratio | 9:16 |
| Max File Size | 256 GB |
| Max Duration | 60 seconds |
| Recommended Bitrate | 8-12 Mbps |
| Codec | H.264 or VP9 |

### 5.3 Instagram Reels

| Metric | Requirement |
|--------|-------------|
| Resolution | 1080x1920 |
| Aspect Ratio | 9:16 |
| Max File Size | 4 GB |
| Max Duration | 90 seconds |
| Recommended Bitrate | 5-8 Mbps |
| Codec | H.264 |

---

## 6. Quality Presets

```typescript
export const QUALITY_PRESETS = {
  preview: {
    crf: 28,
    thresholds: { minPsnr: 28, minSsim: 0.85 },
    description: "Fast preview, lower quality",
  },
  
  standard: {
    crf: 23,
    thresholds: { minPsnr: 33, minSsim: 0.92 },
    description: "Balanced quality and size",
  },
  
  high: {
    crf: 18,
    thresholds: { minPsnr: 38, minSsim: 0.96 },
    description: "High quality for final delivery",
  },
  
  master: {
    crf: 15,
    thresholds: { minPsnr: 42, minSsim: 0.98 },
    description: "Near-lossless archive quality",
  },
} as const;
```

---

## 7. Implementation Recommendations

| Metric | CI Stage | Threshold | Speed |
|--------|----------|-----------|-------|
| PSNR | Every PR | >35 dB | Fast |
| SSIM | Every PR | >0.95 | Medium |
| VMAF | Nightly | >80 | Slow |
| File Size | Every PR | <10MB/15s | Instant |

---

## 8. References

- [FFmpeg Filter Documentation](https://ffmpeg.org/ffmpeg-filters.html) — PSNR/SSIM/VMAF
- [Netflix VMAF](https://github.com/Netflix/vmaf) — VMAF reference implementation
- [vendor/remotion/packages/renderer](../../../vendor/remotion/packages/renderer) — CRF defaults
- [TikTok Video Specs](https://support.tiktok.com/en/using-tiktok/creating-videos) — Platform requirements
- [SECTION-VIDEO-RENDERING-20260104.md](../sections/SECTION-VIDEO-RENDERING-20260104.md) — Rendering pipeline
