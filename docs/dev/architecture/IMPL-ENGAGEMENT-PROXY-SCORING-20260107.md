# Implementation Plan: Engagement Proxy Scoring (`cm score`)

**Date:** 2026-01-07 (aligned to `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`)  
**Status:** Proposed (implementation-ready plan) (see `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`)  
**Owner:** content-machine core (see `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`)

---

## 1) Working Backwards (PR/FAQ)

### Press Release (PR)

We add `cm score` to produce a `score.json` that ranks variants and enforces “proxy retention” quality gates without claiming virality prediction (see `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).  
We keep the existing four-stage pipeline intact (`cm script` → `cm audio` → `cm visuals` → `cm render`) while adding a composable validation stage that consumes artifacts (see `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`).  
We align scoring checks with the V&V framework (schema → deterministic checks → LLM rubric → human review) to keep results testable and explainable (see `docs/dev/guides/VV-FRAMEWORK-20260105.md`).  
We explicitly label any dataset/model-based prediction code as research-only and keep it under a separate namespace to avoid product-claim drift (see `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).

### FAQ

**Q: Is this a virality predictor?** (see `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`)  
**A:** No, this is a proxy scoring system that evaluates generation-time artifacts and returns actionable iteration guidance (see `docs/research/88-engagement-prediction-integration-DEEP-20260106.md`).

**Q: Why is proxy scoring still useful?** (see `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`)  
**A:** Proxy scoring turns “best practices” (hook/pacing/caption fit) into repeatable checks and comparable variant scores (see `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`).

**Q: Where do the ideas come from?** (see `docs/research/virality-prediction/REPO-CATALOG-20260106.md`)  
**A:** We borrow evaluation discipline and modeling insights from vendored popularity/engagement repos while keeping their training stacks out of production (see `vendor/research/virality-prediction/` and `vendor/engagement-prediction/`).

---

## 2) Scope

### In Scope

We implement a new CLI command `cm score` that consumes `script.json`, `timestamps.json`, and `visuals.json` and emits `score.json` (see `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).  
We implement deterministic checks (cadence, hook constraints, caption density proxies) as V&V Layer 2 gates (see `docs/dev/guides/VV-FRAMEWORK-20260105.md`).  
We implement an optional LLM rubric scorer as V&V Layer 3 with structured output validation (see `docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md`).  
We implement `--gate` mode that exits non-zero on failure to support CI and batch pipelines (see `docs/dev/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`).

### Out of Scope

We do not ship or run training pipelines from research repos in the default CLI path (see `vendor/research/virality-prediction/` and `docs/research/virality-prediction/REPO-CATALOG-20260106.md`).  
We do not claim engagement outcomes or platform-specific performance guarantees in CLI help text or docs (see `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`).  
We do not ingest post-publish analytics in this phase, but we design the schema so a future `cm metrics ingest` can calibrate scores (see `docs/research/88-engagement-prediction-integration-DEEP-20260106.md`).

---

## 3) Inputs, Outputs, and Schemas

### Inputs (Artifacts)

`cm score` reads `script.json` for hook/structure/beat plan signals (see `docs/dev/architecture/IMPL-PHASE-1-SCRIPT-20260105.md`).  
`cm score` reads `timestamps.json` for timing, WPM proxies, and caption alignment coverage (see `docs/dev/architecture/IMPL-PHASE-2-AUDIO-20260105.md`).  
`cm score` reads `visuals.json` for scene durations and “pattern interrupt” cadence proxies (see `docs/dev/architecture/IMPL-PHASE-3-VISUALS-20260105.md`).  
`cm score` optionally reads `video.mp4` to enable post-render gates when `--video` is provided (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

### Output (`score.json`)

`score.json` includes an overall score, per-dimension rubric scores, check results, and remediation actions (see `docs/research/88-engagement-prediction-integration-DEEP-20260106.md`).  
`score.json` includes provenance fields (prompt versions, model identifiers, artifact hashes) to support regression tracking (see `docs/research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md`).  
`score.json` is validated by a Zod schema and versioned alongside other pipeline artifacts (see `docs/research/investigations/RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md`).

---

## 4) Scoring Dimensions (Proxy Signals)

Hook scoring evaluates first-3-seconds clarity and “muted autoplay” compatibility using script + planned on-screen text fields (see `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`).  
Pacing scoring evaluates scene/beat cadence using `visuals.json` durations and (optionally) scene boundary detection outputs (see `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).  
Caption-fit scoring evaluates words-per-second and coverage proxies using `timestamps.json` and caption plan fields from `script.json` (see `docs/dev/architecture/IMPL-PHASE-2-AUDIO-20260105.md`).  
Clarity scoring evaluates reading simplicity and jargon density using deterministic heuristics and an optional LLM rubric (see `docs/research/investigations/RQ-24-LLM-EVALUATION-QUALITY-ASSURANCE-20260105.md`).  
Novelty/diversity scoring is designed to later use retrieval indexing (FAISS or a lightweight index) to detect near-duplicate scripts/structures across variants (see `docs/research/quality-gates/FAISS-20260106.md`).

---

## 5) Implementation Plan (Milestones)

### Milestone A: Define schemas and contracts

Create `ScoreOutput` Zod schema and a stable JSON contract for `cm score` (see `docs/research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md`).  
Add a rubric definition doc for scoring dimensions and thresholds to align with the quality gate framework (see `docs/dev/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`).

### Milestone B: Deterministic checks (Layer 2)

Implement cadence checks derived from `visuals.json` and timestamps, with configurable profile thresholds (see `docs/research/investigations/RQ-25-VIRALITY-OPTIMIZATION-QUALITY-GATES-20260105.md`).  
Implement caption density and readability checks as fast, local computations to preserve the “under 5 minutes” user experience (see `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`).

### Milestone C: LLM rubric scoring (Layer 3, optional)

Implement a structured LLM “judge” prompt that emits rubric scores and reasons with Zod validation and retries (see `docs/research/investigations/RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md`).  
Track token/cost metadata and attach it to `score.json` provenance (see `docs/research/investigations/RQ-15-COST-TRACKING-20260104.md`).

### Milestone D: CLI wiring

Add `cm score` as a composable command that reads artifacts and writes `score.json` to an output path (see `docs/dev/architecture/IMPL-PHASE-5-INTEGRATION-20260105.md`).  
Add `--gate` and `--json` output modes consistent with other CLI conventions (see `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`).

---

## 6) Testing Strategy

Unit tests cover schema validation and deterministic checks with small fixture JSON files (see `docs/dev/architecture/IMPL-PHASE-0-FOUNDATION-20260105.md`).  
Integration tests run `cm score` end-to-end on a synthetic artifact bundle and assert stable JSON outputs (see `tasks/todo/TASK-016-quality-cli-integration-tests-20260106.md`).  
Performance tests enforce a “fast path” for deterministic scoring that does not require GPU or Python (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## 7) Risk Register

We mitigate “prediction claims” risk by separating proxy scoring (`cm score`) from any dataset-bound inference (`cm research predict`) (see `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).  
We mitigate dependency bloat by keeping heavy stacks (LMMs, torch-geometric, TF1) quarantined to research workflows (see `vendor/research/virality-prediction/LMM-EVQA` and `vendor/research/virality-prediction/RAGTrans`).  
We mitigate evaluation drift by storing provenance and enabling regression comparisons across versions (see `docs/research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md`).

---

## 8) Dependencies and References

The repo catalog and vendored repos that informed this plan are maintained in `docs/research/virality-prediction/REPO-CATALOG-20260106.md` and `vendor/research/virality-prediction/`.  
The quality gate primitives referenced here are summarized in `docs/research/quality-gates/00-QUALITY-GATES-SUMMARY-20260106.md` and implemented later via `docs/dev/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`.  
The “virality engineering” mapping that defines what to score (hook, pacing, captions) lives in `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`.
