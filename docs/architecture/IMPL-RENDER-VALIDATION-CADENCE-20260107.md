# Implementation Plan: Cadence Gate (Scene Cut Frequency) for `cm validate`

**Date:** 2026-01-07  
**Status:** Implemented (TDD + V&V captured here)  
**Primary Task:** `tasks/todo/TASK-014-feature-render-validation-pipeline-20260107.md` (optional extension)  
**Research Inputs:** `docs/research/quality-gates/PYSCENEDETECT-20260106.md`  
**Vendor Reference:** `vendor/clipping/pyscenedetect` (reference-only)

---

## Problem Statement

Technical correctness (resolution/duration/codec) does not guarantee short-form pacing quality (per `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`).  
We want an optional post-render cadence measurement to support “proxy retention” quality gates without claiming engagement prediction (per `docs/research/investigations/RQ-26-ENGAGEMENT-PREDICTION-REPO-INTEGRATION-20260106.md`).

---

## Decision

We implement a cadence gate that estimates scene-cut frequency using FFmpeg’s scene-change detector to avoid adding a new Python dependency for PySceneDetect in the default path (per `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).  
We keep this gate severity as `warning` so it can guide iteration without blocking uploads unless explicitly desired (per `docs/architecture/IMPL-ENGAGEMENT-PROXY-SCORING-20260107.md`).

---

## Implementation (What We Built)

We implement cut detection via `ffmpeg -vf select='gt(scene,thr)',showinfo` in `src/validate/cadence.ts` (per `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).  
We implement a pure cadence evaluator `evaluateCadence` in `src/validate/cadence.ts` to keep logic testable without invoking FFmpeg (per `tasks/README.md`).  
We extend the report schema to include a `cadence` gate discriminant in `src/validate/schema.ts` (per `docs/research/investigations/RQ-03-SCHEMA-VERSIONING-20260104.md`).  
We wire cadence as an optional gate in `src/validate/validate.ts` and expose it via `--cadence` flags in `src/cli/commands/validate.ts` (per `docs/architecture/SYSTEM-DESIGN-20260104.md`).

---

## TDD Plan (RED → GREEN → REFACTOR)

### RED

We add unit tests for cadence evaluation using synthetic cut timestamps in `src/validate/cadence.test.ts` (per `tasks/README.md`).

### GREEN

We implement `evaluateCadence` to satisfy the threshold pass/fail behavior in `src/validate/cadence.ts` (per `tasks/README.md`).

### REFACTOR

We keep FFmpeg invocation separate from cadence math to reduce flakiness and keep deterministic tests fast (per `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).

---

## V&V Plan (4-Layer)

### Layer 1 — Schema Validation

We validate the extended report schema includes cadence gates without breaking older reports (per `src/validate/schema.ts`).

### Layer 2 — Programmatic Checks

We use median cut interval as the deterministic proxy for pacing cadence (per `docs/research/quality-gates/PYSCENEDETECT-20260106.md`).

### Layer 3 — LLM-as-Judge

We do not use LLM evaluation for cadence because the signal is mechanical and measurable (per `docs/guides/VV-FRAMEWORK-20260105.md`).

### Layer 4 — Human Review

We validate cadence warnings correlate with perceived “dead segments” in a sample of rendered clips (per `docs/research/sections/SECTION-VIRALITY-ENGINEERING-20260105.md`).
