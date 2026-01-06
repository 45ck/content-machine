# Implementation Plan: Viral SOP → content-machine Pipeline & CLI Integration

**Date:** 2026-01-06  
**Status:** Proposed (implementation-ready)  
**Primary Goal:** Operationalize short-form virality SOP tactics as _artifact fields + quality gates_ without changing the 4-stage pipeline shape (`cm script` → `cm audio` → `cm visuals` → `cm render`).

---

## 1) Design Principles (to keep this shippable)

- **No virality claims:** we implement _proxy scoring + mechanical gates_, not prediction guarantees (see `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`).
- **CLI-first + artifacts:** every new capability emits JSON artifacts, not hidden state (see `docs/architecture/SYSTEM-DESIGN-20260104.md`).
- **Additive schema evolution:** start in `extra.*` and promote to first-class fields only once stable (see `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`).
- **TDD + V&V:** every gate is testable deterministically (Layer 2) and optionally judgeable (Layer 3) (see `docs/guides/VV-FRAMEWORK-20260105.md`).

---

## 2) SOP → Pipeline Mapping (what to automate where)

This plan assumes you want to automate the _repeatable mechanics_ from the SOPs and output checklists for the rest.

### 2.1 Stage 0 (new, optional): `cm package`

**Automates:** packaging-first ideation, “scrap if can’t package” quality gate, title/thumbnail variants, on-screen hook text variants.  
**Outputs:** `packaging.json` (selected package + alternatives).  
**Feeds:** `cm script` as context (and later: retrieval memory exemplars).

### 2.2 Stage 1: `cm script` (extend output)

**Automates:** hook plan, Hook–Hold–Payoff structure, problem→solution rhythm, comment prompt, SEO keyword plan.  
**Outputs:** existing `script.json` extended via `extra.virality.*` initially.

### 2.3 Stage 2: `cm audio` (derive proxies)

**Automates:** speech-rate and silence proxies; validates caption timing feasibility from timestamps.  
**Outputs:** existing `timestamps.json` + derived timing stats (optional).

### 2.4 Stage 3: `cm visuals` (cadence + variety plan)

**Automates:** “visual changes every ~2–3s” planning as scene duration constraints; detects repetition across scenes.  
**Outputs:** existing `visuals.json` with tighter scene duration + “pattern interrupt” markers (optional).

### 2.5 Stage 4: `cm render` + post-render: `cm validate`

**Automates:** technical correctness (resolution/codec/duration) + sampled visual-quality; optional cadence via scene boundary detection.  
**Outputs:** `video.mp4` + `validate.json` report (machine-readable).

---

## 3) Proposed New CLI Surfaces (composable)

### 3.1 `cm package`

```bash
cm package "Redis vs PostgreSQL" --archetype versus -o packaging.json
```

### 3.2 `cm score` (proxy scoring; blocks on gate failure when asked)

```bash
cm score --script script.json --timestamps timestamps.json --visuals visuals.json --video video.mp4 --gate -o score.json
```

### 3.3 `cm validate` (post-render integrity gates)

```bash
cm validate video.mp4 --profile portrait --json -o validate.json
```

---

## 4) Quality Gates to Implement First (high signal, low dependency)

### 4.1 Script gates (Layer 2)

- **Packaging gate:** can the idea be expressed as a clear title + thumbnail text (SOP litmus test).
- **Hook gate:** hook text length bounds + “muted autoplay” coverage (must contain on-screen hook text plan).
- **Cadence plan gate:** enforce at least one “visual change” instruction within N seconds in planned beats.

Reference mapping: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`.

### 4.2 Visual cadence gates (Layer 2)

- **Scene duration distribution** from `visuals.json` (no long dead segments).
- **Optional post-render cadence** from scene boundaries (see `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).

### 4.3 Similarity/diversity gates (Layer 2)

- **Near-duplicate script gate** across variants (first implement with an in-memory index; later swap to FAISS).
- **Repeated visual concept gate** (keywords/scene descriptors).

Reference: `docs/research/quality-gates/FAISS-20260106.md` and plan: `docs/architecture/IMPL-RETRIEVAL-MEMORY-FAISS-20260107.md`.

---

## 5) Integration Points (code)

- `cm package`: new command at `src/cli/commands/package.ts` (already exists), plus schema at `src/package/schema.ts` (already exists).
- `cm script`: extend prompts + generator orchestration:
  - prompts: `src/script/prompts/**`
  - orchestration: `src/script/generator.ts`
  - schema: `src/script/schema.ts` (use `extra.virality.*` first)
- `cm validate`: new module `src/validate/**` + CLI command `src/cli/commands/validate.ts` (to implement).
- `cm score`: plan-only for now; aligns with `docs/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`.

---

## 6) Dependencies / Tooling Choices

- **Cadence:** PySceneDetect via optional subprocess wrapper (see `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).
- **Retrieval memory:** define `RetrievalIndex` abstraction now; defer native FAISS binding until UX is proven (see `docs/research/quality-gates/FAISS-20260106.md`).

---

## 7) References

- SOP mapping: `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`
- Proxy scoring posture: `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`
- Cadence research: `docs/research/quality-gates/PYSCENEDETECT-20260106.md`
- Retrieval research: `docs/research/quality-gates/FAISS-20260106.md`
- Render validation plan: `docs/architecture/IMPL-RENDER-VALIDATION-PIPELINE-20260107.md`
