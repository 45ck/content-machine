# Archive — frozen reference code

This folder holds code that was part of content-machine before the harness-first pivot (see `../DIRECTION.md` and `../docs/direction/03-reorg-synthesis.md`). Archived code is retained for backwards-compat reference and diffing only. It is **not actively maintained**. It is **not published** to npm. CI does not run against it. New bug reports against archived code will be closed with a pointer to the replacement skill/flow.

## Contents

| path | archived-from | archived-in-phase | replaced-by | date |
| ---- | ------------- | ----------------- | ----------- | ---- |

## How to restore

Archived modules retain their full history across the move because `git log --follow <file>` traces renames. To revive an archived module, move it back out of `archive/` to its new home and declare it `keep` in a classification doc so future reorg passes do not re-archive it.

## What does NOT belong in archive

- Research material under `docs/research/` stays where it is.
- Typed contracts under `src/contracts/` stay where they are.
- Vendored third-party code under `connectors/mcp-reddit/` stays where it is — it has its own `VENDORED.md`.
