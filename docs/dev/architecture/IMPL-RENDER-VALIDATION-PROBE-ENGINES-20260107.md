# Implementation Plan: Video Probe Engines (ffprobe + Python wrapper)

**Date:** 2026-01-07  
**Status:** Implemented (TDD + V&V captured here)  
**Primary Task:** `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`  
**Research Inputs:** `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`

---

## Problem Statement

`cm validate` needs reliable video metadata extraction (width/height/duration/container/codecs) to power the resolution/duration/format gates (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We want to support both a direct `ffprobe` call path and a Python wrapper path so the task’s “Python scripts” approach remains viable when needed (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## Decision

We keep `ffprobe` as the default engine for speed and simplicity (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We add a Python probe wrapper to match the task’s script-based design and to reuse the same subprocess reliability patterns as other helpers (per `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).

---

## Implementation (What We Built)

We implement an `ffprobe` probe function in `src/validate/ffprobe.ts` that returns a typed `VideoInfo` (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We implement a Python probe script at `scripts/video_info.py` that outputs strict JSON (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We implement a TypeScript wrapper in `src/validate/python-probe.ts` that runs `scripts/video_info.py` and maps JSON into `VideoInfo` (per `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).  
We add a probe-engine switch to `validateVideoPath` in `src/validate/validate.ts` (per `docs/dev/architecture/IMPL-RENDER-VALIDATION-PIPELINE-20260107.md`).  
We surface probe-engine selection via CLI flags in `src/cli/commands/validate.ts` (per `docs/dev/architecture/SYSTEM-DESIGN-20260104.md`).

---

## TDD Plan (RED → GREEN → REFACTOR)

### RED

We add a unit test that validates JSON mapping for the Python probe wrapper in `src/validate/python-probe.test.ts` (per `tasks/README.md`).

### GREEN

We implement `parsePythonVideoInfo` in `src/validate/python-probe.ts` and keep the contract aligned with `VideoInfo` (per `tasks/README.md`).

### REFACTOR

We unify subprocess error handling into a single helper inside `src/validate/python-probe.ts` so failure modes are consistent with other helpers (per `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).

---

## V&V Plan (4-Layer)

### Layer 1 — Schema Validation

We validate that the produced report remains `ValidateReportSchema` compliant regardless of probe engine (per `src/validate/schema.ts`).

### Layer 2 — Programmatic Checks

We ensure probe outputs are rejected if width/height/duration are missing or non-numeric (per `src/validate/ffprobe.ts` and `src/validate/python-probe.ts`).

### Layer 3 — LLM-as-Judge

We do not use an LLM for probing because the metadata is deterministic and machine-extractable (per `docs/dev/guides/VV-FRAMEWORK-20260105.md`).

### Layer 4 — Human Review

We validate probe results against known fixtures generated with FFmpeg in integration testing (per `tests/integration/render/validate-video.test.ts`).
