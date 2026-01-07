# RQ-29: Video Sync Rating System

**Date:** 2026-01-07  
**Status:** Research Complete  
**Priority:** P0  
**Related:** RQ-13, RQ-24, TASK-014

---

## Executive Summary

This investigation proposes a **Video Sync Rating System** that provides a quantitative "north star" metric for caption-audio synchronization quality. The system uses two independent analysis channels:

1. **OCR Channel:** Extract displayed text timestamps from video frames
2. **ASR Channel:** Extract spoken word timestamps from audio track

By comparing these two independent sources, we can objectively measure sync drift and provide actionable ratings.

---

## 1. Problem Statement

### Current Issues

1. Captions appear out of sync with spoken audio
2. No automated way to verify sync quality after render
3. Manual review is subjective and time-consuming
4. Sync issues may only appear at certain points in the video

### North Star Goal

A single **Sync Rating** (0-100) that indicates:
- **100:** Perfect sync (< 50ms drift)
- **80-99:** Good sync (50-150ms drift, acceptable)
- **60-79:** Fair sync (150-300ms drift, noticeable)
- **40-59:** Poor sync (300-500ms drift, distracting)
- **0-39:** Broken sync (> 500ms drift, unwatchable)

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Video Sync Rater                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │  Video Input    │─────────│  Audio Extract  │               │
│  │  (MP4/WebM)     │         │  (FFmpeg)       │               │
│  └────────┬────────┘         └────────┬────────┘               │
│           │                           │                         │
│           ▼                           ▼                         │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │  Frame Extract  │         │  ASR Process    │               │
│  │  (FFmpeg 1fps)  │         │  (Whisper)      │               │
│  └────────┬────────┘         └────────┬────────┘               │
│           │                           │                         │
│           ▼                           ▼                         │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │  OCR Process    │         │  Word Timeline  │               │
│  │  (Tesseract/    │         │  { word, start, │               │
│  │   EasyOCR)      │         │    end }[]      │               │
│  └────────┬────────┘         └────────┬────────┘               │
│           │                           │                         │
│           ▼                           ▼                         │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │  Text Timeline  │─────────│   Comparator    │               │
│  │  { text, time } │         │  (Drift Calc)   │               │
│  └─────────────────┘         └────────┬────────┘               │
│                                       │                         │
│                                       ▼                         │
│                              ┌─────────────────┐               │
│                              │  Sync Report    │               │
│                              │  { rating: 85,  │               │
│                              │    drifts: [...] │               │
│                              │  }              │               │
│                              └─────────────────┘               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. OCR Channel Design

### 3.1 Frame Extraction Strategy

```typescript
interface FrameExtractionOptions {
  fps: number;        // Frames per second to extract (1-5 recommended)
  captionRegion?: {   // Optional crop to caption area
    x: number;
    y: number;
    width: number;
    height: number;
  };
  outputFormat: 'png' | 'jpg';
}

// FFmpeg command for frame extraction
// ffmpeg -i video.mp4 -vf "fps=1,crop=1080:200:0:1720" -q:v 2 frames/%04d.png
```

### 3.2 Caption Region Detection

For TikTok-style videos, captions are typically:
- **Position:** Bottom 15-25% of frame
- **Width:** Full width or centered
- **Style:** Large text, high contrast background

```typescript
const TIKTOK_CAPTION_REGION = {
  portrait: { y: 0.75, height: 0.20 }, // Bottom 20% starting at 75%
  landscape: { y: 0.80, height: 0.15 },
};
```

### 3.3 OCR Engine Options

| Engine | Speed | Accuracy | Language Support | License |
|--------|-------|----------|------------------|---------|
| Tesseract | Fast | Good | 100+ languages | Apache 2.0 |
| EasyOCR | Slow | Better | 80+ languages | Apache 2.0 |
| PaddleOCR | Medium | Best | 80+ languages | Apache 2.0 |
| Google Vision | Fast | Excellent | 200+ | Commercial |

**Recommendation:** Start with Tesseract (via `tesseract.js` or native), fallback to EasyOCR for accuracy.

### 3.4 OCR Pipeline

```typescript
interface OCRFrame {
  frameNumber: number;
  timestamp: number;      // Seconds
  rawText: string;        // Direct OCR output
  normalizedText: string; // Cleaned, uppercase
  confidence: number;     // 0-1
}

interface OCRTimeline {
  frames: OCRFrame[];
  wordTransitions: Array<{
    word: string;
    appearAt: number;     // First frame where word appears
    disappearAt: number;  // Last frame where word visible
  }>;
}
```

---

## 4. ASR Channel Design

### 4.1 Audio Extraction

```bash
# Extract audio track for ASR
ffmpeg -i video.mp4 -vn -acodec pcm_s16le -ar 16000 -ac 1 audio.wav
```

### 4.2 ASR Processing

Use existing `transcribeAudio()` from `src/audio/asr/index.ts`:

```typescript
import { transcribeAudio } from '../audio/asr';

const asrResult = await transcribeAudio({
  audioPath: 'audio.wav',
  model: 'small', // Better accuracy for rating
});

// Returns: { words: WordTimestamp[], duration: number, engine: string }
```

### 4.3 ASR Timeline

```typescript
interface ASRTimeline {
  words: Array<{
    word: string;
    start: number;  // Seconds
    end: number;    // Seconds
    confidence: number;
  }>;
  totalDuration: number;
}
```

---

## 5. Comparison Algorithm

### 5.1 Word Matching Strategy

```typescript
interface WordMatch {
  ocrWord: string;
  asrWord: string;
  ocrTimestamp: number;   // When word appeared on screen
  asrTimestamp: number;   // When word was spoken
  driftMs: number;        // Difference in milliseconds
  matchQuality: 'exact' | 'fuzzy' | 'phonetic';
}

function matchWords(ocr: OCRTimeline, asr: ASRTimeline): WordMatch[] {
  // 1. Normalize both word lists (lowercase, remove punctuation)
  // 2. Use sequence alignment (Levenshtein or Smith-Waterman)
  // 3. For each matched pair, calculate drift
  // 4. Handle OCR errors (fuzzy matching)
}
```

### 5.2 Drift Calculation

```typescript
interface DriftAnalysis {
  matches: WordMatch[];
  meanDriftMs: number;
  maxDriftMs: number;
  p95DriftMs: number;      // 95th percentile
  standardDeviation: number;
  outlierCount: number;    // Drifts > 500ms
}

function calculateDrift(matches: WordMatch[]): DriftAnalysis {
  const drifts = matches.map(m => Math.abs(m.driftMs));
  
  return {
    matches,
    meanDriftMs: mean(drifts),
    maxDriftMs: Math.max(...drifts),
    p95DriftMs: percentile(drifts, 95),
    standardDeviation: std(drifts),
    outlierCount: drifts.filter(d => d > 500).length,
  };
}
```

### 5.3 Rating Calculation

```typescript
function calculateSyncRating(analysis: DriftAnalysis): number {
  // Base score from mean drift
  let score = 100;
  
  // Deduct for mean drift
  if (analysis.meanDriftMs > 50) {
    score -= Math.min(40, (analysis.meanDriftMs - 50) / 10);
  }
  
  // Deduct for max drift
  if (analysis.maxDriftMs > 200) {
    score -= Math.min(30, (analysis.maxDriftMs - 200) / 20);
  }
  
  // Deduct for outliers
  const outlierRatio = analysis.outlierCount / analysis.matches.length;
  score -= Math.min(20, outlierRatio * 100);
  
  // Deduct for high variance
  if (analysis.standardDeviation > 100) {
    score -= Math.min(10, (analysis.standardDeviation - 100) / 20);
  }
  
  return Math.max(0, Math.round(score));
}
```

---

## 6. Output Schema

```typescript
// src/score/sync-schema.ts
import { z } from 'zod';

export const SyncRatingSchema = z.object({
  schemaVersion: z.string().default('1.0.0'),
  videoPath: z.string(),
  
  // Overall rating
  rating: z.number().int().min(0).max(100),
  ratingLabel: z.enum(['excellent', 'good', 'fair', 'poor', 'broken']),
  passed: z.boolean(),
  
  // Detailed metrics
  metrics: z.object({
    meanDriftMs: z.number(),
    maxDriftMs: z.number(),
    p95DriftMs: z.number(),
    standardDeviation: z.number(),
    matchedWords: z.number(),
    totalOcrWords: z.number(),
    totalAsrWords: z.number(),
    matchRatio: z.number(),
  }),
  
  // Individual word comparisons
  wordMatches: z.array(z.object({
    word: z.string(),
    ocrTimestamp: z.number(),
    asrTimestamp: z.number(),
    driftMs: z.number(),
  })),
  
  // Drift over time (for visualization)
  driftTimeline: z.array(z.object({
    timestamp: z.number(),
    driftMs: z.number(),
  })),
  
  // Analysis metadata
  analysis: z.object({
    ocrEngine: z.string(),
    asrEngine: z.string(),
    framesAnalyzed: z.number(),
    analysisTimeMs: z.number(),
  }),
  
  createdAt: z.string().datetime(),
});

export type SyncRating = z.infer<typeof SyncRatingSchema>;
```

---

## 7. CLI Integration

```bash
# Rate a single video
cm rate video.mp4 --output sync-report.json

# Rate with verbose drift timeline
cm rate video.mp4 --verbose --show-drift-chart

# Rate and fail if below threshold
cm rate video.mp4 --min-rating 75

# Rate using specific engines
cm rate video.mp4 --ocr tesseract --asr whisper-small
```

### CLI Options

| Option | Default | Description |
|--------|---------|-------------|
| `--ocr <engine>` | `tesseract` | OCR engine (tesseract, easyocr) |
| `--asr <model>` | `base` | Whisper model size |
| `--fps <n>` | `2` | Frames per second to analyze |
| `--min-rating <n>` | `60` | Minimum passing rating |
| `--caption-region` | `auto` | Caption region detection mode |
| `--output <path>` | stdout | Output JSON report path |

---

## 8. Implementation Plan

### Phase 1: OCR Pipeline (2-3 hours)
1. Frame extraction with FFmpeg
2. Tesseract.js integration
3. Caption region detection
4. Word transition tracking

### Phase 2: Comparison Algorithm (2-3 hours)
1. Word normalization
2. Sequence alignment (fuzzy matching)
3. Drift calculation
4. Rating formula

### Phase 3: CLI Integration (1-2 hours)
1. `cm rate` command
2. JSON output format
3. Pass/fail thresholds
4. Integration with `cm validate`

### Phase 4: Testing & Calibration (2-3 hours)
1. Test with known-good videos
2. Test with intentionally broken sync
3. Calibrate rating thresholds
4. Document expected ratings

---

## 9. Dependencies

### npm Packages

```json
{
  "tesseract.js": "^5.0.0",    // OCR engine (pure JS)
  "fluent-ffmpeg": "^2.1.2",   // Frame extraction
  "fuzzball": "^2.1.2"         // Fuzzy string matching
}
```

### System Dependencies

- **FFmpeg:** Required for frame/audio extraction
- **Tesseract (optional):** Native binary for faster OCR

---

## 10. Success Criteria

| Metric | Target |
|--------|--------|
| Rating accuracy | ±10 points of human assessment |
| Analysis time | < 30 seconds for 60s video |
| False positive rate | < 5% (marking good sync as bad) |
| False negative rate | < 10% (missing bad sync) |

---

## 11. Future Enhancements

1. **Real-time rating during render** - Stream frames as they render
2. **Visual drift chart** - Generate PNG/SVG showing drift over time
3. **Auto-repair suggestions** - Suggest timestamp adjustments
4. **ML-based matching** - Train model on OCR error patterns
5. **Integration with CI/CD** - Fail builds on low sync rating

---

## 12. References

- Tesseract.js: https://tesseract.projectnaptha.com/
- EasyOCR: https://github.com/JaidedAI/EasyOCR
- Whisper: https://github.com/openai/whisper
- Remotion Whisper: https://www.remotion.dev/docs/install-whisper-cpp

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-07  
**Author:** Claude (Copilot)
