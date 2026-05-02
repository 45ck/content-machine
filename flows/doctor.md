# Doctor Flow

## Purpose

Run the structured environment and dependency diagnostics path for local
or CI setup checks.

## Inputs

- `strict` (optional)
- `outputPath` (optional)

## Skills Called

1. `doctor-report`

## Completion Gates

- `report.json` exists
- top-level `ok` is present in the report

## Failure And Retry Notes

- A failing check is useful output, not a flow failure by itself.
- Use `strict: true` only when CI or release work should fail on
  warnings.
- Rerun after installing dependencies or adding API keys; do not
  generate real videos until required checks are understood.

## Current Status

Executable. `doctor.flow` dispatches to the `doctor-report` runtime
skill. When `run-flow` receives a `runId`, it binds the flow output
directory and `doctor-report` writes
`runs/<run-id>/doctor/report.json` by default.
