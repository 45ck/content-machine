# Engagement Proxy Scoring & Iteration Loop (Deep Dive)

**Date:** 2026-01-06  
**Status:** Proposed design  
**Audience:** CLI implementers + research pipeline owners

---

## Narrative (The Problem We’re Solving)

Creators don’t need a model that claims “this will get 1M views”. They need a system that helps them:

1. Generate multiple variants quickly.
2. Choose the best candidate confidently.
3. Learn what changed and why.
4. Iterate with measurable improvements.

Engagement prediction research is valuable here, but only if translated into:

- **Proxy quality/retention scoring** at generation time, and
- **Closed-loop learning** after publish.

---

## Design Tenets

1. **No-claims framing:** “proxy score”, not “virality prediction”.
2. **Artifact-first:** scoring consumes `script.json`, `timestamps.json`, `visuals.json` (and optionally `video.mp4`).
3. **Layered verification:** follow the V&V framework (schema → deterministic → judge → human).
4. **Research stays quarantined:** repo baselines remain in `cm research ...` tooling.

---

## Proposed `cm score` Command

### Inputs

- Required: `script.json`
- Recommended: `timestamps.json`, `visuals.json`
- Optional: `audio.wav`, `video.mp4` (post-render gates)

### Output: `score.json`

Minimum shape (conceptual):

- `summary`: overall score + pass/fail
- `rubric`: named dimensions (hook, clarity, pacing, caption fit, structure)
- `checks`: deterministic checks (cadence, hook length, word density, etc.)
- `actions`: rewrite suggestions with pointers to which stage (`script`, `audio`, `visuals`, `render`)
- `provenance`: prompt versions, model IDs, timestamps

### Modes

- `cm score --gate`: non-zero exit on failure (CI-friendly)
- `cm score --compare scoreA.json scoreB.json`: choose the better variant

---

## Scoring Dimensions (Proxy Engagement Signals)

### Hook (first 1–3 seconds)

What we can measure:

- Presence of a clear claim/question
- Visual-on-screen hook text exists and matches audio
- No long “warm-up” before value

### Pacing / Retention Mechanics

What we can measure:

- Beat plan cadence (from script/visuals)
- Scene duration distribution (from visuals/render)
- “Pattern interrupt” frequency (explicit plan or inferred from scene changes)

### Caption Fit

What we can measure:

- Coverage ratio (how much spoken content is captioned)
- Readability (words-per-second; line breaks)
- Highlight alignment confidence

### Clarity

What we can measure:

- Sentence length and jargon density (heuristics)
- LLM rubric score for “understood on first listen”

---

## Research Repo Integration (How We Use It Without Shipping It)

### What we actually integrate into production

- Concepts and evaluation methodology:
  - temporal prediction ≈ time-aligned beat scoring
  - retrieval augmentation ≈ exemplar memory for hook/structure styles
  - multimodal importance ≈ treat audio as first-class

### What stays in research harness

- Training/inference code paths that require:
  - large datasets (KuaiRand/KuaiRec/SMPD/SnapUGC)
  - heavy dependencies (PyTorch Geometric, LMM stacks, TensorFlow 1.x)

---

## Future: Post-Publish Closed Loop (`cm metrics ingest`)

We can create an optional, privacy-conscious loop:

1. User exports platform analytics (CSV/JSON).
2. `cm metrics ingest` normalizes to `metrics.json`.
3. We correlate `score.json` dimensions with observed metrics (watch time, completion, shares).
4. We tune rubrics/thresholds and prompt strategies.

Key idea:

- Generation-time scores should be **calibrated over time** with real outcomes, but never marketed as predictions.

---

## Implementation Notes (Minimal Path)

1. Start with `cm score` consuming only JSON artifacts.
2. Implement deterministic checks first (fast + reliable).
3. Add a single LLM-as-judge rubric call (structured output).
4. Add `--compare` and `--gate`.
5. Only then consider research harness automation.

---

## Related

- `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`
- `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`
- `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`
