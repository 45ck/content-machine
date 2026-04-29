# Eval, CI, And Golden Dataset Deep Dive

Date: 2026-04-29

## Purpose

The research pack should not only describe what good shorts look like; it
should generate regression pressure. Content-machine already ships promptfoo
evals, rubrics, quality-score features, active-learning rankers, and test
fixtures. This report defines how archetype research becomes CI-ready golden
datasets and parity checks.

## Source Signals

| Source                                    | Signal                                                                                             | Content-machine takeaway                                                     |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `evals/README.md`                         | Four evaluation layers: schema, programmatic, LLM-as-judge, human review                           | Research parity should use all four layers where appropriate                 |
| `evals/configs/cm-script.yaml`            | Script evals check schema, word count, visual directions, hook duplication, voice, and filmability | Archetype fixtures can reuse these assertions with stricter expected outputs |
| `evals/rubrics/*`                         | Hook quality, TikTok voice, and visual relevance rubrics                                           | Rubrics should be linked to archetype-specific gates                         |
| `src/quality-score/feature-schema.ts`     | Feature vectors capture sync, caption, pacing, audio, engagement, temporal, freeze, and metadata   | Rendered outputs need machine feature snapshots                              |
| `src/evaluate/active-learning.ts`         | Ranks uncertain and diverse samples for human labeling                                             | CI can focus human review on borderline outputs                              |
| Existing archetype blueprints and recipes | Structured expectations by production lane                                                         | Golden datasets should bind input, expected artifacts, and failure examples  |

## Eval Model

Recommended lifecycle:

1. Create one golden dataset per archetype and platform profile.
2. Bind each fixture to blueprint, recipe, style profile, and expected
   artifacts.
3. Run schema and programmatic checks on every PR.
4. Run LLM-as-judge checks selectively or behind labels.
5. Capture human labels for borderline cases.
6. Promote repeated failures into archetype learning notes or quality gates.

## Artifact Stack

### `golden-archetype-dataset.v1.json`

Purpose: fixture set for one archetype or platform profile.

Fields:

- `dataset_id`
- `archetype`
- `platform`
- `blueprint_path`
- `recipe_path`
- `cases`
- `expected_artifacts`
- `rubrics`
- `failure_examples`

### `eval-run-plan.v1.json`

Purpose: decide what evals to run.

Fields:

- `changed_surfaces`
- `datasets`
- `configs`
- `programmatic_checks`
- `llm_judge_checks`
- `human_review_required`
- `budget_limit`

### `archetype-parity-report.v2.json`

Purpose: compare generated output to research expectations.

Fields:

- `run_id`
- `archetype`
- `fixture_id`
- `artifact_presence`
- `schema_results`
- `programmatic_results`
- `rubric_results`
- `feature_snapshot_path`
- `status`

### `golden-failure-case.v1.json`

Purpose: preserve known bad outputs.

Fields:

- `case_id`
- `archetype`
- `input`
- `bad_output_path`
- `failure_tags`
- `expected_gate`
- `regression_test_path`

### `ci-eval-summary.v1.json`

Purpose: PR or local check summary.

Fields:

- `run_id`
- `commit`
- `datasets_run`
- `pass_rate`
- `failed_cases`
- `skipped_cases`
- `cost`
- `status`

## Implementation Delta

The existing eval suite tests script and visual quality in isolation. The next
layer should generate archetype-bound fixtures from this research pack and
verify the full short-form chain: route, script, assets, captions, render,
review, platform profile, rights, and package.

## Quality Gates

- Every core archetype should have at least one passing golden fixture and one
  known failure case.
- CI should run cheap schema and programmatic checks by default.
- LLM-as-judge evals should be budgeted and opt-in when expensive.
- Parity reports should fail missing artifacts before subjective rubrics.
- Human labels should feed active-learning and quality-label artifacts.

## Bead Targets

This report supports:

- `content-machine-ar18`: archetype parity fixtures.
- `content-machine-ar26`: quality labels and learning notes.
- `content-machine-ar28`: schema-first backlog sequence.
- `content-machine-ar34`: golden datasets, eval run plans, parity reports,
  failure cases, and CI eval summaries.
