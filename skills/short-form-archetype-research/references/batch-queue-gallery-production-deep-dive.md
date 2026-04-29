# Batch, Queue, And Gallery Production Deep Dive

Date: 2026-04-29

## Purpose

Single-shot generation is not enough for a content machine. The repo research
shows that high-throughput short-form systems need batch requests, queued jobs,
approval checkpoints, sample galleries, and resumable output manifests. This
report turns those operational patterns into content-machine artifacts.

## Source Signals

| Source                                    | Signal                                                            | Content-machine takeaway                                                                    |
| ----------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Current `flows/generate-short.flow`       | Topic-to-video stages already run as a named flow                 | Batch production should call existing flows instead of adding more CLI control logic        |
| Current `scripts/harness/*`               | Harnesses expose JSON-stdio stages and progress-friendly surfaces | Queue workers should invoke harnesses and write stage artifacts, not scrape terminal output |
| `zhouxiaoka-autoclip` research            | Task queue, clip collections, progress events, web review surface | Longform and topic runs should share a queue event model and gallery entry model            |
| `mutonby__openshorts`                     | Gallery, publish metadata, S3-style artifact paths, hook overlays | Batch outputs need durable gallery records with preview, package, and provenance links      |
| `SamurAIGPT__AI-Youtube-Shorts-Generator` | Batch-oriented topic generation and auto-approval options         | Auto-approval should be explicit policy, never implicit default behavior                    |
| `generated-asset-versioning` research     | Retry/cache and generated asset versions                          | Batch reruns need invalidation and reuse rules per artifact, not full project deletion      |

## Production Model

Batch production should be a thin orchestration layer over existing skills and
flows. The queue decides what runs next; the skill or harness decides how a
stage behaves; the ledger records what happened.

Recommended lifecycle:

1. Create a batch run from topics, source media, or approved clip candidates.
2. Expand it into jobs with route, archetype, platform, locale, and style
   profile fields.
3. Emit queue events for claimed, started, completed, failed, skipped, and
   approval-needed states.
4. Write a gallery entry for every reviewable render or sample.
5. Close the batch with output manifest, failures, costs, and next actions.

## Artifact Stack

### `batch-run.v1.json`

Purpose: top-level request and policy for a multi-short run.

Fields:

- `batch_id`
- `created_at`
- `source_kind`: topics, longform, media_folder, reference_set
- `items`
- `default_archetype`
- `default_platforms`
- `default_locale`
- `style_profile_id`
- `approval_policy`
- `budget_policy`
- `output_root`

### `job-queue-event.v1.jsonl`

Purpose: append-only operational trace for every queued job.

Fields:

- `event_id`
- `batch_id`
- `job_id`
- `timestamp`
- `event_type`
- `stage`
- `artifact_paths`
- `worker`
- `status`
- `error`
- `next_action`

### `sample-approval.v1.json`

Purpose: capture the manual or automated decision for generated samples.

Fields:

- `job_id`
- `sample_path`
- `review_bundle_path`
- `decision`: approve, revise, reject
- `approved_by`
- `criteria`
- `notes`
- `rerun_stage`

### `gallery-entry.v1.json`

Purpose: durable review card for a generated short or clip candidate.

Fields:

- `entry_id`
- `batch_id`
- `job_id`
- `video_path`
- `thumbnail_path`
- `preview_gif_path`
- `title`
- `archetype`
- `platform`
- `locale`
- `style_profile_id`
- `review_status`
- `publish_package_path`
- `asset_ledger_path`
- `rights_status`

### `batch-output-manifest.v1.json`

Purpose: closeout inventory for the batch.

Fields:

- `batch_id`
- `completed_at`
- `jobs_total`
- `jobs_passed`
- `jobs_failed`
- `gallery_entries`
- `publish_packages`
- `cost_log_path`
- `queue_event_log_path`
- `blockers`
- `recommended_next_batch`

### `batch-policy.v1.json`

Purpose: make high-throughput behavior explicit.

Fields:

- `max_parallel_jobs`
- `auto_approve_samples`
- `require_manual_review_before_publish`
- `retry_limit`
- `reuse_cached_assets`
- `allowed_providers`
- `blocked_asset_sources`
- `upload_allowed`

## Implementation Delta

Current flows and harnesses can produce individual shorts. The missing piece is
an artifact-first queue that repeatedly calls those existing surfaces and
records progress. This should live beside `scripts/harness/run-flow.ts` or a
new harness wrapper, not inside the legacy `cm` shell.

## Quality Gates

- A batch run cannot publish anything unless every selected job has a passing
  review bundle and rights status.
- Auto-approval must be declared in `batch-policy.v1.json`.
- Gallery entries must link back to review, package, platform, and asset
  artifacts.
- Failed jobs must keep enough artifacts to reproduce or resume the failure.
- Queue logs must not contain hidden credentials or raw provider secrets.

## Bead Targets

This report supports:

- `content-machine-ar13`: workflow ledger and approval architecture.
- `content-machine-ar17`: final review bundle.
- `content-machine-ar22`: publish package and distribution handoff.
- `content-machine-ar23`: batch run, queue event, approval, gallery, and
  output manifest artifacts.
