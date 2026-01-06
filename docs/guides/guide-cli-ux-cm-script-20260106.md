# guide-cli-ux-cm-script-20260106

UX review for `cm script` (topic -> `script.json`). This is the first stage users touch when they want control, iteration, and fast feedback without running the full pipeline.

References: `docs/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator: wants a good hook and structure quickly; may iterate many times.
- Researcher/ideation: wants a script artifact to review and edit.
- Contributor/debugger: uses `--mock` and `--dry-run` to validate wiring.

## Job to be done

"Give me a script artifact I can inspect, edit, version, and feed into later stages."

## Current behavior (as implemented today)

- Spinner: "Generating script...".
- Required: `--topic`.
- Options: `--archetype`, `--duration`, `--package` (from `cm package`), `--mock`, `--dry-run`.
- `--dry-run` prints parameters and a rough "target words" estimate (duration \* 2.5).
- Writes `script.json` (default name) and prints a short summary (title, archetype, scenes, word count).

## UX gaps (what breaks trust or flow)

- Numeric parsing: `--duration` is parsed with `parseInt`. Bad input leads to late failures and unclear error messaging.
- Packaging recoverability: when `--package` fails schema validation, the user is not told the quickest recovery path (how to generate a valid file).
- Machine output: there is no `--json` mode for piping the generated script to another tool without touching disk.

## Recommendations

### P0

- Validate `--duration` at the CLI boundary and return exit code 2 for invalid values (make the error tell the user the valid range and example usage).
- When `--package` fails, print a specific "Fix:" line:
  - "Fix: run `cm package \"<topic>\" -o packaging.json` then pass `--package packaging.json`"
- Print the resolved output path at the end (absolute path in TTY mode is helpful on Windows).

### P1

- Add `--json` behavior: print the script JSON to stdout (and optionally skip writing via a future `--no-write`).
- Add a `--seed` or `--deterministic` mode for reproducibility (important for Persona B and testing).

## Ideal error output (ASCII sketch)

```
ERROR: Invalid --duration "abc"
Fix: pass an integer number of seconds, e.g. --duration 45
```
