# RQ-25: Virality Optimization Quality Gates (Packaging, Hook, Retention, Safety)

**Date:** 2026-01-05  
**Status:** Proposed  
**Priority:** P1  
**Question:** How do we operationalize “viral mechanics” in `content-machine` without claiming to predict virality?

---

## 1. Problem Statement

The provided SOPs describe virality as engineered via packaging, hooks, and retention tactics. However:

- We do not have access to platform analytics (ECR, completion rate) at generation time.
- We cannot truthfully guarantee outcomes.
- “High-risk” tactics (rage bait, hook-only open loops) create trust/platform risk.

We still need a way to:

1. **Enforce repeatable quality** (clear packaging, strong hooks, tight pacing).
2. **Detect risky outputs** (policy risk, misleading claims, rage-bait tone).
3. **Support iteration** (A/B variants + scoring + prompt version tracking).

---

## 2. Approach: Proxy Metrics + Rubrics

Treat virality as **a set of controllable input constraints** plus **proxy quality scores**:

- Deterministic checks for structure and pacing (Layer 2).
- LLM-as-judge scoring for subjective qualities (Layer 3).
- Human review for flagged items (Layer 4).

This fits the existing V&V model in `docs/guides/VV-FRAMEWORK-20260105.md`.

---

## 3. Proposed Score Model

### 3.1 `ViralityScore` JSON (artifact: `score.json`)

```json
{
  "schemaVersion": "1.0.0",
  "overall": 0.82,
  "packaging": { "score": 0.86, "reasons": ["Clear premise", "Simple words"] },
  "hook": { "score": 0.88, "reasons": ["Curiosity gap", "Strong on-screen hook"] },
  "retention": { "score": 0.79, "reasons": ["Good beat cadence", "Payoff could be stronger"] },
  "safety": {
    "score": 0.95,
    "flags": [],
    "riskProfile": "safe"
  },
  "suggestions": ["Shorten hook to 8–12 words", "Add a mid-video pattern interrupt around ~15s"],
  "inputs": { "topic": "…", "archetype": "…", "platform": "tiktok" }
}
```

This score becomes:

- A CI-friendly gate (exit non-zero if below threshold).
- A driver for A/B testing (generate 5 packages, pick the best-scoring).

---

## 4. Quality Gates (By SOP Element)

### 4.1 Packaging (title + thumbnail text) gate

Proxy checks:

- Title uses simple vocabulary (heuristic: avoid uncommon/jargon words list).
- Title length within bounds (e.g., 6–14 words).
- Thumbnail/cover text is 2–6 words, readable on mobile.
- Package clearly implies a curiosity gap or benefit.

LLM judge rubric:

- Clarity for a global audience (0–1)
- Intrigue / clickability (0–1)
- “Single idea” focus (0–1)

**Failure behavior:** regenerate packaging variants; if still failing, recommend scrapping or narrowing the topic.

### 4.2 Hook gate (first 1–3 seconds)

Proxy checks:

- Hook present and placed first.
- Hook includes at least one of: bold claim, question, contradiction, surprising fact.
- “Muted autoplay”: a short on-screen hook text exists (if render supports overlays).

LLM judge rubric (proxy for ECR):

- Pattern interrupt strength (0–1)
- Curiosity gap (0–1)
- Comprehension speed (0–1)

### 4.3 Retention gate (hold + payoff)

Proxy checks:

- Beat cadence: require a new scene/visual directive every ~2–3 seconds (implemented as micro-scenes or explicit beat plan).
- Problem→solution chain: at least 2 cycles in 45s scripts (heuristic via markers, or judge).
- Payoff exists in last ~5 seconds (CTA or resolution).

LLM judge rubric:

- Micro-value density (0–1)
- Momentum between segments (0–1)
- Payoff satisfaction (0–1)

### 4.4 Engagement/comment gate

Proxy checks:

- Includes an organic question (not “comment below”), preferably low-friction.

LLM judge rubric:

- Naturalness (0–1)
- Likelihood to spark conversation (0–1)

### 4.5 Safety/ethics gate

Hard blocks:

- Harassment/hate speech.
- Explicit instructions for deception.

Soft flags (risk profile dependent):

- Rage bait framing (inflammatory/polarizing)
- “Hook-only open loop” with no payoff
- Overconfident claims without qualifiers

---

## 5. Where to Implement

### 5.1 Inside `cm script` (recommended first)

- Implement scoring right after `generateScript()` in `src/script/generator.ts` (or a wrapper).
- Store score summary under `script.extra.virality.score` for traceability.

### 5.2 As a standalone command: `cm score`

- Input: `script.json` (and optionally `packaging.json`)
- Output: `score.json`
- Flags:
  - `--min-overall 0.80`
  - `--risk safe|spicy|edgy` (controls safety tolerance)

### 5.3 In pipeline orchestration

- In `src/core/pipeline.ts`, enforce “score gate” before running audio/visuals/render.
- For `cm generate`, optionally auto-regenerate until passing (bounded retries).

---

## 6. Testing + Evals

Deterministic checks: Vitest unit tests.

LLM-as-judge:

- Add promptfoo configs under `evals/` (aligned with `docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md`).
- Use small curated fixtures (topics/archetypes) to prevent regressions.

---

## 7. Open Questions

1. Do we want to model “beat cadence” as micro-scenes (schema change) or as render-only effects?
2. Should packaging be a hard gate (scrap rule) or a soft warning?
3. How will we log “A/B variants” (IDs, prompt versions, chosen variant) for reproducibility?
4. What is the default “risk profile” for open source usage?

---

## Related

- Mapping doc: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- V&V framework: `docs/guides/VV-FRAMEWORK-20260105.md`
- LLM evals: `docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md`
