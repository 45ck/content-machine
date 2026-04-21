# Phase 1 — Extract typed content contracts

**Bead:** `content-machine-7tf.2` · **Priority:** P0
**Source:** findings doc section 12 Phase 1
**Blocked by:** Phase 0

## Goal

Pull typed content contracts out of the orchestration code into their
own package so harnesses, skills, and scripts can depend on schema
without pulling runtime.

## Actions

1. Inventory the types that currently cross module boundaries (script,
   scene plan, render plan, evaluation result, validation report).
2. Lift them into `src/contracts/` with no runtime dependencies.
3. Add contract-only tests that pin schema stability.
4. Migrate runtime + CLI + at least one consumer to import from
   contracts only.

## Why first

The contracts are the API surface every later phase depends on. They
are the cheapest thing to get right and the most expensive thing to
change later.

## Acceptance

- `src/contracts/` builds in isolation and publishes a stable public API.
- Runtime + CLI + at least one consumer import from `src/contracts/`
  only (no leakage from runtime internals).
- Contract tests green in CI.
