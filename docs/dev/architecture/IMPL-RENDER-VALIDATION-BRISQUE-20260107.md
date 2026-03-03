# Implementation Plan: Visual Quality Gate (BRISQUE) for `cm validate`

**Date:** 2026-01-07  
**Status:** Implemented (TDD + V&V captured here for auditability)  
**Primary Task:** `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`  
**Research Inputs:** `docs/research/quality-gates/00-QUALITY-GATES-SUMMARY-20260106.md`, `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`

---

## Problem Statement

Render outputs can be technically valid while still being visually degraded by heavy compression or bad encode settings (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We need a no-reference quality metric that can be applied post-render without platform APIs (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## Decision

We implement BRISQUE as the first “visual quality” gate because it is explicitly specified in the task acceptance criteria (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We implement BRISQUE via a Python helper to keep the TypeScript runtime small and to align with the documented Python-subprocess patterns (per `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).

---

## Implementation (What We Built)

We implement a Python BRISQUE analyzer script at `scripts/video_quality.py` that returns strict JSON on stdout (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We implement a TypeScript adapter `PiqBrisqueAnalyzer` at `src/validate/quality.ts` that executes the Python script and parses the output into a stable summary contract (per `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).  
We implement a gate function `runVisualQualityGate` at `src/validate/quality.ts` that compares mean BRISQUE against profile thresholds (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We integrate the gate into `validateVideoPath` in `src/validate/validate.ts` behind an explicit `quality.enabled` option (per `docs/dev/architecture/IMPL-RENDER-VALIDATION-PIPELINE-20260107.md`).  
We add profile thresholds (`brisqueMax`) in `src/validate/profiles.ts` (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We extend the validation report schema with a `visual-quality` discriminant in `src/validate/schema.ts` (per `docs/research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md`).

---

## TDD Plan (RED → GREEN → REFACTOR)

### RED

We add failing unit tests for the BRISQUE gate decision logic in `src/validate/quality.test.ts` (per `tasks/README.md`).

### GREEN

We implement the minimal gate logic in `src/validate/quality.ts` to satisfy pass/fail expectations (per `tasks/README.md`).  
We implement the minimal schema change in `src/validate/schema.ts` to make report validation reflect the new gate (per `docs/research/investigations/RQ-04-STRUCTURED-LLM-OUTPUT-20260104.md`).

### REFACTOR

We isolate subprocess execution and JSON parsing into dedicated helpers in `src/validate/quality.ts` to keep error handling consistent (per `docs/research/investigations/RQ-16-PYTHON-SUBPROCESS-20260105.md`).

---

## V&V Plan (4-Layer)

### Layer 1 — Schema Validation

We validate the report shape via `ValidateReportSchema` in `src/validate/schema.ts` (per `docs/dev/guides/VV-FRAMEWORK-20260105.md`).

### Layer 2 — Programmatic Checks

We enforce `mean < brisqueMax` as the deterministic acceptance rule (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

### Layer 3 — LLM-as-Judge

We explicitly do not use LLM scoring for this gate because BRISQUE is already an automated no-reference metric (per `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).

### Layer 4 — Human Review

We validate that “fail” examples correspond to visibly degraded renders and confirm thresholds match creator expectations (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).

---

## Operational Notes

We expose the gate via CLI options in `src/cli/commands/validate.ts` so the runtime cost is explicit (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).  
We keep sampling configurable (`--quality-sample-rate`) to balance speed vs accuracy (per `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md`).
