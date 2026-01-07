# guide-cli-json-envelope-20260107

This guide defines the `cm --json` behavior and how to implement it consistently across commands.

## Contract

When `--json` is set:

- stdout prints exactly one JSON object
- stdout contains no other text
- stderr contains no spinners (may contain warnings, but prefer silence)
- exit codes remain meaningful (0/1/2/130)

## Envelope shape (v1)

Required:

- `schemaVersion` (number)
- `command` (string)
- `args` (object)
- `outputs` (object)
- `timingsMs` (number)
- `warnings` (string[])
- `errors` (array)

Errors:

- `errors[0].code` and `errors[0].message` are required when failing
- `errors[0].context.fix` is strongly recommended

## Command-specific outputs (recommended)

- `script`: `{ scriptPath, scenes, wordCount }`
- `audio`: `{ audioPath, timestampsPath, durationSeconds, wordCount }`
- `visuals`: `{ visualsPath, scenes, fromStock, fallbacks }`
- `render`: `{ videoPath, width, height, durationSeconds, fileSizeBytes }`
- `generate`: `{ videoPath, durationSeconds, width, height, fileSizeBytes, artifactsDir }`
- `validate`: `{ reportPath, passed, failingGates }`
- `package`: `{ packagingPath, variants, selectedTitle }`
- `research`: `{ researchPath, sources, totalResults, angles }`
- `init`: `{ configPath }`

## TDD checklist

For each command:

- RED: add an integration test that asserts:
  - exit code is correct
  - `JSON.parse(stdout)` succeeds
  - stdout has only JSON (no prefix/suffix)
- GREEN: implement `--json` to use the shared envelope helper
- REFACTOR: align field names and output paths

## V&V checklist

- Layer 1: schema validation in unit tests (Zod)
- Layer 2: stdout purity check in integration tests
- Layer 4: human sanity check in an interactive terminal

## Related

- `docs/features/feature-cli-json-contract-20260106.md`
- `docs/guides/guide-cli-stdout-stderr-contract-20260107.md`
