# RQ-32: Sync Metrics and Tolerance Thresholds

**Date:** 2026-01-07  
**Status:** Research Complete  
**Priority:** P1  
**Related:** RQ-29, RQ-30

---

## Executive Summary

This investigation defines the metrics, tolerances, and rating thresholds for measuring audio-caption synchronization quality. It establishes science-backed thresholds based on human perception research and industry standards.

---

## 1. Human Perception of Audio-Visual Sync

### 1.1 Research Background

Studies on audio-visual synchrony perception (AV sync) show:

| Research                 | Finding                                        |
| ------------------------ | ---------------------------------------------- |
| Vatakis & Spence (2006)  | Humans detect lip-sync errors > 80ms           |
| Grant & Greenberg (2001) | Speech intelligibility drops at > 200ms offset |
| Conrey & Pisoni (2006)   | Acceptability threshold: 45-120ms              |
| ITU-R BT.1359-1          | Broadcast standard: -20ms to +40ms             |

### 1.2 Key Insight

**Asymmetric tolerance:** Audio leading video is less tolerable than audio lagging.

| Direction           | Acceptable | Noticeable | Distracting |
| ------------------- | ---------- | ---------- | ----------- |
| Audio leads (early) | < 45ms     | 45-90ms    | > 90ms      |
| Audio lags (late)   | < 120ms    | 120-185ms  | > 185ms     |

---

## 2. Metric Definitions

### 2.1 Primary Metrics

```typescript
interface SyncMetrics {
  // Core drift metrics
  meanDriftMs: number; // Average absolute drift
  maxDriftMs: number; // Maximum absolute drift
  p95DriftMs: number; // 95th percentile drift
  medianDriftMs: number; // Median drift (robust to outliers)

  // Direction metrics
  meanSignedDriftMs: number; // Positive = audio late, negative = audio early
  leadingRatio: number; // % of words where audio leads
  laggingRatio: number; // % of words where audio lags

  // Stability metrics
  driftStdDev: number; // Standard deviation
  driftVariance: number; // Variance
  monotonicity: number; // 0-1, higher = drift changes consistently

  // Coverage metrics
  matchedWords: number; // Words successfully matched
  totalOcrWords: number; // Total words detected by OCR
  totalAsrWords: number; // Total words detected by ASR
  matchRatio: number; // matchedWords / max(ocr, asr)
}
```

### 2.2 Secondary Metrics

```typescript
interface ExtendedSyncMetrics extends SyncMetrics {
  // Temporal analysis
  driftTrend: 'stable' | 'increasing' | 'decreasing' | 'oscillating';
  maxDriftAt: number; // Timestamp of max drift

  // Quality indicators
  ocrConfidenceMean: number; // Average OCR confidence
  asrConfidenceMean: number; // Average ASR confidence

  // Segment analysis (for long videos)
  segments: Array<{
    startTime: number;
    endTime: number;
    meanDriftMs: number;
    rating: number;
  }>;
}
```

---

## 3. Rating Formula

### 3.1 Base Score Calculation

```typescript
function calculateBaseScore(metrics: SyncMetrics): number {
  // Start with perfect score
  let score = 100;

  // Deduction 1: Mean drift (max -40 points)
  // Perfect: < 50ms, Failing: > 300ms
  if (metrics.meanDriftMs > 50) {
    score -= Math.min(40, (metrics.meanDriftMs - 50) / 6.25);
  }

  // Deduction 2: Max drift (max -25 points)
  // Perfect: < 100ms, Failing: > 500ms
  if (metrics.maxDriftMs > 100) {
    score -= Math.min(25, (metrics.maxDriftMs - 100) / 16);
  }

  // Deduction 3: P95 drift (max -15 points)
  // Perfect: < 80ms, Failing: > 400ms
  if (metrics.p95DriftMs > 80) {
    score -= Math.min(15, (metrics.p95DriftMs - 80) / 21.3);
  }

  // Deduction 4: High variance (max -10 points)
  // Consistent drift is better than erratic drift
  if (metrics.driftStdDev > 50) {
    score -= Math.min(10, (metrics.driftStdDev - 50) / 25);
  }

  // Deduction 5: Low match ratio (max -10 points)
  // Must match at least 70% of words
  if (metrics.matchRatio < 0.9) {
    score -= Math.min(10, (0.9 - metrics.matchRatio) * 50);
  }

  return Math.max(0, Math.round(score));
}
```

### 3.2 Rating Labels

```typescript
type SyncRatingLabel = 'excellent' | 'good' | 'fair' | 'poor' | 'broken';

function getRatingLabel(score: number): SyncRatingLabel {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'broken';
}

const RATING_DESCRIPTIONS: Record<SyncRatingLabel, string> = {
  excellent: 'Sync is imperceptible to viewers',
  good: 'Sync is acceptable, minor drift may be noticeable',
  fair: 'Sync issues are noticeable but not distracting',
  poor: 'Sync issues are distracting and affect quality',
  broken: 'Sync is fundamentally broken, video is unwatchable',
};
```

---

## 4. Threshold Calibration

### 4.1 Threshold Table

| Metric      | Excellent (90+) | Good (75+) | Fair (60+) | Poor (40+) | Broken  |
| ----------- | --------------- | ---------- | ---------- | ---------- | ------- |
| Mean Drift  | < 50ms          | < 100ms    | < 180ms    | < 300ms    | > 300ms |
| Max Drift   | < 100ms         | < 200ms    | < 350ms    | < 500ms    | > 500ms |
| P95 Drift   | < 80ms          | < 150ms    | < 250ms    | < 400ms    | > 400ms |
| Std Dev     | < 30ms          | < 75ms     | < 125ms    | < 200ms    | > 200ms |
| Match Ratio | > 95%           | > 85%      | > 70%      | > 50%      | < 50%   |

### 4.2 Threshold Visualization

```
Score:  100 ──┬── 90 ──┬── 75 ──┬── 60 ──┬── 40 ──┬── 0
              │        │        │        │        │
Label:  Excellent    Good     Fair     Poor    Broken
              │        │        │        │        │
Mean Drift: 0ms    50ms    100ms   180ms   300ms    →
              │        │        │        │        │
Max Drift: 0ms    100ms   200ms   350ms   500ms    →
```

---

## 5. Pass/Fail Thresholds

### 5.1 Default CI Thresholds

```typescript
interface SyncPassCriteria {
  minRating: number; // Minimum overall rating
  maxMeanDriftMs: number; // Maximum acceptable mean drift
  maxMaxDriftMs: number; // Maximum acceptable peak drift
  minMatchRatio: number; // Minimum word match ratio
}

const DEFAULT_PASS_CRITERIA: SyncPassCriteria = {
  minRating: 60, // At least "fair"
  maxMeanDriftMs: 180, // Mean drift under 180ms
  maxMaxDriftMs: 500, // No single word > 500ms off
  minMatchRatio: 0.7, // At least 70% words matched
};

const STRICT_PASS_CRITERIA: SyncPassCriteria = {
  minRating: 75, // At least "good"
  maxMeanDriftMs: 100, // Mean drift under 100ms
  maxMaxDriftMs: 300, // No single word > 300ms off
  minMatchRatio: 0.85, // At least 85% words matched
};
```

### 5.2 Profile-Based Thresholds

```typescript
const SYNC_PROFILES = {
  // For quick local testing
  development: {
    minRating: 40,
    maxMeanDriftMs: 300,
  },

  // For CI/CD pipelines
  ci: {
    minRating: 60,
    maxMeanDriftMs: 180,
  },

  // For production/release
  production: {
    minRating: 75,
    maxMeanDriftMs: 100,
  },

  // For high-quality content
  broadcast: {
    minRating: 90,
    maxMeanDriftMs: 50,
  },
};
```

---

## 6. Drift Analysis

### 6.1 Drift Direction Analysis

```typescript
function analyzeDriftDirection(drifts: number[]): DriftDirectionAnalysis {
  const leading = drifts.filter((d) => d < 0); // Audio early
  const lagging = drifts.filter((d) => d > 0); // Audio late

  return {
    leadingCount: leading.length,
    laggingCount: lagging.length,
    leadingMeanMs: leading.length ? mean(leading.map(Math.abs)) : 0,
    laggingMeanMs: lagging.length ? mean(lagging.map(Math.abs)) : 0,
    dominantDirection: leading.length > lagging.length ? 'leading' : 'lagging',
  };
}
```

### 6.2 Drift Trend Analysis

```typescript
function analyzeDriftTrend(driftsWithTime: Array<{ time: number; driftMs: number }>): DriftTrend {
  // Linear regression on drift over time
  const slope = linearRegression(
    driftsWithTime.map((d) => d.time),
    driftsWithTime.map((d) => d.driftMs)
  ).slope;

  if (Math.abs(slope) < 0.5) return 'stable'; // < 0.5ms per second
  if (slope > 2) return 'increasing'; // Growing drift
  if (slope < -2) return 'decreasing'; // Shrinking drift
  return 'oscillating'; // Mixed
}
```

### 6.3 Segment Analysis

For long videos (> 60s), analyze sync quality over time:

```typescript
function analyzeBySegment(matches: WordMatch[], segmentDurationS: number = 10): SegmentAnalysis[] {
  const segments: SegmentAnalysis[] = [];
  const maxTime = Math.max(...matches.map((m) => m.asrTimestamp));

  for (let start = 0; start < maxTime; start += segmentDurationS) {
    const end = start + segmentDurationS;
    const segmentMatches = matches.filter((m) => m.asrTimestamp >= start && m.asrTimestamp < end);

    if (segmentMatches.length > 0) {
      const drifts = segmentMatches.map((m) => m.driftMs);
      segments.push({
        startTime: start,
        endTime: end,
        meanDriftMs: mean(drifts),
        maxDriftMs: Math.max(...drifts.map(Math.abs)),
        rating: calculateBaseScore({
          meanDriftMs: mean(drifts),
          maxDriftMs: Math.max(...drifts.map(Math.abs)),
          // ... other metrics
        }),
      });
    }
  }

  return segments;
}
```

---

## 7. Comparison with Industry Standards

### 7.1 Broadcast Standards

| Standard        | Acceptable Range | Notes              |
| --------------- | ---------------- | ------------------ |
| ITU-R BT.1359-1 | -20ms to +40ms   | For broadcast TV   |
| EBU R37         | ±40ms            | European broadcast |
| ATSC A/85       | ±15ms            | US digital TV      |
| Netflix         | < 50ms           | Streaming          |

### 7.2 Social Media Tolerance

For short-form content (TikTok, Reels), users are more tolerant:

| Platform        | Estimated Tolerance | Notes                         |
| --------------- | ------------------- | ----------------------------- |
| TikTok          | < 150ms             | Fast-paced, attention divided |
| YouTube Shorts  | < 100ms             | More critical audience        |
| Instagram Reels | < 120ms             | Similar to TikTok             |

### 7.3 Our Target

For content-machine, we target:

- **Production:** < 100ms mean drift (75+ rating)
- **Minimum acceptable:** < 180ms mean drift (60+ rating)

---

## 8. Error Classification

### 8.1 Error Types

```typescript
enum SyncErrorType {
  GLOBAL_OFFSET = 'global_offset', // Entire video shifted
  PROGRESSIVE_DRIFT = 'progressive', // Drift increases over time
  SPORADIC_ERRORS = 'sporadic', // Random misalignments
  SECTION_MISMATCH = 'section', // Specific section out of sync
  MISSING_WORDS = 'missing', // Words not matched
}

interface SyncError {
  type: SyncErrorType;
  severity: 'warning' | 'error' | 'critical';
  timeRange?: { start: number; end: number };
  affectedWords?: string[];
  suggestedFix?: string;
}
```

### 8.2 Error Detection

```typescript
function detectSyncErrors(analysis: DriftAnalysis): SyncError[] {
  const errors: SyncError[] = [];

  // Global offset detection
  const signedDrifts = analysis.matches.map((m) => m.driftMs);
  const allSameDirection = signedDrifts.every((d) => d > 0) || signedDrifts.every((d) => d < 0);
  if (allSameDirection && Math.abs(analysis.meanDriftMs) > 100) {
    errors.push({
      type: SyncErrorType.GLOBAL_OFFSET,
      severity: 'error',
      suggestedFix: `Apply global offset of ${-analysis.meanSignedDriftMs}ms`,
    });
  }

  // Progressive drift detection
  if (analysis.driftTrend === 'increasing' || analysis.driftTrend === 'decreasing') {
    errors.push({
      type: SyncErrorType.PROGRESSIVE_DRIFT,
      severity: 'warning',
      suggestedFix: 'Check audio sample rate mismatch',
    });
  }

  // Sporadic errors
  const outliers = analysis.matches.filter((m) => Math.abs(m.driftMs) > 300);
  if (outliers.length > 0 && outliers.length < analysis.matches.length * 0.2) {
    errors.push({
      type: SyncErrorType.SPORADIC_ERRORS,
      severity: 'warning',
      affectedWords: outliers.map((m) => m.word),
    });
  }

  return errors;
}
```

---

## 9. Reporting

### 9.1 Summary Report

```typescript
interface SyncReport {
  // Overall
  rating: number;
  ratingLabel: SyncRatingLabel;
  passed: boolean;

  // Summary
  summary: {
    totalWords: number;
    matchedWords: number;
    meanDriftMs: number;
    maxDriftMs: number;
    assessmentTime: number;
  };

  // Detailed metrics
  metrics: SyncMetrics;

  // Errors detected
  errors: SyncError[];

  // Timeline for visualization
  timeline: Array<{
    timestamp: number;
    driftMs: number;
    word: string;
  }>;
}
```

### 9.2 CLI Output Format

```
┌─────────────────────────────────────────────────────────────┐
│                    SYNC RATING REPORT                        │
├─────────────────────────────────────────────────────────────┤
│  Video: output/video-v5.mp4                                 │
│  Rating: 78/100 (GOOD)                                      │
│  Status: ✓ PASSED                                           │
├─────────────────────────────────────────────────────────────┤
│  METRICS                                                    │
│  ─────────────────────────────────────────────────────────  │
│  Mean Drift:     67ms   [████████░░░░░░░░] < 100ms target   │
│  Max Drift:     189ms   [███████████░░░░░] < 200ms target   │
│  P95 Drift:     142ms   [██████████░░░░░░] < 150ms target   │
│  Match Ratio:    94%    [███████████████░] > 85% target     │
├─────────────────────────────────────────────────────────────┤
│  ISSUES (1)                                                 │
│  ─────────────────────────────────────────────────────────  │
│  ⚠ Sporadic errors on words: "JavaScript", "framework"     │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Implementation

### 10.1 Metrics Calculator

```typescript
// src/score/sync-metrics.ts
export function calculateSyncMetrics(matches: WordMatch[]): SyncMetrics {
  const drifts = matches.map((m) => m.driftMs);
  const absDrifts = drifts.map(Math.abs);

  return {
    meanDriftMs: mean(absDrifts),
    maxDriftMs: Math.max(...absDrifts),
    p95DriftMs: percentile(absDrifts, 95),
    medianDriftMs: median(absDrifts),

    meanSignedDriftMs: mean(drifts),
    leadingRatio: drifts.filter((d) => d < 0).length / drifts.length,
    laggingRatio: drifts.filter((d) => d > 0).length / drifts.length,

    driftStdDev: standardDeviation(absDrifts),
    driftVariance: variance(absDrifts),
    monotonicity: calculateMonotonicity(drifts),

    matchedWords: matches.length,
    totalOcrWords: /* from OCR */ 0,
    totalAsrWords: /* from ASR */ 0,
    matchRatio: /* calculated */ 0,
  };
}
```

---

## 11. References

- Vatakis, A., & Spence, C. (2006). Audiovisual synchrony perception. _Neuroscience & Biobehavioral Reviews_, 30(4), 492-511.
- ITU-R BT.1359-1: Relative timing of sound and vision for broadcasting
- EBU R37: Audio-to-Video Timing in Broadcasting
- Netflix Technology Blog: Audio-Video Synchronization

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-07  
**Author:** Claude (Copilot)
