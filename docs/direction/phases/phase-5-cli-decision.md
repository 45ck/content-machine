# Phase 5 — Decide the CLI fate with evidence

**Bead:** `content-machine-7tf.6` · **Priority:** P0
**Source:** findings doc section 12 Phase 5
**Blocked by:** Phase 4

## Goal

Run the CLI-demotion trial from the findings doc and decide
**keep-thin / keep-full / delete** based on tracked signals, not vibes.

## Trial

For a bounded window, produce real content through the harness +
skills + scripts path. Track:

- where humans reached for the CLI instead of the skill
- which CLI commands were invoked only by local automation
- which CLI commands hid behavior that should be in a script
- which workflows genuinely need a CLI ergonomics story

## Decision rule

- **Keep thin** if a small subset of commands survives on clear merit.
- **Keep full** only if evidence shows the CLI is the right product
  surface (unlikely given the north star).
- **Delete** if every surviving use-case is satisfied by scripts or
  skills.

## Acceptance

- Trial log stored under `docs/dev/trial-cli-20260xxx.md`.
- Decision recorded as an ADR in `docs/dev/architecture/`.
- CLI either trimmed to the chosen thin shell, kept with rationale, or
  removed with migration notes.
