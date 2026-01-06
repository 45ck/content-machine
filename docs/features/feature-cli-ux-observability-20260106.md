# feature-cli-ux-observability-20260106

Implement CLI-first observability and UX foundations so users always understand:

- what `cm` is doing now (system status)
- what will happen next (pipeline stage)
- where outputs are being written (artifact paths)
- how to recover from failures (actionable fixes)

This feature is the enabling layer for consistent progress updates, JSON mode, and LLM streaming UX.

## User Story

As a CLI user, I want `cm` to clearly communicate status and progress and to fail with actionable fixes, so I can trust long-running jobs and automate them in scripts/CI.

## HCI Principles (Design Requirements)

- Visibility of system status: progress and stages must be visible and honest.
- Error prevention: validate inputs early; fail before expensive work.
- Recoverability: every failure should provide an actionable "Fix:" line.
- Consistency: global flags (`--json`, `--verbose`) behave the same across all commands.
- Accessibility: ASCII-safe output by default (or automatic fallback), no reliance on glyphs.

## Non-Goals

- Rewriting the pipeline algorithms themselves (LLM prompting, TTS model quality, visuals ranking).
- Making every operation resumable (we will define hooks for it, but not fully implement it here).

## Proposed UX Contract (baseline)

### Output streams

- stdout: *result only* (path or one JSON object in `--json` mode)
- stderr: progress UI, logs, warnings, human summaries

### Exit codes

- `0` success
- `1` runtime failure (IO/API/render)
- `2` invalid usage / schema validation failure
- `130` user canceled (Ctrl+C)

### ASCII-safe output

- Default to ASCII-safe prefixes: `INFO:`, `WARN:`, `ERROR:`.
- If the terminal supports Unicode and the user has not disabled it, optional decorations are allowed.
- Support `NO_COLOR=1` and/or `--no-color` (Commander supports this pattern).

## Technical Design

### 1) Introduce a CLI runtime context

Create a shared runtime context (owned by `src/cli/index.ts`) that every command can access:

- `isTty` detection for stderr
- `jsonMode` (root `--json`)
- `verbose` (root `--verbose`)
- `startTime`
- `progressReporter` instance

### 2) Standardize error formatting

Replace ad-hoc glyph output with a deterministic formatter:

- stable `code` (from `CMError`)
- message
- `Fix:` line (required for user-facing errors)
- optional context (paths, allowed values)

### 3) Standardize preflight validation

Add a command preflight pattern:

- validate required files exist (paths)
- validate JSON file schema with Zod (stage inputs)
- validate option enums and numbers (commander option coercion)

## TDD Plan (RED -> GREEN -> REFACTOR)

### Unit tests (Vitest)

- `formatErrorForCli()`:
  - CMError with context -> deterministic multi-line output (ASCII)
  - unknown error -> wraps with `UNKNOWN_ERROR`
- runtime context:
  - when `--json` is set -> reporter disables spinners and ANSI
  - when not TTY -> reporter uses plain text lines
- preflight helpers:
  - missing file -> exit code 2 and actionable fix
  - schema failure -> exit code 2 and points to the producing command

### Integration tests (Vitest)

Run the CLI entry (`tsx src/cli/index.ts`) in a child process:

- `cm --json help` (or a command in json mode) prints one JSON object to stdout and nothing else
- `cm script --duration abc` exits with 2 and prints `Fix:` guidance

### E2E smoke

- Run `cm generate --dry-run` and verify:
  - shows resolved artifacts directory
  - no files written

## V&V (4-layer)

### Layer 1: Schema validation

- JSON outputs in `--json` mode are versioned and validated with Zod.

### Layer 2: Programmatic checks

- stdout contract: exactly one JSON object in `--json` mode
- stderr contract: no spinners in non-TTY or `--json`
- exit code mapping

### Layer 3: LLM-as-judge (optional)

Use a rubric to evaluate error messages:

- does the message say what failed?
- does it include a concrete fix?
- does it include the relevant path/value?

### Layer 4: Human review

- "cold start" onboarding via `cm init`
- failure recovery drills (missing API keys, wrong inputs)

## Rollout / Backwards Compatibility

- Keep existing command output in human mode initially, but introduce consistent prefixes and error format.
- Add a "compat note" in docs: `--json` becomes authoritative for automation.

## Related

- `docs/guides/guide-cli-ux-standards-20260106.md`
- `docs/guides/guide-cli-ux-cm-*-20260106.md`
