---
name: doctor-report
description: Run the repo’s environment and dependency diagnostics as a JSON-stdio skill so Claude Code or Codex can capture a structured health report instead of scraping CLI stderr.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"strict":false,"outputPath":"output/harness/doctor/doctor.json"}'
entrypoint: npx tsx scripts/harness/doctor-report.ts
inputs:
  - name: strict
    description: Fail warnings as well as hard errors.
    required: false
  - name: outputPath
    description: Path for the structured doctor report artifact.
    required: false
outputs:
  - name: doctor.json
    description: Structured doctor report containing the check list and top-level ok status.
---

# Doctor Report

## Use When

- Claude Code or Codex needs a structured environment health report
  before attempting generation work.
- A harness wants JSON diagnostics instead of parsing the legacy
  `cm doctor` human output.
- CI or local automation needs a stable `ok` plus check-count summary.

## Invocation

```bash
cat <<'JSON' | npx tsx scripts/harness/doctor-report.ts
{
  "strict": false,
  "outputPath": "output/harness/doctor/doctor.json"
}
JSON
```

## Artifact Contract

- Runs the same core doctor checks used by the legacy CLI.
- Writes one JSON report artifact to `outputPath`.
- Returns a JSON envelope with `ok`, strict mode, and warning/failure
  counts.

## Validation Checklist

- `outputPath` exists.
- The report contains a top-level `ok` boolean and a `checks` array.
- Failure and warning counts in the envelope match the artifact.
