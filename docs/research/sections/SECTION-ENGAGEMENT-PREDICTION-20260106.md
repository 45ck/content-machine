# Section Research: Engagement Prediction (Proxy Scoring + Research Harness)

**Research Date:** 2026-01-06  
**Section:** Cross-cutting (touches `cm script`, `cm audio`, `cm visuals`, `cm render`)  
**Status:** Proposed

---

## Purpose

This section defines how “engagement prediction” fits into content-machine without making unsafe claims:

- Production: **proxy scoring** to compare variants and enforce quality gates.
- Research: **offline benchmarks** using vendored repos + datasets (opt-in).

Authoritative investigation:

- `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`

Repo catalog:

- `docs/research/virality-prediction/00-INDEX-20260106.md`

---

## Integration Map (Pipeline)

### `cm script` → Scoreable signals

- Hook clarity and first-3-seconds plan
- Beat cadence (“pattern interrupt” frequency)
- Claim density and specificity
- CTA/comment prompt quality

### `cm audio` → Scoreable signals

- Speech rate stability (WPM proxy from timestamps)
- Silence ratio and breath pacing
- Alignment confidence / drift

### `cm visuals` → Scoreable signals

- Scene duration distribution (cadence)
- On-screen text density and legibility plan
- Visual variety vs repetition

### `cm render` → Scoreable signals

- Actual scene cut frequency (if measured)
- Caption coverage vs audio
- Motion budget (template-level proxies)

---

## Proposed Artifacts

- `score.json` (new): proxy scores, reasons, rewrite actions, and optional “gate” pass/fail.
- (Future) `publish.json` / `metrics.json`: post-publish metadata and analytics ingestion.

---

## Non-Goals

- Not a “virality predictor”
- Not a platform simulator
- Not a default dependency on PyTorch/LMM tooling
