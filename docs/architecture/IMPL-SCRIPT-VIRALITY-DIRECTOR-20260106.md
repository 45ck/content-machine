# Implementation Plan: “Virality Director” inside `cm script` (Hook / Hold / Payoff)

**Date:** 2026-01-06  
**Status:** Proposed (implementation-ready)  
**Primary Goal:** Improve script outputs by explicitly generating a hook plan, retention plan, and CTA/comment prompt aligned to the SOPs.

---

## 1) Intended Outcome (what changes for users)

Users can run:

```bash
cm script --topic "Redis vs PostgreSQL" --archetype versus
```

and reliably receive `script.json` that includes:

- packaging reference (or inline package fields),
- on-screen hook text plan (works muted),
- beat cadence plan (pattern interrupts every ~2–3s),
- Hook–Hold–Payoff structure,
- a natural comment question.

Mapping reference: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`.

---

## 2) Minimal Schema Strategy (low risk)

Phase 1 (non-breaking):

- Put virality additions under `script.extra.virality` and `scene.extra.virality`.

Phase 2 (breaking, only after stability):

- Promote to first-class Zod fields and bump schema version.

---

## 3) Orchestration Options

### Option A: Single-call prompt upgrade (fastest)

Enhance the existing structured-output prompt to include:

- `hookPlan`
- `retentionPlan.beats[]`
- `commentPrompt`
- `packaging` (or reference)

### Option B: 3-call director (recommended)

1. **Package** (call `generatePackaging()` or reuse `packaging.json`)
2. **Draft script** (scenes aligned to package + cadence)
3. **Polish** (simplify language, add on-screen text cues, tighten hook)

This keeps failure modes small and improves retries.

---

## 4) Deterministic Gates (Layer 2)

Implement cheap checks that align with SOP rules:

- **Hook presence:** on-screen hook text exists and is shown in first N seconds.
- **Cadence plan:** beats/scene durations imply at least one “change” within ~2–3s.
- **Simplicity heuristic:** short sentences + low jargon density.
- **Payoff present:** last segment resolves promise (no “hook-only open loop” unless explicitly enabled).

Optional cadence measurement link: `docs/research/quality-gates/PYSCENEDETECT-20260106.md`.

---

## 5) Similarity/Diversity Gate (avoid template fatigue)

When generating multiple variants:

- embed the hook + package + beat plan,
- compare to last N variants; warn/fail on near-duplicates.

Use a backend abstraction that can later be powered by FAISS:

- research: `docs/research/quality-gates/FAISS-20260106.md`
- plan: `docs/architecture/IMPL-RETRIEVAL-MEMORY-FAISS-20260107.md`

---

## 6) Implementation Steps (TDD)

1. Add unit tests that assert `extra.virality` fields exist and meet minimum requirements.
2. Implement orchestration (Option A or B) with injected `LLMProvider` and deterministic stubs.
3. Add Layer 2 gates; ensure failures return actionable “fix” messages.
4. Add optional LLM rubric (Layer 3) only after deterministic gates are stable.

---

## 7) References

- SOP mapping: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- Cadence gates: `docs/research/quality-gates/PYSCENEDETECT-20260106.md`
- Retrieval gates: `docs/research/quality-gates/FAISS-20260106.md`
