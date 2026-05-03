# Flows

This directory holds coding-agent flow specs and executable
`.flow` manifests that orchestrate skills.

Role split:

- `skills/` = intent guide
- `flows/` = `45ck/prompt-language` orchestration guide
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
machine-readable manifests intended for `45ck/prompt-language` execution
and should stay minimal.

## For Claude Code and Codex CLI

A flow doc should tell the agent:

1. What problem the flow solves.
2. Which inputs are required and where they come from.
3. Which skills or sub-flows it calls.
4. Which files and completion gates mark success.

If an agent cannot infer retry points, side effects, and failure
outputs from the doc, the flow is under-specified.

## Authoring rules

- Keep the canonical human-readable guide in markdown next to the
  executable flow.
- Use the vocabulary from
  [`docs/direction/05-flow-catalog.md`](../docs/direction/05-flow-catalog.md).
- Avoid embedding literal `45ck/prompt-language` DSL in prose docs. Use plain
  English or pseudocode so authoring tools do not misread the file as a
  live program.
- Name flow files in kebab-case and keep flow purpose action-oriented.
- Document output paths under `runs/<run-id>/` when the flow produces
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
- [`longform-to-shorts.md`](longform-to-shorts.md) — longform source
  to candidate clips, boundary cleanup, approval, and render handoff
- [`reverse-engineer-winner.md`](reverse-engineer-winner.md) — reference
  short analysis path
- [`showcase-content-machine.md`](showcase-content-machine.md) — repo
  self-demo path for an OSS/social showcase clip

## Current Executable Flows

| Flow                                                             | Operator Notes                                               | Entry Skill               | Runner Tool               | Outputs                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------- | ------------------------- | --------------------------------------- |
| [`doctor.flow`](doctor.flow)                                     | [`doctor.md`](doctor.md)                                     | `doctor-report`           | `flow-catalog`/`run-flow` | environment report artifacts            |
| [`generate-short.flow`](generate-short.flow)                     | [`generate-short.md`](generate-short.md)                     | `generate-short`          | `run-flow`                | `runs/<run-id>/` short artifacts        |
| [`longform-to-shorts.flow`](longform-to-shorts.flow)             | [`longform-to-shorts.md`](longform-to-shorts.md)             | `longform-to-shorts`      | `run-flow`                | candidate, approval, and handoff bundle |
| [`reverse-engineer-winner.flow`](reverse-engineer-winner.flow)   | [`reverse-engineer-winner.md`](reverse-engineer-winner.md)   | `reverse-engineer-winner` | `run-flow`                | reference breakdown artifacts           |
| [`showcase-content-machine.flow`](showcase-content-machine.flow) | [`showcase-content-machine.md`](showcase-content-machine.md) | `generate-short`          | `run-flow`                | self-demo run artifacts                 |

## Longform Handoff Boundary

The executable longform flow intentionally stops at a reviewed render
handoff:

```text
source-media-analyze
  -> longform-highlight-select
  -> boundary-snap
  -> highlight-approval
  -> render-handoff.v1.json
  -> longform-clip-extract
```

After approval, use `longform-clip-extract` to cut the source clip and
write clip-local `audioPath`, `timestampsPath`, and `visualsPath`
artifacts. The agent may still need to reframe the extracted clip before
calling `video-render`, so do not jump from approved highlight JSON
directly to final MP4 generation.

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
