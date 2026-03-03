# V&V Plan: Quality Gates for `cm validate` and Proxy Scoring

**Date:** 2026-01-06  
**Status:** Active plan (to execute during implementation)  
**Applies To:** post-render validation (`cm validate`) and artifact proxy scoring (`cm score`)

---

## 1) Scope & Non-Goals

### Scope

- `cm validate`: verify rendered `video.mp4` meets platform technical constraints and basic visual-quality proxies (see `docs/dev/architecture/IMPL-RENDER-VALIDATION-PIPELINE-20260107.md`).
- `cm score`: compute artifact-based proxy signals (hook/pacing/caption fit) and expose them as a structured report (see `docs/dev/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).

### Non-Goals

- No claims of predicting virality or engagement outcomes (see `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`).
- No GPU requirement; default path remains CPU-only and fast.

---

## 2) V&V Layers (what to test and how)

### Layer 1: Schema Validation

- Validate `validate.json` and `score.json` with Zod schemas (always-on).
- Validate gate result shapes and error taxonomy stability.

### Layer 2: Programmatic Checks (deterministic, fast)

`cm validate` gates (MVP):

- resolution/rotation profile gate (FFprobe)
- duration gate (FFprobe)
- format/codec gate (FFprobe)

`cm validate` optional gates:

- cadence gate from scene boundaries (see `docs/research/quality-gates/PYSCENEDETECT-20260106.md`)
- sampled visual-quality (BRISQUE; behind subprocess boundary)

`cm score` gates (artifact-only):

- hook length and on-screen hook text presence
- cadence plan: scene duration distribution
- caption fit: WPM proxy bounds from timestamps
- similarity/diversity: near-duplicate detection (start simple; later FAISS) (see `docs/research/quality-gates/FAISS-20260106.md`)

### Layer 3: LLM-as-Judge (optional, controlled)

Rubrics (structured output + retries):

- packaging clarity
- hook curiosity score
- retention plausibility score
- policy/ethics risk flags

### Layer 4: Human Review (release gate)

For any “risky” flags or new template changes:

- random sample review (N=10)
- confirm hooks aren’t deceptive
- confirm captions are readable at real playback speed

---

## 3) Test Suite Design (TDD-first)

### Unit tests (default)

- Gate logic tests using _fixture FFprobe JSON_ (no system dependency required).
- Schema tests: success + failure cases for both `validate.json` and `score.json`.
- Error taxonomy tests: stable `code`, `gateId`, and `fix` strings.

### Integration tests (opt-in / environment dependent)

- If `ffprobe` exists: run `cm validate` against a small MP4 and assert it returns a report quickly.
- If not: skip with a clear reason (do not fail CI unexpectedly).

---

## 4) Performance Verification

- Add a timing budget assertion for `cm validate` metadata-only path (<500ms typical, <5s worst-case).
- Keep cadence/quality gates off by default until stable.

---

## 5) Exit Criteria (this feature is “done” when…)

- `cm validate` returns actionable per-gate failures and exits non-zero when gates fail.
- Unit tests cover pass/fail for each implemented gate.
- `npm run lint`, `npm run typecheck`, and `npm run test:run` pass.

---

## 6) References

- Render validation plan: `docs/dev/architecture/IMPL-RENDER-VALIDATION-PIPELINE-20260107.md`
- Cadence research: `docs/research/quality-gates/PYSCENEDETECT-20260106.md`
- Retrieval research: `docs/research/quality-gates/FAISS-20260106.md`
- V&V framework: `docs/dev/guides/VV-FRAMEWORK-20260105.md`
