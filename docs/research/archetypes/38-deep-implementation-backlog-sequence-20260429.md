# Deep Implementation Backlog Sequence

Date: 2026-04-29

## Purpose

The research pack now spans archetypes, assets, caption rendering, schemas,
workflow ledgers, clip selection, visual review, creative packaging,
localization, batch operations, feedback, and compliance. This report organizes
the implementation order so the work can become runtime capability without
turning into unrelated CLI expansion.

## Sequence Principles

- Skills and flows stay the agent-facing surface.
- Harness scripts expose JSON-stdio execution where a skill needs runtime
  support.
- Runtime modules own typed schemas, validation, and deterministic behavior.
- Publish review is the convergence point for quality, rights, platform, and
  upload boundary gates.
- Beads should track implementation slices by artifact family, not by vague
  research theme.

## Phase A: Artifact Schemas And Fixtures

Implement the schema layer first so later harnesses share the same contract.

Priority artifacts:

- `prompt-contract.v1.json`
- `caption-render-plan.v1.json`
- `asset-ledger.v1.json`
- `crop-plan.v1.json`
- `review-bundle.v1.json`
- `publish-package.v2.json`
- `batch-run.v1.json`
- `locale-plan.v1.json`
- `style-profile.v2.json`
- `rights-gate.v1.json`

Beads:

- `content-machine-ar10` through `content-machine-ar12`
- `content-machine-ar16` through `content-machine-ar18`
- `content-machine-ar23` through `content-machine-ar27`

## Phase B: Harness Adapters

Add or extend harnesses only after schemas exist.

Recommended surfaces:

- `scripts/harness/run-flow.ts` for stage execution inside batches.
- `scripts/harness/generate-short.ts` for topic-to-video jobs.
- `scripts/harness/source-media-analyze.ts` for reviewed source media.
- `scripts/harness/video-render.ts` for template contract and preset reports.
- `scripts/harness/publish-prep.ts` for review, rights, publish, and upload
  boundary gates.
- A new batch wrapper only if it stays thin and emits queue event artifacts.

## Phase C: Review Gates

Make publish review artifact-aware before adding more automation.

Required read paths:

- render report
- caption export report
- source media review
- visual match report
- crop plan
- asset ledger
- audio review
- review bundle
- publish package
- rights gate
- upload boundary review

This order prevents high-throughput generation from multiplying low-quality or
uncleared outputs.

## Phase D: Batch, Localization, And Style Integration

Once review is reliable, connect the operational layer.

Implementation order:

1. Batch run and queue events.
2. Gallery entries and sample approvals.
3. Style profile resolution and template contracts.
4. Localization plan, translation map, and localized captions.
5. Localized publish package and review.
6. Batch closeout manifest.

## Phase E: Feedback And Learning

Add learning only after generated outputs have stable IDs and artifact links.

Implementation order:

1. Performance snapshot import.
2. Creator feedback linked to run and variant IDs.
3. Variant outcome comparison.
4. Quality labels for active learning.
5. Archetype learning notes.
6. Optional style profile update proposal.

## Phase F: Upload Integrations

Keep upload integration last.

Required prerequisites:

- passing review bundle
- passing rights gate
- explicit upload boundary review
- credential requirement artifact
- manual approval policy
- dated platform profile
- separate provider implementation review

## Research-To-Bead Map

| Research area                  | Primary Beads                                                          |
| ------------------------------ | ---------------------------------------------------------------------- |
| Caption timing and export      | `content-machine-ar10`                                                 |
| Prompt and schema contracts    | `content-machine-ar11`                                                 |
| Render runtime decisions       | `content-machine-ar12`                                                 |
| Workflow ledger and rollback   | `content-machine-ar13`                                                 |
| Clip selection and crop tracks | `content-machine-ar14`, `content-machine-ar15`                         |
| Source review and visual match | `content-machine-ar16`                                                 |
| Final review and eval fixtures | `content-machine-ar17`, `content-machine-ar18`                         |
| Hook, audio, and continuity    | `content-machine-ar19`, `content-machine-ar20`, `content-machine-ar21` |
| Publish handoff                | `content-machine-ar22`                                                 |
| Batch and gallery operations   | `content-machine-ar23`                                                 |
| Localization and dubbing       | `content-machine-ar24`                                                 |
| Style and template contracts   | `content-machine-ar25`                                                 |
| Feedback and analytics         | `content-machine-ar26`                                                 |
| Risk and upload boundaries     | `content-machine-ar27`                                                 |
| Integrated backlog sequencing  | `content-machine-ar28`                                                 |

## Immediate Next Implementation Slice

The highest-leverage next slice is schema-first:

1. Add domain schemas and fixtures for `batch-run.v1.json`,
   `locale-plan.v1.json`, `style-profile.v2.json`, `rights-gate.v1.json`,
   and `review-bundle.v1.json`.
2. Add one fixture per artifact under the research pack or test fixtures.
3. Extend `publish-prep` to read rights and upload boundary artifacts.
4. Add an archetype parity fixture that fails when a required artifact is
   missing.

## Quality Gates

- New harness work must write artifacts before adding UI or upload behavior.
- Batch execution cannot skip review bundle and rights gate validation.
- Localization cannot pass with source-language captions attached to dubbed
  audio.
- Style profiles cannot override template or platform constraints silently.
- Upload integration remains blocked until compliance artifacts exist.

## Bead Targets

This report supports:

- `content-machine-ar23`: batch and gallery operations.
- `content-machine-ar24`: localization and dubbing.
- `content-machine-ar25`: style and template profile contracts.
- `content-machine-ar26`: feedback and analytics loop.
- `content-machine-ar27`: risk and upload boundary gates.
- `content-machine-ar28`: integrated backlog sequence and dependency order.
