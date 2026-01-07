# Sync Rating & Audio-First Pipeline Implementation Summary

**Date:** 2026-01-07  
**Status:** Implementation Complete, Ready for Experiments

## What Was Implemented

### 1. Research Documents (5 Documents)

| Document                                                                                  | Purpose                   | Key Findings                                         |
| ----------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------- |
| [RQ-29](docs/research/investigations/RQ-29-VIDEO-SYNC-RATING-SYSTEM-20260107.md)          | Sync rating architecture  | OCR + ASR comparison with drift metrics              |
| [RQ-30](docs/research/investigations/RQ-30-AUDIO-FIRST-PIPELINE-ARCHITECTURE-20260107.md) | Audio-first pipeline      | Require Whisper ASR for ground-truth timestamps      |
| [RQ-31](docs/research/investigations/RQ-31-OCR-TECHNOLOGIES-VIDEO-CAPTION-20260107.md)    | OCR technology comparison | Tesseract.js recommended (pure JS, no native deps)   |
| [RQ-32](docs/research/investigations/RQ-32-SYNC-METRICS-TOLERANCE-THRESHOLDS-20260107.md) | Sync metrics & thresholds | Human perception: ±50ms excellent, ≤180ms acceptable |
| [RQ-33](docs/research/investigations/RQ-33-PIPELINE-COMPARISON-EXPERIMENT-20260107.md)    | Experiment design         | Methodology for comparing standard vs audio-first    |

### 2. Sync Rater Module

**Files Created:**

- [src/score/sync-schema.ts](src/score/sync-schema.ts) - Zod schemas for sync rating
- [src/score/sync-rater.ts](src/score/sync-rater.ts) - Core rating implementation
- [src/score/sync-rater.test.ts](src/score/sync-rater.test.ts) - Unit tests
- [src/score/index.ts](src/score/index.ts) - Updated exports

**How It Works:**

1. Extract video frames at 2 FPS (configurable)
2. Crop to caption region (bottom 25% of frame)
3. Run Tesseract.js OCR on each frame
4. Extract audio and run Whisper ASR
5. Match OCR words to ASR words (exact + fuzzy matching)
6. Calculate drift for each word (ms difference)
7. Compute metrics: mean/max/p95 drift, match ratio
8. Apply rating formula → 0-100 score

**Rating Formula:**

- Base score: 100
- Mean drift >50ms: up to -40 points
- Max drift >100ms: up to -25 points
- P95 drift >80ms: up to -15 points
- High variance: up to -10 points
- Low match ratio: up to -10 points

**Rating Labels:**

- 90+: Excellent
- 75-89: Good
- 60-74: Fair
- 40-59: Poor
- <40: Broken

### 3. CLI Command: `cm rate`

```bash
# Rate a video's caption-audio sync
cm rate -i video.mp4 -o sync-report.json

# With options
cm rate -i video.mp4 --fps 5 --min-rating 80

# Options:
#   -i, --input <path>     Input video.mp4 path (required)
#   -o, --output <path>    Output sync-report.json path (default: sync-report.json)
#   --fps <n>              Frames per second to sample (default: 2)
#   --min-rating <n>       Fail if sync rating below threshold (default: 75)
```

### 4. Audio-First Pipeline Option

Added `--pipeline` flag to `cm generate`:

```bash
# Standard pipeline (default) - uses Whisper with estimation fallback
cm generate "Redis vs PostgreSQL" --archetype versus

# Audio-first pipeline - requires Whisper, fails if unavailable
cm generate "Redis vs PostgreSQL" --archetype versus --pipeline audio-first
```

**Key Difference:**

- `standard`: Falls back to estimation if Whisper unavailable
- `audio-first`: Requires Whisper ASR for ground-truth timestamps

**Files Modified:**

- [src/audio/asr/index.ts](src/audio/asr/index.ts) - Added `requireWhisper` option
- [src/audio/pipeline.ts](src/audio/pipeline.ts) - Pass through `requireWhisper`
- [src/core/pipeline.ts](src/core/pipeline.ts) - Added `pipelineMode` option
- [src/cli/commands/generate.ts](src/cli/commands/generate.ts) - Added `--pipeline` flag
- [src/cli/commands/rate.ts](src/cli/commands/rate.ts) - New rate command
- [src/cli/index.ts](src/cli/index.ts) - Registered rate command

### 5. Dependencies Added

- `tesseract.js` - OCR engine for caption extraction

## Running Experiments

### Experiment 1: Generate Videos with Both Pipelines

```bash
# Standard pipeline
cm generate "5 JavaScript tips every dev should know" \
  --archetype listicle \
  --output output/standard/video.mp4 \
  --keep-artifacts

# Audio-first pipeline
cm generate "5 JavaScript tips every dev should know" \
  --archetype listicle \
  --output output/audio-first/video.mp4 \
  --keep-artifacts \
  --pipeline audio-first
```

### Experiment 2: Rate Both Videos

```bash
# Rate standard pipeline video
cm rate -i output/standard/video.mp4 -o output/standard/sync-report.json

# Rate audio-first pipeline video
cm rate -i output/audio-first/video.mp4 -o output/audio-first/sync-report.json
```

### Experiment 3: Compare Results

The sync reports contain:

- `rating`: Overall sync score (0-100)
- `metrics.meanDriftMs`: Average drift in milliseconds
- `metrics.maxDriftMs`: Maximum drift
- `metrics.matchRatio`: % of words successfully matched
- `errors`: Detected sync issues with suggested fixes

### Expected Outcomes

Based on research (RQ-33):

| Metric      | Standard Pipeline | Audio-First Pipeline |
| ----------- | ----------------- | -------------------- |
| Mean Drift  | 100-300ms         | <100ms               |
| Max Drift   | 500-800ms         | <200ms               |
| Rating      | 40-70 (Fair/Poor) | 80+ (Good/Excellent) |
| Consistency | Variable          | Stable               |

The audio-first pipeline should produce significantly better sync quality because:

1. Whisper ASR provides actual word-level timestamps from the audio
2. No estimation fallback means no algorithmic errors
3. Timestamps are ground-truth derived from real speech

## Next Steps

1. **Run experiments** with multiple topics/archetypes
2. **Collect data** on sync ratings for both pipelines
3. **Document findings** in a comparison report
4. **Consider making audio-first the default** if it consistently outperforms

## Technical Notes

### Prerequisites for Audio-First Mode

- Whisper model must be installed: `npx tsx scripts/install-whisper.ts`
- FFmpeg must be available in PATH

### Prerequisites for Sync Rating

- FFmpeg must be available in PATH
- Tesseract.js is installed as npm dependency (auto-downloads language data)

### Known Limitations

- OCR may struggle with stylized fonts or low contrast
- Whisper model download is ~150MB (base model)
- First sync rating may be slow due to Tesseract worker initialization
