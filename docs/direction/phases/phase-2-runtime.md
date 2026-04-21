# Phase 2 — Extract deterministic runtime

**Bead:** `content-machine-7tf.3` · **Priority:** P0
**Source:** findings doc section 12 Phase 2
**Blocked by:** Phase 1

## Goal

Carve out the deterministic media execution runtime as the primary
product core. Must be callable from harness skills and from scripts
without CLI plumbing.

## Actions

1. Collect render, TTS orchestration, caption alignment, concatenation,
   and QC into `src/runtime/` with a stable public entry point.
2. Remove hidden CLI-only couplings (flags, globals, cwd assumptions).
3. Ensure the runtime consumes contracts only (no ambient types).
4. Golden fixtures: offline deterministic pipeline with recorded
   artifacts covering at least the existing archetypes.

## Why second

Everything after Phase 2 calls into this layer. Stabilizing the public
API lets scripts and skills evolve quickly without reaching into guts.

## Acceptance

- `src/runtime/` exposes a documented public API.
- Golden fixtures pass offline (no network).
- CLI is reduced to a thin adapter over runtime entry points.
