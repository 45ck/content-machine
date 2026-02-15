# guide-cli-ux-vv-tdd-plan-20260106

Execution playbook for implementing the CLI UX roadmap using TDD + the project V&V framework.

## Scope

Applies to these commands:

- `cm generate`, `cm script`, `cm audio`, `cm visuals`, `cm render`
- `cm validate`, `cm package`, `cm research`, `cm init`

References:

- `docs/dev/guides/guide-cli-ux-standards-20260106.md`
- `docs/dev/features/feature-cli-ux-observability-20260106.md`
- `docs/dev/features/feature-cli-progress-events-20260106.md`
- `docs/dev/features/feature-cli-json-contract-20260106.md`
- `docs/dev/features/feature-llm-streaming-cli-20260106.md`

## Implementation order (risk-first)

1. **Shared contracts**: CLI runtime context, error formatting, exit codes (unblocks everything).
2. **Progress events**: structured stage/phase events + renderer.
3. **`--json` contract**: schema-versioned, one-object stdout.
4. **LLM streaming**: provider + CLI progress phases.
5. **Per-command polish**: preflight validation, next-step hints, artifact semantics.

## TDD Plan (per deliverable)

For each deliverable, follow:

1. RED: add failing tests (unit + integration) that assert the terminal contract
2. GREEN: minimal implementation to pass
3. REFACTOR: dedupe helpers and ensure consistency across commands

### Shared test harness

Create a single CLI test helper that:

- spawns `tsx src/cli/index.ts ...`
- captures stdout/stderr separately
- asserts exit codes
- supports TTY vs non-TTY simulation

## V&V Plan (per command)

For each command, validate 4 layers:

### Layer 1: Schema validation

- Input schemas: reject wrong JSON inputs with exit code 2.
- Output schemas: JSON mode outputs validate with Zod.

### Layer 2: Programmatic checks

- progress UI does not leak to stdout
- `--dry-run` causes no side effects (no files, no network)
- artifact paths printed and accurate
- `--keep-artifacts` semantics match documentation

### Layer 3: LLM-as-judge (where applicable)

Evaluate (script/package/research) messages:

- is the status update meaningful?
- do error messages include a fix?
- does it clearly state where outputs are written?

### Layer 4: Human review scripts

Run these "experience scripts" in a terminal:

- Happy path: `cm generate ...` and verify stage UI and outputs.
- Recovery: missing API key, wrong input file, invalid option.
- Automation: `cm ... --json` used in a script (stdout parse only).

## Command-specific implementation checklists

### `cm generate`

- Progress: stage/phase events (no substring parsing).
- Artifacts: print artifacts dir early; `--keep-artifacts` writes all intermediates.
- Next step: print `cm validate <output>`.

### `cm script` / `cm package` / `cm research`

- LLM phase events: connect/stream/validate/retry.
- Optional streaming in verbose mode (stderr only).
- Schema validation for inputs/outputs.

### `cm audio`

- Sub-step progress (tts/asr/align).
- Input schema validation.
- Clear dependency errors (models, executables).

### `cm visuals`

- Provider validation + missing key fix guidance.
- Verbose per-scene search insight.
- Add `--dry-run` parity.

### `cm render`

- Bundle/render percent progress (TTY).
- Preflight schema + file existence checks.
- `--dry-run` parity.

### `cm validate`

- Gate summary always printed in human mode.
- `--json` prints one report object; exit codes stable.
- Preflight dependencies (ffprobe/python/ffmpeg when relevant).

### `cm init`

- Safe overwrite behavior.
- OS-aware env var guidance.
- Validate config after writing.

## Definition of Done (UX)

- User can always answer: "what is happening now?", "where are outputs?", "what do I do next?"
- `--json` mode is stable, schema-versioned, and scriptable.
- Long steps show progress and never feel stuck.
- Failures include a one-line actionable fix and correct exit code.
