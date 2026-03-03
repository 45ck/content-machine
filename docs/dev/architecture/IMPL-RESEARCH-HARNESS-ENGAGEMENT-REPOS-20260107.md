# Implementation Plan: Research Harness for Engagement/Popularity Prediction Repos (`cm research`)

**Date:** 2026-01-07 (aligned to `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`)  
**Status:** Proposed (implementation-ready plan) (see `docs/research/virality-prediction/REPO-CATALOG-20260106.md`)  
**Primary Goal:** Provide a quarantined, explicit research workflow for running vendored repo baselines without polluting the production CLI path (see `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).

---

## 1) Working Backwards (PR/FAQ)

We add `cm research ...` commands so engineers can benchmark vendored popularity/engagement models against their intended datasets without implying production claims (see `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`).  
We keep all research execution behind explicit flags and separate outputs so `cm generate` and `cm score` remain lightweight and stable (see `docs/dev/architecture/SYSTEM-DESIGN-20260104.md` and `docs/dev/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).  
We document dataset links and licensing boundaries and never ship datasets inside this repository (see `vendor/research/virality-prediction/KuaiRand` and `vendor/research/virality-prediction/KuaiRec`).

---

## 2) Scope

### In Scope

Implement a CLI namespace `cm research` that can run “known-good” entrypoints for vendored repos in a controlled way (see `docs/research/virality-prediction/REPO-CATALOG-20260106.md`).  
Implement a standardized output bundle (`eval.json`, `predictions.csv`, `run.log`) for comparability across repos (see `docs/research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md`).  
Implement strict subprocess safety (timeouts, environment capture, deterministic working dirs) to avoid flaky runs (see `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).

### Out of Scope

We do not attempt to unify the training code across repos into a single ML framework because these repos span TF1, PyTorch, torch-geometric, and LMM stacks (see `vendor/research/virality-prediction/HMMVED` and `vendor/research/virality-prediction/RAGTrans`).  
We do not run any research harness code automatically during `cm generate` or `cm render` (see `docs/research/sections/SECTION-ENGAGEMENT-PREDICTION-20260106.md`).

---

## 3) Repo Targets (Initial Set)

We treat each repo as an independent “adapter” with a minimal config that specifies setup notes, entrypoints, and expected artifacts (see `docs/research/virality-prediction/REPO-CATALOG-20260106.md`).  
We start with repos that have clear CLI entrypoints and dataset instructions such as `vendor/research/virality-prediction/SMTPD` and `vendor/research/virality-prediction/DTCN_IJCAI`.  
We keep LMM-heavy repos like `vendor/research/virality-prediction/LMM-EVQA` in the catalog but mark them “GPU/large-download expected” so they do not block the harness MVP (see `docs/research/virality-prediction/REPO-CATALOG-20260106.md`).

---

## 4) Harness Architecture

### 4.1 Manifest-driven adapters

We define a manifest format (YAML or JSON) that maps a repo to supported commands (train/test/preprocess) and outputs (see `docs/research/virality-prediction/00-INDEX-20260106.md`).  
We store manifests adjacent to the research docs so the plan and the implementation stay linked (see `docs/research/virality-prediction/REPO-CATALOG-20260106.md`).

### 4.2 Environment isolation

We run each repo inside a dedicated working directory and capture environment metadata (Python version, pip freeze, GPU flags) into the run output bundle (see `docs/research/investigations/RQ-19-GPU-DETECTION-20260105.md`).  
We ensure network usage is explicit and only used for dataset downloads that the user initiates (see `vendor/research/virality-prediction/KuaiRand` and `vendor/research/virality-prediction/KuaiRec`).

---

## 5) CLI Surface (Examples)

We implement `cm research list` to enumerate supported adapters derived from the manifest set (see `docs/research/virality-prediction/00-INDEX-20260106.md`).  
We implement `cm research run <adapter> --mode test --dataset <path>` to execute the adapter entrypoint and write an output bundle (see `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).  
We implement `cm research report <runDir>` to normalize metrics into a common `eval.json` schema (see `docs/research/virality-prediction/REPO-CATALOG-20260106.md`).

---

## 6) Testing Strategy

We unit test manifest parsing and command construction without executing external repos (see `docs/dev/architecture/IMPL-PHASE-0-FOUNDATION-20260105.md`).  
We add a single “smoke adapter” that runs a no-op or minimal script so CI can validate harness wiring without downloading datasets (see `docs/dev/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`).  
We keep full repo execution tests manual or behind a separate tag because datasets are large and licensing-bound (see `vendor/research/virality-prediction/KuaiRand`).

---

## 7) Relationship to `cm score`

We use the research harness to learn which proxy signals correlate with offline model predictions while keeping production scoring lightweight (see `docs/dev/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).  
We treat any findings as calibration input for thresholds and rubrics rather than as a feature that claims prediction (see `docs/research/88-engagement-prediction-integration-DEEP-20260106.md`).

---

## 8) References

The core integration philosophy for “proxy scoring vs prediction” is defined in `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`.  
The per-repo survey and constraints are captured in `docs/research/virality-prediction/REPO-CATALOG-20260106.md` and the vendored code lives under `vendor/research/virality-prediction/`.  
The adjacent short-video engagement repos remain under `vendor/engagement-prediction/` as referenced by `docs/research/virality-prediction/00-INDEX-20260106.md`.
