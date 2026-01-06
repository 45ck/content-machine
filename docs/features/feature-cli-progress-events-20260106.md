# feature-cli-progress-events-20260106

Add structured progress events to the pipeline and commands, and render them consistently in the terminal. This removes brittle string parsing and enables honest progress (including LLM streaming).

## User Story

As a user running long commands (rendering, audio generation, research), I want to see real progress and what step is running, so I can trust the tool and decide whether to wait or cancel.

## HCI Requirements

- Visibility of system status: show stage + phase + percent where possible.
- Match between system and world: use user language ("Bundling", "Rendering", "Searching reddit").
- User control: cancellation is acknowledged and exits with 130.
- Consistency: the same progress event renders similarly across commands.

## Progress Model

Define a small event schema:

- `commandId`: stable id for the run
- `stage`: `script|audio|visuals|render|validate|research|package|init`
- `phase`: free-form but consistent labels per stage (e.g., `tts`, `asr`, `bundle`, `render`)
- `message`: short human text
- `percent`: optional `0..100`
- `artifacts`: optional list of `{kind, path}`
- `timingMs`: optional

## Terminal Rendering Rules

- TTY + not `--json`: use spinners and percent bars; update in-place.
- Non-TTY or `--json`: print discrete lines with timestamps and no ANSI/spinner.
- `--verbose`: include sub-phase events, counters (files, tokens), and timing.

## Command-specific phase maps

### `cm generate`

- stages: `script`, `audio`, `visuals`, `render`
- each stage emits `start`, `progress`, `artifact`, `complete`

### `cm render`

- phases: `bundle`, `select-composition`, `render-media`
- `bundle` and `render-media` should provide percent when available

### `cm audio`

- phases: `tts`, `asr`, `align`
- show percent if engines provide it; otherwise show sub-step transitions + durations

### `cm research`

- phases: `validate-sources`, `search:<source>`, `merge`, `angles`
- per-source progress includes result counts and latency

## TDD Plan

### Unit tests

- Progress event schema validation (Zod)
- Renderer:
  - TTY -> uses in-place updates (mocked)
  - non-TTY -> prints line per event
  - `--json` -> never writes progress UI to stdout

### Integration tests

- `cm generate --dry-run` emits a coherent stage list and exits 0.
- `cm render` in mock mode emits `bundle`/`render` phases.

## V&V

- Layer 1: progress event schema safeParse in dev
- Layer 2: "no substring parsing" check (ban `includes('generated')` style transitions)
- Layer 3: evaluate whether progress messages answer: what/where/next
- Layer 4: human test: run a long render and confirm there is never a "stuck" feeling without explanation

## Deliverables

- shared progress event schema
- shared reporter + renderer
- pipeline emits events structurally
- docs updated to include phase maps

## Related

- `docs/features/feature-cli-ux-observability-20260106.md`
