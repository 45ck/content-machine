# guide-cli-progress-events-20260107

This guide defines structured progress events for `cm` and how they are rendered in the terminal.

## Why this matters (HCI)

- Long tasks must never feel stuck.
- Users should always know: what is happening now, what is next, and where outputs go.

## Canonical implementation (today)

Progress events are implemented via the Observer pattern:

- Event types live in `src/core/events/types.ts`.
- The event bus is `src/core/events/emitter.ts` (`PipelineEventEmitter`).
- `runPipeline()` emits lifecycle events via `eventEmitter` in `src/core/pipeline.ts`.

### Event types

- Pipeline lifecycle:
  - `pipeline:started`
  - `pipeline:completed`
  - `pipeline:failed`
- Stage lifecycle:
  - `stage:started`
  - `stage:progress` (includes `progress: 0..1`, optional `phase`, optional `message`)
  - `stage:completed`
  - `stage:failed`

### Mapping to the UX schema

- `status` is encoded in `event.type` (e.g., `stage:started` == `start`)
- `percent = Math.round(progress * 100)`
- `phase` is optional but should be stable when present (`bundle`, `render-media`, `provider:search`)

## Rendering rules

- TTY + human mode:
  - spinners or progress bars are allowed
  - percent should update in-place when available
  - stage transitions should be explicit
- Non-TTY or `--json` mode:
  - no spinners
  - print coarse lines to stderr (throttle by percent buckets / phase changes), or remain silent in `--json`

## Recommended phase maps

### Script / Package / Research angles (LLM)

- `llm:connect`
- `llm:stream`
- `llm:finalize`
- `llm:validate`
- `llm:retry` (with backoff seconds)

### Audio

- `tts`
- `asr`
- `align`

### Visuals

- `provider:search`
- `provider:select`
- `provider:download` (optional)

### Render

- `bundle`
- `select-composition`
- `render-media`

### Validate

- `probe`
- `gate:<id>` per gate

## TDD checklist

- RED: add tests for event emission / callbacks.
- GREEN: implement emission via `PipelineEventEmitter` + propagate phase/percent.
- REFACTOR: keep phase labels stable; throttle non-TTY output.

## Related

- `docs/dev/features/feature-cli-progress-events-20260106.md`
