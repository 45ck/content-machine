# Phase 0 — Freeze and classify

**Bead:** `content-machine-7tf.1` · **Priority:** P0
**Source:** findings doc section 12 Phase 0

## Goal

Stop shipping new surface area at the control-plane layer and produce a
line-by-line classification of the current codebase against the target
boundaries.

## Actions

1. Announce a freeze on new CLI commands and new agentic orchestration.
2. Walk `src/` and classify every top-level surface as
   **keep / move-to-skill / deprecate** per
   [`../02-keep-move-deprecate.md`](../02-keep-move-deprecate.md).
3. Produce the classification table in `docs/dev/classification-20260421.md`.
4. Add a freeze notice to `CHANGELOG.md` and to `README.md`.

## Deliverables

- `docs/dev/classification-20260421.md` — per-surface keep/move/deprecate.
- Freeze note in `CHANGELOG.md`.
- Freeze callout near the top of `README.md`.

## Acceptance

- Every top-level surface under `src/` has a classification tag.
- The freeze note is discoverable from both `CHANGELOG.md` and `README.md`.
- The classification doc cross-links to the relevant phase bead for
  anything tagged move/deprecate.
