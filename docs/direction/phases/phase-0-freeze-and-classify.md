# Phase 0 — Freeze and classify

**Bead:** `content-machine-7tf.1` · **Priority:** P0
**Source:** findings doc section 12 Phase 0
**Status:** In progress — scaffolding pass complete

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

## Deliverables (2026-04-22)

- [`../03-reorg-synthesis.md`](../03-reorg-synthesis.md) — Phase 0 synthesis, the authoritative consolidation.
- [`../classification-20260422.md`](../classification-20260422.md) — per-file keep/move/archive/delete.
- [`../04-skill-catalog.md`](../04-skill-catalog.md) — ~35 skills, source-pack-grounded.
- [`../05-flow-catalog.md`](../05-flow-catalog.md) — 10 prompt-language flows.
- [`../../../archive/README.md`](../../../archive/README.md) — archive policy and landing zone.

## Acceptance

- Every top-level surface under `src/` has a classification tag.
- The freeze note is discoverable from both `CHANGELOG.md` and `README.md`.
- The classification doc cross-links to the relevant phase bead for
  anything tagged move/deprecate.
- Synthesis doc exists at `docs/direction/03-reorg-synthesis.md`.
- Classification covers every `src/` subtree in `docs/direction/classification-20260422.md`.
- Skill catalogue exists at `docs/direction/04-skill-catalog.md`.
- Flow catalogue exists at `docs/direction/05-flow-catalog.md`.
- Archive landing zone scaffolded at `archive/README.md`.
- File moves are explicitly out of scope for Phase 0; they land in Phase 3/4.
