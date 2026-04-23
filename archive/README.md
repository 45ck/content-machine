# Archive — frozen reference code

This folder holds code that was part of content-machine before the harness-first pivot (see `../DIRECTION.md` and `../docs/direction/03-reorg-synthesis.md`). Archived code is retained for backwards-compat reference and diffing only. It is **not actively maintained**. It is **not published** to npm. CI does not run against it. New bug reports against archived code will be closed with a pointer to the replacement skill/flow.

Archived code may be incomplete, broken, or dependent on unmaintained
integrations. Do not build new work on top of it. Do not import
archived modules back into active runtime paths without an explicit
restore decision in a direction or classification document.

## Contents

| path          | archived-from                  | archived-in-phase | replaced-by                             | date       |
| ------------- | ------------------------------ | ----------------- | --------------------------------------- | ---------- |
| `legacy-cli/` | pre-pivot `cm` command surface | Phase 4+          | `skills/`, `flows/`, `scripts/harness/` | 2026-04-23 |

## How to restore

Archived modules retain their full history across the move because `git log --follow <file>` traces renames. To revive an archived module, move it back out of `archive/` to its new home and declare it `keep` in a classification doc so future reorg passes do not re-archive it.

## What does NOT belong in archive

- Research material under `docs/research/` stays where it is.
- Typed contracts stay in the live contract surface (`src/domain/` now,
  `src/contracts/` once extracted).
- Vendored third-party code under `connectors/mcp-reddit/` stays where it is — it has its own `VENDORED.md`.
