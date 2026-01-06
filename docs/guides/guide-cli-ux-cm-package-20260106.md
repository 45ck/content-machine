# guide-cli-ux-cm-package-20260106

UX review for `cm package` (topic → `packaging.json`). References `docs/guides/guide-cli-ux-standards-20260106.md`.

## Current UX (observed)

- Uses an `ora` spinner (“Generating packaging…”).
- Validates `--platform` via `PlatformEnum`, normalizes `--variants`, supports `--dry-run` and `--mock`.
- Writes `packaging.json` and prints a short summary including the selected variant.

## UX gaps / risks

- No “how to apply this” guidance (e.g., `cm script --package packaging.json`).
- No `--json` output mode for the selected packaging (stdout is human summary only).

## Improvements (proposed)

- After success, print the next command: `cm script --topic "<topic>" --package <output>`.
- Add `--select <index|strategy>` to control which variant becomes “selected”.
- Add `--json` output with `{outputPath,platform,variants,selected}` and a stable schema version.
