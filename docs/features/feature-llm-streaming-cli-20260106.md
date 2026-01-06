# feature-llm-streaming-cli-20260106

Add an LLM streaming mode (provider-level + CLI-level) so users can see that the model is responding, and advanced users can optionally view partial output during generation.

## User Story

As a user waiting on an LLM step (script generation, packaging, research angles), I want to see "model is working" progress (and optionally stream tokens), so the tool never feels frozen and I can decide to cancel.

## HCI Requirements

- Visibility of system status: show "Connecting", "Streaming", "Parsing/validating", "Retrying".
- User control: Ctrl+C cancels with exit 130 and leaves artifacts in a known state.
- Error prevention: partial streams are not treated as valid outputs until schema validation passes.
- Progressive disclosure: default is minimal; `--verbose` or `--stream` reveals more.

## UX Design

### Default (safe)

Show a progress phase without printing tokens:

- `LLM: connecting...`
- `LLM: streaming response... (12.3s)`
- `LLM: validating output...`

### Optional token streaming (advanced)

Add a flag (per command, or global) such as:

- `--stream` to show token flow (stderr only)
- `--stream=content` to show content chunks (stderr only, and never in `--json`)

## Technical Design

### Provider API changes

Extend the provider interface with a streaming method:

- `chatStream(messages, options) -> AsyncIterable<LLMChunk>`

Where `LLMChunk` includes:

- `type: 'text'|'tool'|'meta'`
- `deltaText?: string`
- `usage?: {inputTokens, outputTokens}`

### CLI integration

Convert stream chunks into progress events:

- phase `llm:connect`, `llm:stream`, `llm:finalize`, `llm:validate`
- counters: tokens received, elapsed time

### Safety

- Do not write final artifacts until:
  - the stream completes
  - the final content parses as JSON (when expected)
  - schema validation passes

## TDD Plan

### Unit tests

- stream aggregator:
  - concatenates deltas into final content
  - emits progress events with token counts
  - handles cancellation and retries
- CLI renderer:
  - token streaming goes to stderr only
  - `--json` mode disables streaming output entirely

### Integration tests

- Use a fake streaming LLM provider in tests:
  - emits multiple chunks then completes
  - emits malformed JSON then recovers on retry

## V&V

- Layer 1: schema validation for final LLM outputs
- Layer 2: ensure no partial content is written as final artifact
- Layer 3: judge whether the streaming UX reduces "is it stuck?" moments
- Layer 4: human test in a slow network environment

## Related

- `docs/features/feature-cli-progress-events-20260106.md`
- `docs/guides/guide-cli-ux-standards-20260106.md`
