# Flow, Skill, And Harness Contract Deep Dive

Date: 2026-04-29

## Purpose

Content-machine is intentionally skill and harness driven. The research pack
should therefore specify how short-form production work moves from agent request
to skill, flow manifest, harness execution, artifacts, and review. This report
defines the contract layer that keeps new work out of the legacy CLI.

## Source Signals

| Source                             | Signal                                                                 | Content-machine takeaway                                              |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `AGENTS.md`                        | Skills, flows, and `scripts/harness/*` are preferred surfaces          | New archetype work should route through skill and harness contracts   |
| `flows/generate-short.flow`        | Declares entry skill, inputs, default output dir, and expected outputs | Flow manifests should become stable production recipes                |
| `src/harness/json-stdio.ts`        | Standard success and failure envelopes with artifacts and warnings     | Harnesses already have a machine-readable return contract             |
| `src/harness/flow-runner.ts`       | Binds `.flow` manifests to registered handlers and run output dirs     | Flow execution can be audited through manifest, run id, and artifacts |
| `skills/*/SKILL.md`                | Agent-facing instructions, entrypoints, inputs, and outputs            | Skills should name the route and quality gates before execution       |
| `scripts/harness/skill-catalog.ts` | Enumerates repo-local skills from manifests                            | Agent discovery should rely on catalog output, not markdown scraping  |

## Contract Model

Recommended execution chain:

1. Skill routes the user request to an archetype and expected artifacts.
2. Flow manifest declares the execution stages and output shape.
3. Harness validates JSON input with Zod.
4. Runtime writes deterministic artifacts.
5. Harness returns artifact paths and warnings.
6. Review gates decide whether downstream stages may continue.

## Artifact Stack

### `skill-route.v1.json`

Purpose: record why a skill was selected.

Fields:

- `request_summary`
- `selected_skill`
- `selected_archetype`
- `blueprint_path`
- `reference_docs`
- `required_assets`
- `quality_gates`
- `fallback_skill`

### `flow-execution-plan.v1.json`

Purpose: expand a `.flow` manifest into a run plan.

Fields:

- `flow`
- `manifest_path`
- `entry_skill`
- `run_id`
- `output_dir`
- `inputs`
- `expected_outputs`
- `review_gates`

### `harness-envelope.v1.json`

Purpose: standardize persisted harness results.

Fields:

- `tool`
- `ok`
- `result`
- `artifacts`
- `warnings`
- `meta`
- `error`

### `stage-input-output-map.v1.json`

Purpose: map each stage's input artifacts to output artifacts.

Fields:

- `run_id`
- `stage`
- `input_paths`
- `output_paths`
- `schema_versions`
- `handler`
- `warnings`

### `agent-handoff.v1.json`

Purpose: tell the next agent or skill exactly what to continue.

Fields:

- `run_id`
- `current_stage`
- `completed_artifacts`
- `pending_gates`
- `next_skill`
- `next_harness`
- `do_not_repeat`
- `known_blockers`

## Implementation Delta

The existing harness output is good, but it is transient unless captured by a
run ledger. Adding route, flow plan, harness envelope, and handoff artifacts
would make agent-driven production resumable and auditable without expanding
the legacy `cm` control surface.

## Quality Gates

- Every generated short should have a skill route or explicit bypass reason.
- Flow execution must record the manifest path and run id.
- Harness failures should be stored with error code, message, and validated
  input shape, not only terminal output.
- Agent handoff must name preserved artifacts and invalidated artifacts.
- New skills should add examples and catalog metadata before being used in
  batch flows.

## Bead Targets

This report supports:

- `content-machine-ar13`: workflow ledgers and approval architecture.
- `content-machine-ar23`: batch runs over existing flows.
- `content-machine-ar28`: schema-first backlog sequencing.
- `content-machine-ar30`: skill route, flow plan, harness envelope, stage map,
  and agent handoff artifacts.
