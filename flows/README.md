# Flows

This directory holds coding-agent flow specs and executable
`.flow` manifests that orchestrate skills.

Role split:

- `skills/` = intent contract
- `flows/` = orchestration contract
- `scripts/harness/` = executable JSON-stdio surface

## Purpose

- Give Claude Code, Codex CLI, and similar tools a stable place to
  look for orchestration docs.
- Keep flow intent separate from implementation details in `src/cli/`.
- Mirror the direction docs that move orchestration toward `45ck/prompt-language`
  flows over runtime-backed skills.

## Expected layout

```text
flows/
  README.md
  _template/
    FLOW.md
  <flow-name>.flow      # executable manifest
  <flow-name>.md        # optional operator notes
```

Markdown in this directory is operator documentation. `.flow` files are
machine-readable manifests and should stay minimal.

## For Claude Code and Codex CLI

A flow doc should tell the agent:

1. What problem the flow solves.
2. Which inputs are required and where they come from.
3. Which skills or sub-flows it calls.
4. Which artifacts and completion gates mark success.

If an agent cannot infer retry points, side effects, and failure
outputs from the doc, the flow is under-specified.

## Authoring rules

- Keep the canonical human-readable contract in markdown next to the
  executable flow.
- Use the vocabulary from
  [`docs/direction/05-flow-catalog.md`](../docs/direction/05-flow-catalog.md).
- Avoid embedding literal `45ck/prompt-language` DSL in prose docs. Use plain
  English or pseudocode so authoring tools do not misread the file as a
  live program.
- Name flow files in kebab-case and keep flow purpose action-oriented.
- Document artifact paths under `runs/<run-id>/` when the flow produces
  run-scoped outputs.

## Suggested contents

Use [`_template/FLOW.md`](_template/FLOW.md) as the starting point.

- Purpose
- Inputs
- Outputs
- Skills or sub-flows called
- Control flow
- Completion gates
- Failure modes
- Parallelism and retry policy

## Current Flow Docs

- [`doctor.md`](doctor.md) — structured diagnostics path
- [`generate-short.md`](generate-short.md) — default full-video
  topic-to-video path
- [`reverse-engineer-winner.md`](reverse-engineer-winner.md) — reference
  short analysis path

## Current Executable Flows

- [`doctor.flow`](doctor.flow) — run the structured diagnostics path
- [`generate-short.flow`](generate-short.flow) — run the end-to-end
  skills-first topic-to-video path
- [`reverse-engineer-winner.flow`](reverse-engineer-winner.flow) — run
  the reference-video ingest path

Use the runtime helpers to enumerate or execute them:

```bash
node --import tsx scripts/harness/flow-catalog.ts
node --import tsx scripts/harness/run-flow.ts
```

## Related docs

- [DIRECTION.md](../DIRECTION.md)
- [docs/direction/05-flow-catalog.md](../docs/direction/05-flow-catalog.md)
- [docs/direction/01-boundaries.md](../docs/direction/01-boundaries.md)
- [scripts/harness/README.md](../scripts/harness/README.md)
