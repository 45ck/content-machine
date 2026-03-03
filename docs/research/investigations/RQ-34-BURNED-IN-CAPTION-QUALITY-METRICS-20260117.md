# RQ-34: Burned-In Caption Quality Metrics (20260117)

This investigation operationalizes two local research notes into implementable scoring metrics for
`content-machine`, focused on **burned-in captions** (OCR-visible text) and **captioned short-form video
quality**.

## Source Documents (Local)

- `~/Downloads/Advanced Metrics for Burned‐In Caption Evaluation.pdf`
- `~/Downloads/Video Quality Scoring Metrics for Burned-In Caption Videos.pdf`

These documents are treated as internal research inputs; this repo integrates the _metrics_ (not the
binary PDFs) into the scoring/rating system.

## Where The Metrics Live In Code

- `src/score/sync-rater.ts`: OCR+ASR pipeline; extended to compute additional caption/video quality
  metrics in the same pass as sync scoring.
- `src/score/burned-in-caption-quality.ts`: Pure functions that compute the new metrics from OCR
  frames (and optional per-frame text bounding boxes), designed for unit testing.
- `src/score/sync-schema.ts`: Output schema extended with optional metric blocks so older reports remain
  valid.
- `src/cli/commands/rate.ts`: CLI prints a richer summary and writes the extended report JSON.

## Implemented Metrics (From Research)

### Caption Timeline / Text Metrics (OCR-derived)

- Subtitle rhythm consistency (words-per-second stability across caption segments)
- Display time adequacy (min/max caption on-screen time; flash detection)
- Caption timeline completeness (caption coverage ratio over video duration)
- Redundant caption reappearance (duplicate segments / boundary overlap)
- Punctuation quality (heuristic checks on terminal punctuation and repeated punctuation)
- Capitalization consistency (style detection: sentence-case vs ALL-CAPS vs lowercase)
- Screen space & crowding (line-count + max characters per line)
- OCR confidence consistency (mean/min/stddev confidence)

### Caption Placement / Stability Metrics (BBox-derived)

These require extracting a text bounding box per OCR frame:

- Safe margin adherence (5–10% frame inset, default 5% checks)
- Caption alignment accuracy (deviation of caption centroid from expected position)
- Position jitter / placement consistency (frame-to-frame centroid jitter)
- Flicker/continuity (caption appears/disappears within a segment)

### Video Timing Metric (ffprobe-derived)

- Frame pacing consistency (variability of frame timestamps)

## Default Thresholds (From Research, Operationalized)

The research notes include qualitative ranges; the implementation uses conservative defaults:

- Reading speed: target `2–4` words/sec, warn outside; strong penalty outside `1–7` words/sec.
- Caption duration: recommended `~1–7s` per segment; flag `<0.5s` as flash/flicker.
- Safe margins: require at least `5%` inset from edges for caption bbox.
- Density: max `2` lines, max `~45` chars per line.
- Sync tolerances: kept as existing `cm rate` thresholds (mean/max drift + match ratio).

## Notes

- All new computations are best-effort and remain offline.
- Metrics that require optional dependencies (e.g., advanced CV) are gated and do not block the
  default `cm rate` behavior unless explicitly enabled.
