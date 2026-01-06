# feature-cli-json-contract-20260106

Implement consistent `--json` output across all commands so the CLI is reliably scriptable (CI, pipelines, tooling).

## User Story

As an engineer automating `cm`, I want stable JSON outputs and exit codes, so I can integrate content generation into pipelines without parsing human text.

## HCI Requirements (for automation)

- Consistency: same flag means same behavior everywhere.
- Predictability: one JSON object, versioned schema.
- Minimal surprise: no spinners/ANSI in JSON mode; no mixed stdout/stderr semantics.

## JSON Contract (per command)

### Common envelope

All commands output:

- `schemaVersion`
- `command`
- `args` (normalized)
- `outputs` (paths + ids)
- `timingsMs`
- `warnings[]`
- `errors[]` (when non-zero exit)

### Command-specific `outputs`

- `script`: `{scriptPath}`
- `audio`: `{audioPath, timestampsPath}`
- `visuals`: `{visualsPath}`
- `render`: `{videoPath, width, height, durationSeconds, fileSizeBytes}`
- `generate`: union of the above (and costs, if available)
- `validate`: `{reportPath, passed, failingGates[]}`
- `package`: `{packagingPath, selectedTitle}`
- `research`: `{researchPath, sources[], totalResults}`
- `init`: `{configPath}`

## TDD Plan

### Unit tests

- JSON output schema Zod parse for each command result shape.
- `--json` mode:
  - exactly one JSON object to stdout
  - zero non-JSON bytes to stdout
  - progress UI only to stderr (or disabled)

### Integration tests

- Spawn CLI and assert stdout is parseable JSON and matches schema.
- For invalid args, assert stdout is JSON error object and exit code is 2.

## V&V

- Layer 1: Zod schema validation on every JSON output in tests.
- Layer 2: stdout purity check (no extra lines).
- Layer 3: "developer usability" review: can a script consume outputs with no parsing hacks?
- Layer 4: human review: compare `--json` results with equivalent file outputs.

## Rollout

- Phase 1: implement envelope + basic outputs for `script/audio/visuals/render/validate`.
- Phase 2: implement `generate` union output and costs.
- Phase 3: implement `init/package/research`.

## Related

- `docs/features/feature-cli-progress-events-20260106.md`
- `docs/guides/guide-cli-ux-standards-20260106.md`
