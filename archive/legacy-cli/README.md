# Legacy CLI Archive

Frozen landing zone for the pre-pivot `cm` CLI and its command surface.

## Status

- reference only
- not actively maintained
- not a target for new feature work
- retained for diffing, provenance, and migration help

## Scope

This subtree is where the old CLI-oriented surface lands as it is
archived out of the active repo shape.

Current contents include:

- archived `src/cli/commands/*` implementations beyond the thin surviving shell
- archived `src/lab/`, `src/workflows/`, and CLI-only research orchestrators
- archived CLI-focused tests and user guides
- archived `tasks/` planning notes that were superseded by beads

## Use instead

- prefer `skills/` for intent contracts
- prefer `flows/` for orchestration
- prefer `scripts/harness/` for executable JSON-stdio entrypoints

See [`../../DIRECTION.md`](../../DIRECTION.md) for the pivot narrative
and [`../../docs/direction/03-reorg-synthesis.md`](../../docs/direction/03-reorg-synthesis.md)
for the phase plan.
