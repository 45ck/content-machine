# Phase 3 — Deterministic script / hook surfaces

**Bead:** `content-machine-7tf.4` · **Priority:** P0
**Source:** findings doc section 12 Phase 3
**Blocked by:** Phase 2

## Goal

Build the thin deterministic scripts/hooks the harnesses invoke.
Scripts must be reproducible, log-structured, and callable from Claude
Code / Codex / OpenCode.

## Actions

1. Identify the minimum script set: `ingest`, `render`, `publish-prep`.
2. Each script takes contract-shaped input, writes contract-shaped
   output and a structured log.
3. No hidden state. No interactive prompts. No network except the
   runtime's explicit adapters.
4. Wire them into CI so each runs end-to-end on fixtures.

## Principle

Scripts are the harness's hands. They do exactly what the runtime does,
nothing more. Anything "smart" belongs in a skill calling the script.

## Acceptance

- At least three end-to-end scripts run green in CI with recorded traces.
- Each script has a reference doc under `docs/dev/`.
- A harness can invoke them from a skill without custom glue.
