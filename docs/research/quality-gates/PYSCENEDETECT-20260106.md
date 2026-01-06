# PySceneDetect for Cadence and Structural Gates

**Date:** 2026-01-06  
**Status:** Research notes (proposed)

---

## What PySceneDetect Is

PySceneDetect detects scene boundaries (cuts) in video files using content change detectors.

In content-machine, scene boundaries are a proxy for:

- pacing/cadence,
- “pattern interrupt” frequency,
- excessive static segments.

---

## Why It Matters for Short-Form

Short-form retention is heavily influenced by:

- frequent visual changes,
- readable on-screen text timing,
- avoiding dead air with static visuals.

Even without predicting engagement, we can enforce mechanical constraints aligned with best practices.

---

## Proposed Quality Gates

### Gate A: Cut cadence bounds

Fail if:

- median cut interval is above a threshold (too slow),
- cut intervals have high variance with long dead segments.

### Gate B: Hook cut density

Fail if first 2–3 seconds have:

- no cuts, and
- no on-screen hook text events.

### Gate C: Caption-change alignment proxy

Warn if:

- caption highlight changes are frequent but visuals are static for long spans (cognitive mismatch).

---

## Integration Points

- Post-render scoring: `cm score --video video.mp4`
- Template CI: run on rendered test clips to catch regressions

---

## Risks / Costs

- Requires Python runtime (or vendoring binaries) for CLI integration.
- Keep optional until the pipeline is stable and `cm score` is proven useful.
