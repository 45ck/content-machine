# Implementation Plan: Render Validation Test Fixtures (FFmpeg-generated)

**Date:** 2026-01-07  
**Status:** Implemented (TDD + V&V captured here)  
**Primary Task:** `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`  
**Research Inputs:** `docs/research/investigations/RQ-17-FFMPEG-CONCATENATION-20260105.md`

---

## Problem Statement

Validation gates need reliable fixtures that represent pass/fail cases for resolution and container/codecs (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
Committing binary video fixtures is risky for repo size and contributor friction, so we prefer deterministic generation at test time (per `docs/dev/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`).

---

## Decision

We generate fixtures with FFmpeg using `lavfi` sources so tests remain deterministic and do not depend on external downloads (per `docs/research/investigations/RQ-17-FFMPEG-CONCATENATION-20260105.md`).  
We gate the integration test on availability of `ffmpeg` and `ffprobe` so contributors without FFmpeg can still run unit tests (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## Implementation (What We Built)

We add an integration test `tests/integration/render/validate-video.test.ts` that generates a valid portrait MP4 and validates it with `validateVideoPath` (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We generate a wrong-resolution MP4 in the same test to assert the resolution gate fails correctly (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## TDD Plan (RED → GREEN → REFACTOR)

### RED

We add an integration test that expects a generated MP4 to pass validation under the portrait profile (per `tasks/README.md`).

### GREEN

We implement the minimal FFmpeg invocation and validate it produces the expected report output (per `tasks/README.md`).

### REFACTOR

We extract helper functions (`hasCommand`, `makeColorVideo`) to keep test intent clear and reduce repetition (per `docs/dev/architecture/IMPL-CODE-QUALITY-GATES-20260105.md`).

---

## V&V Plan (4-Layer)

### Layer 1 — Schema Validation

We validate the produced report shape in the unit tests via `ValidateReportSchema` (per `src/validate/validate.test.ts`).

### Layer 2 — Programmatic Checks

We validate resolution/duration/format gates against generated fixtures with known properties (per `tests/integration/render/validate-video.test.ts`).

### Layer 3 — LLM-as-Judge

We do not use LLMs for validation fixture testing because the properties are deterministic (per `docs/dev/guides/VV-FRAMEWORK-20260105.md`).

### Layer 4 — Human Review

We validate that the generated fixtures are truly correct by spot-checking with `ffprobe` during development (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).
