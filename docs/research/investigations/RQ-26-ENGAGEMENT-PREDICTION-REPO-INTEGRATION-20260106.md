# RQ-26: Engagement / Popularity Prediction Repo Integration

**Research Date:** 2026-01-06  
**Status:** Proposed (integration plan + repo survey)  
**Scope:** Add research repos as submodules and define how (and how not) to integrate “engagement prediction” into `content-machine` without making unsafe product claims.

---

## Working Backwards (Press Release)

### Headline

content-machine adds an **offline “Engagement Proxy Score”** to help creators iterate on hooks, pacing, captions, and packaging — without claiming to predict “virality”.

### Summary

Today, content-machine reliably produces a short-form video from a topic. Tomorrow, creators need a fast way to answer: “Is this version _better_ than the last one?”

This research proposes a new optional capability:

- `cm score` produces `score.json` by evaluating **proxy engagement signals** (clarity, hook strength, pacing, caption fit, retention mechanics) using deterministic checks + LLM rubric + optional research models.
- `cm score --gate` can fail the pipeline if the content violates your quality thresholds (V&V Layer 2/3 gates).

Research repos (multimodal popularity prediction, retrieval-augmented prediction, temporal forecasting, and dataset/tooling repos) are vendored under:

- `vendor/engagement-prediction/*` (existing: AMPS/MMRA/MMVED/SnapUGC)
- `vendor/research/virality-prediction/*` (this task: HMMVED/TIML/SMTPD/LMM-EVQA/SKAPP/RAGTrans/KuaiRand/KuaiRec/…)

### What customers can do

- Run `cm generate ...` then `cm score --input ...` to get a scored report with actionable rewrite suggestions.
- Run `cm score --compare scoreA.json scoreB.json` to pick the better version for A/B testing.
- (Research-only) Run `cm research predict ...` to benchmark a repo model against offline datasets, if you have data and compute.

### What we explicitly do NOT do

- We do **not** promise “predict virality” or “guarantee engagement”.
- We do **not** ship any of these research models as default production behavior.
- We do **not** require a dataset download to use `content-machine`.

---

## Problem Statement

Engagement and popularity prediction research typically assumes:

1. A known platform context (TikTok/Kuaishou/Flickr/Weibo).
2. A dataset with labels (views, likes, watch time, retention curves, cascades).
3. A multimodal input (video frames/audio/text + metadata + user graph).

content-machine is different:

- It is a **generator**, not a platform dataset.
- At generation time, we don’t know the distribution channel, algorithm, audience, or posting context.
- We can still improve outcomes by optimizing **proxy levers** that correlate with short-form performance:
  - clarity, hook, pacing, scene cadence, caption readability, and narrative structure.

So the “integration” question becomes:

> How can we borrow signal, structure, and evaluation methodology from popularity-prediction research **without turning content-machine into a false “virality predictor”?**

---

## Decision

### Primary integration: “Engagement Proxy Score” (production-safe)

Implement a scoring stage that evaluates generated artifacts:

- `script.json` (hook, structure, CTA, claim density)
- `audio.wav` + `timestamps.json` (speaking rate, silence ratio, alignment confidence)
- `visuals.json` (cadence, on-screen text density, variety, “pattern interrupt” frequency)
- render props/video metadata (scene durations, motion budget if available)

Mechanism:

- **Layer 1 (schema):** validate artifacts with Zod schemas (already a project principle).
- **Layer 2 (programmatic checks):** deterministic heuristics (pacing targets, hook constraints, caption constraints).
- **Layer 3 (LLM-as-judge):** rubric scoring with structured output.
- **Layer 4 (human review):** optional.

Output:

- `score.json` with scores, reasons, and rewrite actions.

### Secondary integration: “Research harness” (opt-in)

Provide a separate, clearly-named namespace that makes it hard to confuse with production:

- `cm research predict ...`

This is for:

- Benchmarking repo models (e.g., SKAPP/RAGTrans/LMM-EVQA) on their intended datasets.
- Building internal intuition for which proxy signals correlate with model-predicted engagement.

---

## Repo Survey (What Each Repo Teaches Us)

Full per-repo notes live in:

- `docs/research/virality-prediction/00-INDEX-20260106.md`
- `docs/research/virality-prediction/REPO-CATALOG-20260106.md`

Highlights:

- **HMMVED/TIML/SMTPD:** “time matters” — becomes beat/cadence scoring.
- **LMM-EVQA:** audio matters — treat `cm audio` as first-class.
- **SKAPP/RAGTrans:** retrieval matters — motivates exemplar memory and similarity/diversity gates.
- **KuaiRand/KuaiRec:** metrics matter — informs future post-publish ingestion and debiasing.

---

## Proposed CLI Additions (No-Claims Naming)

### `cm score`

- Input: `script.json` + `timestamps.json` + `visuals.json` (and optionally `video.mp4` for post-render gates).
- Output: `score.json`
- Mode: `--gate` returns non-zero exit code when thresholds fail.

### `cm research predict`

- Input: dataset path + model config.
- Output: `predictions.csv` + `eval.json`
- Constraints: explicitly labeled “research”; not installed by default in MVP packaging.

---

## Risks and Mitigations

### Risk: Product claim drift (“virality prediction”)

- Mitigation: naming (“score”, “proxy”), docs, `--research` namespace, and explicit disclaimers in help text.

### Risk: Compute / dependency bloat

- Mitigation: keep models out of default runtime; keep scoring baseline lightweight (heuristics + LLM rubric).

### Risk: Dataset/license contamination

- Mitigation: never ship datasets; store only links and instructions in docs; add license checklists in research.

---

## Next Steps (Concrete)

1. Define `score.json` schema and rubric (align with `docs/guides/VV-FRAMEWORK-20260105.md`).
2. Implement `cm score` as a pure artifact consumer (no external network required).
3. Add an internal `cm metrics ingest` design doc for post-publish analytics loop (future).
4. (Optional) Create a research harness wrapper for running repo baselines in a quarantined environment.
