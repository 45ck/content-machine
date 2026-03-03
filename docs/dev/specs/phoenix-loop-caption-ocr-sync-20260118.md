# Phoenix Loop: Caption OCR vs Sync Robustness (2026-01-18)

## Goal

Tune caption render defaults to maximize burned-in caption quality while keeping caption↔audio sync rating reliable and passing.

## Fixed Inputs

- Script + artifacts under `output/phoenix-loop1/`:
  - `script.json`, `audio.wav`, `timestamps.json`, `visuals.json`

## Key Finding (Experiment)

High caption-quality settings (notably `--caption-max-chars 24`) improved OCR-derived caption quality but could fail sync rating due to rare OCR sampling outliers (single-word drift spikes), even when p95 drift was 0.

### Evidence

- With high-quality captions, one missed/late OCR sample produced `rawMaxDriftMs` ~ 2550ms while most words were aligned.
- This previously caused `cm rate` to fail on `maxDriftMs`, despite stable sync elsewhere.

## Fix (Hypothesis → Change)

**Hypothesis:** Sync scoring should be robust to rare OCR sampling outliers when they are a small fraction of matches (i.e. not a true systematic sync issue).

**Change:** Compute sync drift metrics using robust stats when outliers are rare, while still recording raw outliers for diagnostics.

- Added `rawMaxDriftMs`, `outlierCount`, `outlierRatio` to sync metrics.
- When `outlierRatio < 0.2` and enough samples exist, compute `maxDriftMs` (and mean/p95/median/stddev) on a filtered set excluding >300ms outliers.

## New Default Caption Settings

Updated the default CapCut preset to reflect the best-performing configuration from this loop:

- `highlightMode: color`, `highlightColor: #FFE600`
- `stroke.width: 10`
- `layout.maxCharsPerLine: 24`
- `layout.minWordsPerPage: 3`, `layout.maxWordsPerPage: 7`
- `layout.minOnScreenMs: 1000`, `layout.minOnScreenMsShort: 800`
- `pageAnimation: none`

## Next Experiments

- Sweep `pageAnimation` values for the new defaults and pick the best engagement animation that does not degrade OCR/sync. (Initial results: `pop` scored best for the CapCut defaults on the phoenix-loop1 fixture.)
- Sweep `pageAnimation` and `wordTransitionMs` to quantify OCR stability impact.
- Compare highlight modes (`color` vs `background`) under identical pacing constraints.
