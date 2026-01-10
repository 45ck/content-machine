# Feature: Default Interactive TUI Mode for `cm` (Insane CLI UX)

**Date:** 2026-01-10  
**Status:** Draft  
**Owners:** Unassigned

---

## Overview

`content-machine` is CLI-first, but today it behaves like a collection of commands. This feature adds an app-like experience without breaking composability:

- If a user runs `cm` with **no arguments** in a TTY, it launches a **full-screen interactive TUI** (Ink-based) that guides them through the pipeline and provides live progress, previews, and recovery.
- If `cm` is run in non-interactive contexts (non-TTY, `--json`, CI), it stays **scriptable** and behaves like a normal CLI (help/errors/artifacts).

The "insane UX" goal is to make the default path feel like a product, while still keeping `cm script/audio/visuals/render/generate` as stable, automatable primitives.

## User Value

- New users don't need to memorize commands/flags: the TUI is a discoverable "home screen".
- Power users get faster iteration loops: rerun a stage, edit artifacts, and inspect timings/costs without leaving the terminal.
- Better trust: clear progress, artifact locations, and recovery options reduce "did it work?" uncertainty.

## Goals

- Make `cm` (no args) launch interactive TUI by default in TTY environments.
- Provide a guided "Generate" flow that still writes the same artifacts and final outputs as the headless pipeline.
- Use existing event infrastructure (`src/core/events/`) for live progress + cost tracking.
- Preserve machine-readability: `--json` remains deterministic and silent on stdout.
- Strong recovery UX: show the last successful artifact, suggested next commands, and "retry stage" actions.

## Non-goals

- Rewriting pipeline logic or changing artifact schemas as part of the first iteration.
- Replacing existing subcommands with interactive-only behavior.
- Building a GUI (browser/desktop) or requiring network access beyond current commands.

## UX / CLI

### Commands

- `cm` (no args)
  - **TTY:** launches TUI home screen
  - **non-TTY:** prints help (or a concise usage error)
- `cm ui`
  - Explicit entrypoint to the TUI home screen (same behavior as `cm` in TTY)
- Existing commands remain:
  - `cm script`, `cm audio`, `cm visuals`, `cm render`, `cm generate`, `cm init`, etc.

### Global Options / Escape Hatches

- `--json` (existing): never launch TUI; emit JSON envelope or help/errors only.
- `--no-tui` (new): force non-interactive behavior even in TTY (useful for "copy/paste help" or debugging).
- `CM_DISABLE_TUI=1` (new): environment escape hatch equivalent to `--no-tui`.

### TUI Home Screen (Information Architecture)

**Primary actions**

- `Generate video` (guided wizard)
- `Run stage` (script/audio/visuals/render) with "select input file" picker
- `Open artifacts` (recent runs)

**Secondary actions**

- `Templates` (browse available templates, preview config)
- `Validate / Score / Rate` (quality tooling)
- `Publish` (if configured)
- `Settings` (read-only view of config + where it was loaded from)

### Core TUI Views

1. **Home**
   - Recent runs list (last N artifact dirs) + status
   - Quick start: "Generate" wizard
2. **Generate Wizard**
   - Topic input, archetype, template selection, voice selection, output path
   - Presets: `fast | standard | quality | maximum` (maps to `--sync-preset`)
   - "Advanced" toggle for power flags (fps, caption settings, gameplay, reconcile)
3. **Pipeline Run**
   - 4 stages row: Script / Audio / Visuals / Render
   - Live progress per stage (from `PipelineEventEmitter`)
   - Cost/tokens/time panels (from `CostTrackerObserver`)
   - Live log panel (stderr-like, but scoped to current run)
4. **Artifacts / Preview**
   - Script preview (scenes, hooks, word counts)
   - Timestamps/captions preview (word-level timing; page grouping visualization)
   - Visuals preview (selected clips, queries, providers)
   - Output summary: paths, durations, and next suggested actions
5. **Error & Recovery**
   - "What failed" + stage + human-readable error
   - Show last successful artifact(s)
   - Actions: retry stage, open artifact JSON, open logs, switch preset, run validate/score

### Keybindings (Proposed)

- `?` help overlay / keymap
- `g` Generate wizard
- `1..4` jump to stage (script/audio/visuals/render) while running
- `r` retry current/failed stage
- `e` open selected artifact in `$EDITOR` (fallback: print path)
- `o` open artifacts folder (platform-specific; fallback: print path)
- `q` quit (with confirmation if pipeline running)
- `Ctrl+C` always exits cleanly (ensure artifacts are flushed)

### Output Discipline (Hard Requirements)

- **stdout is reserved for artifacts / JSON mode.** TUI renders to stderr (or owns the terminal), never polluting stdout.
- In non-TTY mode, output stays line-based and non-animated (existing behavior via `CliProgressObserver` and `createSpinner`).
- In JSON mode, no TUI and no spinners/logging to stdout.

## Data Contracts

### Inputs

- Existing inputs to `cm generate` and per-stage commands (topic string, JSON files, etc.).
- New "recent runs" index (optional):
  - Derived from artifact directories (no new schema required initially).

### Outputs

- No changes to existing artifacts:
  - `script.json`, `audio.wav`, `timestamps.json`, `visuals.json`, `video.mp4`, plus optional score/validate outputs.
- CLI JSON contract remains `CliJsonEnvelope` (`src/cli/output.ts`).

### Event Model

Leverage existing pipeline events:

- `pipeline:*`, `stage:*` from `src/core/events/types.ts`

Optional additions (future):

- `artifact:written` (path + kind)
- `log:line` (structured log line for UI panel)

## Architecture

### Key Modules

- `src/cli/index.ts`
  - Detect "no args" + TTY and route to TUI.
- `src/cli/tui/` (new)
  - Ink app, view routing, keybindings, theming.
- `src/core/events/`
  - Subscribe to `PipelineEventEmitter` and reuse `CostTrackerObserver`.
- `src/cli/commands/*`
  - Refactor toward a shared pipeline runner that can be observed by both:
    - Headless CLI progress (current)
    - TUI observer (new)

### Rendering Strategy

To avoid conflicting redraw systems:

- **TUI mode:** Ink owns terminal output; do not use `ora`/`listr2`/`log-update` concurrently.
- **Non-TUI mode:** keep `ora` and/or `CliProgressObserver` behavior for lightweight UX.

### Failure Modes / Recovery

- TUI should surface:
  - which stage failed
  - last successful artifact path
  - recommended recovery actions
- Avoid hiding stack traces: keep full errors behind a "details" toggle.

### Node module format and packaging constraints

`cm` currently ships a bundled CLI entrypoint at `dist/cli/index.cjs` (CJS) with dependencies marked as external (see `package.json` build script).
However, several modern CLI libraries (including `ora`, and likely `ink`) are ESM-only.

Hard requirement: TUI mode must not introduce a packaging/runtime split where `npm run cm` works but the installed `cm` binary fails.

Implementation options (choose one early and document via ADR):

1. **Move the CLI build output to ESM**
   - Produce `dist/cli/index.js` as ESM and point `bin.cm` to it.
2. **Keep CJS output but lazy-load ESM dependencies**
   - Replace static imports of ESM-only packages with dynamic `import()` at runtime (especially in TUI mode).
3. **Bundle dependencies (reduce externals)**
   - Let esbuild bundle ESM deps into the output. Validate size and licensing.

## Testing

### Unit

- Runtime routing:
  - `cm` with no args launches TUI only when TTY and not `--json` and not `--no-tui`.
- Keybinding / state machine:
  - transitions Home -> Wizard -> Run -> Summary/Error.
- Compatibility:
  - `--json` never renders TUI and never writes non-JSON output to stdout.

### Integration

- Ink view rendering tests using an Ink testing utility (to be chosen).
- Pipeline event subscription test: stage events update UI model without race conditions.

### V&V

- Layer 1: schemas unchanged; TUI reads validated artifacts only.
- Layer 2: programmatic checks in UI summary (duration, scene count, missing files).
- Layer 4: manual UX review checklist on Windows Terminal + macOS Terminal + CI non-TTY.

## Rollout

- Phase 1 (safe): add `cm ui` as opt-in; validate stability.
- Phase 2: make `cm` with no args default to TUI in TTY.
- Escape hatches: `--no-tui` and `CM_DISABLE_TUI=1` supported from day one.

## Related

- Guides:
  - `docs/guides/guide-cli-tui-mode-20260110.md`
  - `docs/guides/guide-cli-ux-standards-20260106.md`
- Features:
  - `docs/features/feature-cli-progress-events-20260106.md`
  - `docs/features/feature-cli-json-contract-20260106.md`
- Architecture:
  - `docs/architecture/ADR-004-DEFAULT-TUI-MODE-20260110.md`
- Tasks:
  - `tasks/todo/TASK-018-feature-cli-tui-default-mode-20260110.md`
