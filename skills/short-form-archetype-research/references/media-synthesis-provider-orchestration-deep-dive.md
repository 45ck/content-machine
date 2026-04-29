# Media Synthesis Provider Orchestration Deep Dive

Date: 2026-04-29

## Purpose

Generated visuals are now a central part of faceless explainers, UGC avatar
shorts, motion lessons, and b-roll-driven formats. Content-machine has media
synthesis adapters for text-to-video, image-to-video, scene-to-video, static
video, Sora, Veo, Seedance, and local scene rendering. This report defines how
provider selection, job records, safety, and review should work.

## Source Signals

| Source                                | Signal                                                               | Content-machine takeaway                                               |
| ------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `src/media/synthesis/types.ts`        | Shared request, capability, result, adapter, and job record types    | Media generation should be capability-routed and artifact-recorded     |
| `src/media/synthesis/orchestrator.ts` | In-memory queued/running/succeeded/failed job lifecycle              | Job lifecycle should be persisted for production runs                  |
| `src/media/synthesis/adapters/*`      | Provider adapters for Sora, Veo, Seedance, scene, and static video   | Provider decisions should be explicit and reviewable                   |
| `src/media/service.ts`                | Media service layer above synthesis                                  | Generated media should integrate with the existing visuals pipeline    |
| Visual continuity research            | Style bibles, character sheets, storyboard grids, continuity reports | Generated clips need continuity constraints and review                 |
| Provider governance research          | Cost, fallback, and provider-selection artifacts                     | Media synthesis should share provider and cost governance with LLM/TTS |

## Orchestration Model

Recommended lifecycle:

1. Convert visual intent into a typed synthesis request.
2. Select provider by capability, cost, policy, quality, and continuity needs.
3. Persist job request before submission.
4. Track queued, running, succeeded, or failed state.
5. Write generated asset ledger entries and visual match review.
6. Invalidate downstream render and review artifacts when generated media
   changes.

## Artifact Stack

### `media-synthesis-request.v1.json`

Purpose: typed generation request before provider submission.

Fields:

- `kind`: text-to-video, image-to-video, scene-to-video
- `prompt`
- `input_image_path`
- `scene_spec_path`
- `duration_seconds`
- `width`
- `height`
- `output_path`
- `style_profile_id`
- `continuity_refs`
- `policy_constraints`

### `media-provider-selection.v1.json`

Purpose: select a synthesis provider.

Fields:

- `request_path`
- `candidate_adapters`
- `capability_match`
- `quality_expectation`
- `cost_estimate`
- `latency_expectation`
- `rights_policy`
- `selected_adapter`
- `fallback_adapter`
- `reason`

### `media-synthesis-job.v1.json`

Purpose: persisted job record.

Fields:

- `id`
- `adapter`
- `status`
- `created_at`
- `updated_at`
- `request`
- `result`
- `error`
- `retry_count`
- `cost_log_path`

### `generated-media-ledger.v1.json`

Purpose: provenance and reuse ledger for generated assets.

Fields:

- `asset_id`
- `job_id`
- `provider`
- `prompt_hash`
- `source_refs`
- `output_path`
- `rights_status`
- `reuse_allowed`
- `dependent_artifacts`

### `media-generation-review.v1.json`

Purpose: quality gate for generated media before render.

Fields:

- `asset_id`
- `request_path`
- `output_path`
- `visual_match_report_path`
- `continuity_report_path`
- `safe_zone_status`
- `defects`
- `status`

## Implementation Delta

The current orchestrator tracks jobs in memory and returns provider results.
Production needs those same records persisted as artifacts, joined to provider
selection and generated media ledgers, and consumed by visual review before
render.

## Quality Gates

- Provider selection must happen before generation when multiple adapters are
  available.
- Generated media cannot render without a ledger entry and match review.
- Continuity-dependent visuals must cite style bible, character sheet, or
  storyboard references.
- Failed media synthesis jobs must keep request and error artifacts.
- Fallback providers must not silently change duration, aspect, rights, or
  style constraints.

## Bead Targets

This report supports:

- `content-machine-ar16`: visual verification and asset ledger.
- `content-machine-ar17`: provider and cost governance.
- `content-machine-ar21`: visual continuity artifacts.
- `content-machine-ar32`: media synthesis request, provider selection, job,
  generated media ledger, and media generation review artifacts.
