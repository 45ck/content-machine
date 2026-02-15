# guide-cli-ux-cm-validate-20260106

UX review for `cm validate` (video -> validation report). This is the "trust anchor" command for shipping: it should be boring, precise, and CI-friendly.

References: `docs/dev/guides/guide-cli-ux-standards-20260106.md`.

## Who is the user here?

- Creator-operator: wants to avoid upload failures and platform rejections.
- Engineer-operator: wants a gate that can run in CI with stable exit codes and JSON output.
- Contributor/debugger: wants actionable fixes when a gate fails.

## Job to be done

"Tell me if this video is valid for the target profile, and if not, tell me exactly what to change."

## Current behavior (as implemented today)

- Spinner: "Validating video...".
- Writes a report JSON file (default `validate.json`).
- `--json` prints the full report JSON to stdout.
- On failure, prints failing gates with a "Fix:" line and exits with code 1.
- Supports:
  - `--profile <portrait|landscape>`
  - `--probe-engine <ffprobe|python>`
  - `--ffprobe <path>`, `--python <path>`
  - `--cadence`, `--cadence-max-median <seconds>`, `--cadence-threshold <n>`
  - `--quality` and `--quality-sample-rate <n>`

## UX gaps

- `--json` behavior exists for this command, but is not aligned with the root `--json` option (consistency issue).
- The default human output emphasizes only failures; users benefit from a compact pass/fail list (all gates) for confidence.
- There is no "warn-only" mode for non-blocking workflows.

## Recommendations

### P0

- Always print a compact gate summary (pass/fail) in human mode, then print failures with fixes.
- Make `--json` consistent with the root option (single meaning across commands).
- Validate dependencies early (ffprobe/python path, and ffmpeg if cadence is enabled) and fail with a clear "Fix:" line.

### P1

- Add `--warn-only` (exit 0 but include failures in the report) and `--fail-fast` (stop on first failing gate).
- Print "next steps" that map directly to `cm render` flags when possible (orientation, fps).

## Ideal failure output (ASCII sketch)

```
Validation failed (profile=portrait)
FAILED: resolution (expected 1080x1920, got 720x1280)
Fix: re-render with --orientation portrait (or change render width/height in config)
Report: out/validate.json
```

## UX acceptance criteria

- Always prints a compact gate summary (pass/fail) in human mode.
- On failure, prints each failing gate with a specific "Fix:" line and exits 1.
- In `--json` mode, prints exactly one JSON object to stdout with no spinners.
- If `--cadence` is enabled and ffmpeg is missing, fails with a clear dependency message and fix.
