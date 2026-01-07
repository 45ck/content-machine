# guide-cli-stdout-stderr-contract-20260107

This guide defines the stdout/stderr contract for `cm` and how to implement it consistently across commands.

## Why this matters (CLI UX)

- Users see progress in interactive terminals, but scripts and CI need stable, parseable output.
- The simplest rule: stdout is the result; stderr is the UI.

## Contract

### stdout

stdout is reserved for:

- a single path (primary artifact) in human mode, or
- a single schema-versioned JSON envelope in `--json` mode

No spinners, no logs, no multi-line summaries.

### stderr

stderr is reserved for:

- progress UI (spinners, percent, phase messages)
- warnings and diagnostics
- human summaries (multi-line)

## Implementation pattern

For every command:

1. Determine the primary output path:
   - `script`: `script.json`
   - `audio`: `audio.wav` (and mention timestamps on stderr)
   - `visuals`: `visuals.json`
   - `render`: `video.mp4`
   - `generate`: `video.mp4`
   - `validate`: `validate.json` (and exit code indicates pass/fail)
   - `package`: `packaging.json`
   - `research`: `research.json`
   - `init`: `.content-machine.toml`
2. In human mode:
   - print progress + summary to stderr
   - print only the primary output path to stdout
3. In `--json` mode:
   - stdout prints exactly one JSON envelope
   - stderr is quiet or minimal (no spinners)

## Validation (V&V)

- Layer 2 check: stdout contains either:
  - exactly one JSON object (json mode), or
  - exactly one non-empty line with a path (human mode)
- Layer 2 check: stderr contains progress/summary, but never breaks stdout parsing.

## Common pitfalls

- Logging frameworks writing to stdout (must be disabled in `--json` mode).
- Spinners writing to stdout (must be disabled in `--json` mode).
- Commands printing summaries to stdout via `console.log` (move to stderr).

## Related

- `docs/guides/guide-cli-ux-standards-20260106.md`
- `docs/features/feature-cli-json-contract-20260106.md`
