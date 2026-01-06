# Implementation Plan: Render Validation Pipeline (`cm validate` / post-render gates)

**Date:** 2026-01-07 (aligned to `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`)  
**Status:** Proposed (implementation-ready plan) (see `docs/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`)  
**Primary Goal:** Validate the final `video.mp4` against technical and proxy-quality standards for Shorts/Reels/TikTok (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## 1) Working Backwards (PR/FAQ)

We add a fast `cm validate output.mp4` command that fails early when a render is technically invalid for the target platform profile (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We implement these checks as quality gates so they can be run standalone and also plugged into `cm generate` or `cm score --video` flows (see `docs/architecture/IMPL-PHASE-5-INTEGRATION-20260105.md` and `docs/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).  
We keep the default path CPU-only and <5s for a 60s clip by prioritizing metadata checks and sampled frame evaluation (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## 2) Scope

### In Scope

Implement FFprobe-driven gates for resolution, duration, and codecs (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
Implement a sampled-frame visual-quality gate (BRISQUE) via a Python helper script behind a stable subprocess contract (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md` and `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).  
Add an optional cadence gate that uses scene boundary detection to measure cut frequency and dead segments (see `docs/research/quality-gates/PYSCENEDETECT-20260106.md` and `vendor/clipping/pyscenedetect`).

### Out of Scope

We do not require GPU-based quality metrics in the default profile to preserve portability (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We do not attempt “engagement prediction” from rendered pixels, and we instead keep this as technical validation plus proxy-quality gates (see `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).

---

## 3) Gate Definitions (Profiles)

We define a profile-driven gate suite (portrait/landscape) that matches the project’s format goals (see `docs/architecture/SYSTEM-DESIGN-20260104.md`).  
We reuse the threshold structure proposed in `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md` so the plan maps directly to acceptance criteria.  
We store profiles in a config-driven format consistent with the config architecture (see `docs/architecture/IMPL-PHASE-0-FOUNDATION-20260105.md`).

---

## 4) Implementation Architecture

### 4.1 Subprocess boundary (Python helpers)

We implement `scripts/video_info.py` to emit a single JSON object for width/height/duration/codecs/fps/bitrate using FFprobe (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We implement `scripts/video_quality.py` to emit BRISQUE summary statistics using sampled frames and a stable JSON contract (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We follow the “Python subprocess” reliability patterns (timeouts, JSON-only stdout, structured stderr) (see `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).

### 4.2 Optional cadence boundary (PySceneDetect)

We wrap `vendor/clipping/pyscenedetect` as an optional tool invocation to extract scene cut timestamps and cut intervals (see `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).  
We keep cadence checks in `cm validate --cadence` until we have stable correlations with proxy scoring thresholds (see `docs/research/88-engagement-prediction-integration-DEEP-20260106.md`).

---

## 5) CLI Design

We implement `cm validate <videoPath>` as the user-facing entry point and return a clear error taxonomy on failure (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md` and `docs/research/investigations/RQ-14-ERROR-TAXONOMY-20260104.md`).  
We support `--profile portrait|landscape` to select threshold sets (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We support `--json` output to emit a machine-readable report that can be merged into `score.json` provenance (see `docs/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).

---

## 6) Testing Strategy

We add unit tests for each gate using small fixture MP4s and deterministic FFprobe outputs (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We add integration tests that run the CLI and assert the JSON report schema and failure codes (see `tasks/todo/TASK-016-quality-cli-integration-tests-20260106.md`).  
We add performance tests that enforce the <5s requirement under the default profile and sample-rate settings (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## 7) Implementation Steps (TDD)

We implement the FFprobe metadata collector first and write failing tests for resolution/duration/codec parsing (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We implement the gate runner abstraction consistent with the existing quality gate plan (see `docs/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`).  
We implement the BRISQUE script and add tests that validate sampling strategy and output shape before tuning thresholds (see `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We add the optional cadence gate last to avoid blocking the technical validation MVP (see `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).

---

## 8) References

The acceptance criteria and tool choices are defined by `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`.  
The quality gate framework and how gates integrate into the pipeline is defined by `docs/architecture/IMPL-CODE-QUALITY-GATES-20260105.md` and `docs/architecture/IMPL-PHASE-5-INTEGRATION-20260105.md`.  
The cadence/scene-boundary rationale is summarized in `docs/research/quality-gates/PYSCENEDETECT-20260106.md` and the vendored reference implementation lives in `vendor/clipping/pyscenedetect`.
