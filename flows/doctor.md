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

## Current Status

Executable. `doctor.flow` dispatches to the `doctor-report` harness
skill and writes a structured report under `runs/<run-id>/doctor/` by
default.
