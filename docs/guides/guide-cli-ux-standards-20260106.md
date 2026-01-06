# guide-cli-ux-standards-20260106

UX standards for `content-machine` (`cm`) as a CLI-first product. The per-command UX reviews in `docs/guides/` should align with this document.

## Product reality (what `cm` is)

`cm` is a production tool delivered through a terminal. Users do not want "terminal theater"; they want predictable artifacts (JSON, WAV, MP4), fast feedback, and errors that tell them exactly how to recover.

The CLI is the "UI", but the outputs are media assets. That means UX is largely about:

- making long operations feel safe and understandable
- making files and next actions obvious
- making scripting and CI reliable

## Users (personas)

### Persona A: Creator-operator (primary)

- Goal: "Give me an upload-ready video fast."
- Environment: often Windows + PowerShell, sometimes macOS; may not be a developer.
- Needs: a single "golden path" command; clear progress; minimal setup; practical error messages.

### Persona B: Engineer-operator (primary)

- Goal: "I want to automate this and trust it."
- Environment: CI, cron, scripts, pipelines; non-interactive; wants stable JSON, exit codes, and determinism.
- Needs: no spinners in non-TTY; machine-readable output; stable schemas; explicit artifact paths; predictable failure modes.

### Persona C: Researcher / ideation (secondary)

- Goal: "Find evidence and angles quickly."
- Environment: terminal + editor; may never render video.
- Needs: good summaries, reproducible outputs, and transparent source coverage.

### Persona D: Contributor / debugger (secondary)

- Goal: "Reproduce issues and make changes safely."
- Environment: local dev; wants mocks, dry-run, verbose logs, and artifact retention.

## Jobs to be done (JTBD)

- Generate a full short video from a topic.
- Run or re-run a specific stage (script/audio/visuals/render) without repeating earlier stages.
- Validate a rendered output for platform requirements (especially in CI).
- Produce packaging or research outputs for creative iteration.

## Mental model (pipeline + artifacts)

Users should be able to understand `cm` as a set of pure-ish transforms:

```
topic -> script.json -> audio.wav + timestamps.json -> visuals.json -> video.mp4
```

Principle: each command should clearly state (a) required inputs, (b) produced outputs, and (c) where the outputs live.

## Modes (the CLI must behave well in each)

- Interactive (TTY): short status + progress, then a compact summary.
- Scriptable (pipes/CI): minimal stderr noise; `--json` prints one JSON object to stdout.
- Debug: `--verbose` increases detail and retains more artifacts.
- Preview: `--dry-run` shows what would happen without side effects.

## Output contract (recommended)

### stdout vs stderr

- stdout: the "result" (a path, an ID, or JSON). Keep it stable for scripting.
- stderr: progress spinners, logs, warnings, human summaries.

### `--json` (root option exists today)

When `--json` is set, every command should:

- disable spinners/ANSI and avoid multi-line "pretty" formatting
- write exactly one JSON object to stdout
- include `{schemaVersion, command, args, outputs, timings, warnings, errors}`
- still write artifacts to disk unless `--dry-run` (or a future `--no-write`) is used

### `--verbose` (root option exists today)

When `--verbose` is set, every command should:

- increase log detail (ideally by wiring to logger level)
- include timing and sub-step detail without changing the stable "summary" fields

### Exit codes (recommended)

- 0: success
- 1: runtime failure (API/IO/render)
- 2: invalid usage (bad flags, schema validation failure)
- 130: user canceled (Ctrl+C)

## Progress contract (recommended)

Long operations are unavoidable. The user must always know:

- what stage is running now
- whether it is making progress
- what will be produced (paths)

Recommendations:

- prefer structured progress events (stage + phase + percent) rather than parsing message strings
- show percent where available (bundle/render/download); otherwise show sub-steps
- include an ETA only if it is honest (measured from real throughput)

## Error contract (recommended)

Every user-facing error should include:

- a short message ("what failed")
- a stable `code` (already exists via `CMError`)
- a one-line fix ("what to do next")
- relevant context fields (paths, providers, required env vars)

Prefer ASCII-safe severity prefixes:

```
ERROR: Missing PEXELS_API_KEY
Fix: set PEXELS_API_KEY in .env or your environment
```

## Command help (recommended)

Help text should answer, in this order:

1. What is this command for?
2. What do I need to provide?
3. What files will I get and where?
4. Examples for the common path and the "debug" path.

## Known current constraints (as of 2026-01-06)

- Some CLI output contains non-ASCII glyphs that can render as mojibake on Windows terminals. Prefer ASCII defaults or add an explicit ASCII fallback mode.
- Root `--json` and `--verbose` exist, but are not consistently applied to command output/logging.
- Some flags imply behavior that is not yet fully implemented (e.g., artifact retention semantics).

## Related

- `src/cli/index.ts`
- `src/cli/utils.ts`
