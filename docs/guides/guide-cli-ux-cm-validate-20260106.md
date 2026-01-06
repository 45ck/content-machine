# guide-cli-ux-cm-validate-20260106

UX review for `cm validate` (video → validation report). References `docs/guides/guide-cli-ux-standards-20260106.md`.

## Current UX (observed)

- Uses a spinner (“Validating video…”), writes a JSON report to `--output` (default `validate.json`).
- `--json` prints the full report JSON to stdout (and stops the spinner).
- On failure, prints failing gates + “Fix:” and exits `1`.

## UX gaps / risks

- CLI defines its own `--json` flag, while the root command also defines `--json` (potential confusion/merging).
- No “summary table” for all gates (pass/fail list); it only prints failures.
- No `--strict`/`--warn-only` mode; some users want non-blocking warnings.

## Improvements (proposed)

- Unify `--json` behavior with the root option (single flag, consistent meaning across commands).
- Always print a compact gate summary, then failures with fixes; keep details in JSON.
- Add `--warn-only` (exit `0` but mark failures) and `--fail-fast` (stop on first failing gate).
- Print “next step” suggestions: re-render with `--orientation`, adjust codec/fps, etc.
