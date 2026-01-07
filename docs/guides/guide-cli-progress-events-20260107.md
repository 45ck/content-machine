# guide-cli-progress-events-20260107

This guide defines structured progress events for `cm` and how they are rendered in the terminal.

## Why this matters (HCI)

- Long tasks must never feel stuck.
- Users should always know: what is happening now, what is next, and where outputs go.

## Progress event schema (pipeline + commands)

Each event should include:

- `stage`: `script|audio|visuals|render|validate|research|package|init`
- `phase`: a stable sub-step label (e.g., `llm:stream`, `bundle`, `render-media`)
- `status`: `start|progress|complete|warning|error`
- `message`: human short text
- `percent`: optional number 0..100
- `artifacts`: optional `{kind,path}` list

## Rendering rules

- TTY + human mode:
  - spinners or progress bars are allowed
  - percent should update in-place when available
  - stage transitions should be explicit
- Non-TTY or `--json` mode:
  - no spinners
  - print one line per event to stderr (or remain silent in `--json`)

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

- RED: failing tests that assert no substring parsing is used for stage transitions.
- GREEN: pipeline emits structured stage events.
- REFACTOR: unify event naming across commands and docs.

## Related

- `docs/features/feature-cli-progress-events-20260106.md`
