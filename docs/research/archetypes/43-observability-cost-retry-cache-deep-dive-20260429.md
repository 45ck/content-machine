# Observability, Cost, Retry, And Cache Deep Dive

Date: 2026-04-29

## Purpose

High-throughput short-form production needs reliable provider calls, visible
progress, cost accounting, retry behavior, and cache decisions. Content-machine
already has pipeline events, cost observers, LLM logging, retry, and cache
decorators. This report promotes those runtime behaviors into artifacts.

## Source Signals

| Source                                      | Signal                                                               | Content-machine takeaway                                   |
| ------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/core/events/types.ts`                  | Pipeline, stage, progress, completion, failure, and cost event types | Events should be persisted as run telemetry                |
| `src/core/events/observers/cost-tracker.ts` | Tracks stage costs, tokens, and durations                            | Cost summaries should become review and budget artifacts   |
| `src/core/providers/decorators.ts`          | Logging, caching, and retry decorators for LLM providers             | Provider behavior needs recorded cache and retry decisions |
| `src/core/retry.ts`                         | Shared retry utilities                                               | Retry policy should be declared per provider family        |
| `src/core/pipeline.ts`                      | Emits progress across script, audio, visuals, and render stages      | Progress and failure records should be stage-aware         |
| Batch queue research                        | Multi-job runs need queue event logs and closeout manifests          | Batch telemetry should aggregate per-run events and costs  |

## Observability Model

Recommended lifecycle:

1. Start a run telemetry log with run id, topic, archetype, and pipeline mode.
2. Emit stage started, progress, completed, and failed events.
3. Record provider calls with cache, retry, token, latency, and cost metadata.
4. Aggregate cost and duration after each stage.
5. Link telemetry summaries into review bundles and batch closeout manifests.

## Artifact Stack

### `run-telemetry.v1.jsonl`

Purpose: append-only pipeline event log.

Fields:

- `type`
- `timestamp`
- `pipeline_id`
- `stage`
- `stage_index`
- `total_stages`
- `phase`
- `progress`
- `message`
- `duration_ms`
- `error`

### `provider-call-log.v1.jsonl`

Purpose: record external or local provider operations.

Fields:

- `call_id`
- `run_id`
- `stage`
- `provider_family`
- `provider`
- `model`
- `operation`
- `started_at`
- `duration_ms`
- `input_units`
- `output_units`
- `estimated_cost`
- `status`

### `retry-policy.v1.json`

Purpose: declare retry behavior before provider operations.

Fields:

- `provider_family`
- `max_attempts`
- `initial_delay_ms`
- `max_delay_ms`
- `jitter`
- `retryable_errors`
- `non_retryable_errors`

### `cache-decision.v1.json`

Purpose: explain whether cached output was used or bypassed.

Fields:

- `stage`
- `provider`
- `cache_key_hash`
- `hit`
- `bypass`
- `ttl_ms`
- `reason`
- `source_artifact`

### `budget-summary.v1.json`

Purpose: summarize cost and duration for review.

Fields:

- `run_id`
- `stage_costs`
- `stage_durations`
- `total_cost`
- `total_tokens`
- `budget_limit`
- `budget_status`
- `warnings`

## Implementation Delta

The runtime already emits events and computes cost summaries in memory. The
missing production layer is durable telemetry and provider-call artifacts that
publish review, batch closeout, and learning loops can consume.

## Quality Gates

- Provider calls that spend money must appear in cost or provider call logs.
- Retries must not hide repeated failures from review.
- Cache hits must record source artifact or cache key hash.
- Budget status should be visible before publish package approval.
- Batch closeout must aggregate per-job cost and failure states.

## Bead Targets

This report supports:

- `content-machine-ar13`: workflow ledgers.
- `content-machine-ar17`: provider selection and cost logs.
- `content-machine-ar23`: batch output manifests.
- `content-machine-ar33`: telemetry, provider call log, retry policy, cache
  decision, and budget summary artifacts.
