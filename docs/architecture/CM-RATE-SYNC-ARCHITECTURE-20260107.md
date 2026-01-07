# How `cm rate` Enables Sync Quality Control

**Date:** 2026-01-07  
**Type:** Architecture Note

---

## Overview

The `cm rate` command provides **post-render verification** of audio-video synchronization. This document explains how it fits into the sync quality system and enables closed-loop quality control.

---

## The Quality Loop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Closed-Loop Sync Quality                             │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         GENERATION                                    │   │
│   │                                                                       │   │
│   │   cm script ──▶ cm audio ──▶ cm visuals ──▶ cm render ──┐           │   │
│   │                   │                                      │           │   │
│   │                   ▼                                      │           │   │
│   │            ┌───────────────┐                             │           │   │
│   │            │ SyncStrategy  │                             │           │   │
│   │            │               │                             │           │   │
│   │            │ • standard    │                             │           │   │
│   │            │ • audio-first │                             │           │   │
│   │            │ • forced-align│                             │           │   │
│   │            └───────────────┘                             │           │   │
│   │                                                          ▼           │   │
│   └──────────────────────────────────────────────────── video.mp4 ──────┘   │
│                                                              │               │
│                                                              ▼               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         VERIFICATION                                  │   │
│   │                                                                       │   │
│   │                       ┌───────────────┐                              │   │
│   │                       │   cm rate     │                              │   │
│   │                       │               │                              │   │
│   │   video.mp4 ─────────▶│ OCR + ASR     │──────▶ sync-report.json      │   │
│   │                       │ Comparison    │                              │   │
│   │                       │ Drift Detect  │                              │   │
│   │                       └───────────────┘                              │   │
│   │                              │                                        │   │
│   │                              ▼                                        │   │
│   │                     Rating: 85/100 ✓                                 │   │
│   │                                                                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                              │               │
│                                                              ▼               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         FEEDBACK (Future)                             │   │
│   │                                                                       │   │
│   │   If rating < threshold:                                             │   │
│   │     1. Retry with better strategy                                    │   │
│   │     2. Learn optimal strategy per archetype                          │   │
│   │     3. Auto-adjust parameters                                        │   │
│   │                                                                       │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## What `cm rate` Measures

### 1. Word-Level Synchronization

```bash
cm rate --input video.mp4 --output sync-report.json
```

**Process:**

1. Extract video frames at 2 FPS (configurable)
2. Run OCR (Tesseract) on caption region to get displayed text timeline
3. Extract audio and run ASR (Whisper) to get spoken word timeline
4. Match OCR words to ASR words using Levenshtein similarity
5. Calculate drift for each matched word pair
6. Aggregate into sync rating

**Metrics Produced:**

| Metric        | Description                     | Good Range |
| ------------- | ------------------------------- | ---------- |
| `meanDriftMs` | Average absolute drift          | < 80ms     |
| `maxDriftMs`  | Maximum absolute drift          | < 200ms    |
| `p95DriftMs`  | 95th percentile drift           | < 150ms    |
| `matchRatio`  | % of words successfully matched | > 85%      |
| `rating`      | Overall sync quality (0-100)    | ≥ 75       |

### 2. Drift Pattern Detection

`cm rate` identifies these drift patterns:

| Pattern               | Cause                   | Detection                  |
| --------------------- | ----------------------- | -------------------------- |
| **Global offset**     | Frame timing mismatch   | All drifts same direction  |
| **Progressive drift** | Sample rate mismatch    | Drift increases over time  |
| **Sporadic errors**   | ASR uncertainty         | Random high-drift words    |
| **Section mismatch**  | Scene transition issues | Drift spikes at boundaries |

### 3. Actionable Suggestions

The report includes fix suggestions:

```json
{
  "errors": [
    {
      "type": "global_offset",
      "severity": "error",
      "message": "Consistent positive drift detected",
      "suggestedFix": "Apply global offset of -150ms"
    }
  ]
}
```

---

## Integration Points

### 1. Quality Gate in `cm generate`

```bash
# Fail if sync rating < 80
cm generate "Redis vs PostgreSQL" \
  --sync-quality-check \
  --min-sync-rating 80
```

**Behavior:**

- Generates video with default strategy
- Runs `cm rate` automatically
- Fails pipeline if rating below threshold
- Reports rating in JSON output

### 2. Auto-Retry with Strategy Escalation

```bash
# Retry with better strategy if rating fails
cm generate "5 JavaScript tips" \
  --sync-quality-check \
  --min-sync-rating 85 \
  --auto-retry-sync
```

**Strategy Escalation Order:**

1. `standard` (fast, may fall back to estimation)
2. `audio-first` (requires whisper, higher accuracy)
3. `forced-align` (phoneme-level, highest accuracy)

### 3. Presets (Convenience)

```bash
# Quality preset: enables audio-first + quality check
cm generate "Topic" --sync-preset quality

# Maximum preset: forced-align + strict quality check
cm generate "Topic" --sync-preset maximum
```

---

## Benefits of `cm rate`

### For Development

- **Debug sync issues**: See exactly which words are drifting
- **Compare strategies**: Measure improvement from audio-first vs standard
- **Catch regressions**: CI can fail if sync degrades

### For Production

- **Quality assurance**: Only publish videos meeting threshold
- **Auto-healing**: System can retry with better strategy
- **Analytics**: Track sync quality across content types

### For Optimization

- **Learn patterns**: Collect ratings to learn optimal strategy per archetype
- **Tune parameters**: Use drift analysis to improve reconciliation
- **Benchmark**: Compare before/after when changing sync approach

---

## CLI Reference

### Basic Usage

```bash
# Analyze sync quality
cm rate --input video.mp4

# Save report
cm rate --input video.mp4 --output report.json

# Fail if below threshold
cm rate --input video.mp4 --min-rating 80
```

### Options

| Option                | Default            | Description                 |
| --------------------- | ------------------ | --------------------------- |
| `-i, --input <path>`  | Required           | Video file to analyze       |
| `-o, --output <path>` | `sync-report.json` | Output report path          |
| `--fps <n>`           | `2`                | Frames per second to sample |
| `--min-rating <n>`    | `75`               | Fail if rating below this   |

### Output Example

```json
{
  "rating": 85,
  "ratingLabel": "good",
  "passed": true,
  "metrics": {
    "meanDriftMs": 45,
    "maxDriftMs": 180,
    "p95DriftMs": 95,
    "matchRatio": 0.92
  },
  "errors": [],
  "driftTimeline": [
    { "timestamp": 0.5, "driftMs": 30 },
    { "timestamp": 1.2, "driftMs": 45 },
    ...
  ]
}
```

---

## Implementation Status

| Component                 | Status      | Location                                                |
| ------------------------- | ----------- | ------------------------------------------------------- |
| `cm rate` command         | ✅ Complete | [src/cli/commands/rate.ts](../src/cli/commands/rate.ts) |
| `rateSyncQuality()`       | ✅ Complete | [src/score/sync-rater.ts](../src/score/sync-rater.ts)   |
| `SyncRatingOutput` schema | ✅ Complete | [src/score/sync-schema.ts](../src/score/sync-schema.ts) |
| Quality gate in generate  | 📋 Planned  | TASK-024                                                |
| Auto-retry                | 📋 Planned  | TASK-024                                                |
| Strategy learning         | 🔮 Future   | —                                                       |

---

## Related Documentation

- [IMPL-SYNC-STRATEGIES-20260107](IMPL-SYNC-STRATEGIES-20260107.md) - Full implementation plan
- [SYNC-CONFIG-REFERENCE-20260107](../reference/SYNC-CONFIG-REFERENCE-20260107.md) - CLI/config reference
- [RQ-30: Sync Pipeline Architecture](../research/investigations/RQ-30-SYNC-PIPELINE-ARCHITECTURE-20260107.md) - Research
- [RQ-34: Drift Detection Strategies](../research/investigations/RQ-34-DRIFT-DETECTION-RETIMING-STRATEGIES-20260107.md) - Research
