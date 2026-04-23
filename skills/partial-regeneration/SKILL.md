---
name: partial-regeneration
description: Resume or rerun only the failed or missing stages of a short-form production run so agents do not regenerate every image, clip, voiceover, or scene on every retry.
---

# Partial Regeneration

## Use When

- A pipeline failed mid-run.
- Some assets are good and should be kept.
- A user wants one stage revised without paying to remake everything
  upstream.
- A long project has many scenes or storyboard items and only a subset
  needs regeneration.

## Core Rule

- Regenerate only what is missing, invalid, or explicitly rejected.
- Preserve successful artifacts unless the user or the failure reason
  requires a full rerun.

## Inputs

- current run directory or draft artifact
- stage status or artifact inventory
- optional force flags:
  `force_all`, `force_stage`, `force_items`

## Outputs

- list of stages to skip
- list of stages or scene items to rerun
- updated state showing what changed and why

## Resume Workflow

1. Inspect the run state or artifact set.
2. Mark completed stages as reusable only if their outputs are still
   valid for the new brief.
3. Identify missing scene items or failed artifacts.
4. Regenerate only those items.
5. Re-run downstream stages that depend on the changed outputs.
6. Keep a trace of why each preserved artifact was trusted.

## Good Uses

- only three storyboard scenes failed image generation
- captions need a rewrite but the voiceover timing is still valid
- b-roll selection changed for two beats, so only assembly plus review
  should rerun
- a retry should reuse cached actor portrait, generated clips, or
  background assets

## Bad Uses

- silently reusing stale upstream assets after the script changed
- keeping captions when the voiceover was replaced
- rerunning the whole project just because one scene was weak

## Pair With

- Use inside long-running flows such as
  [`generate-short`](../generate-short/SKILL.md) and
  [`ugc-avatar-short`](../ugc-avatar-short/SKILL.md).
- Combine with
  [`publish-prep-review`](../publish-prep-review/SKILL.md) so failed
  review outputs drive selective reruns.

## Aggregated From

- `rushindrasinha/youtube-shorts-pipeline` `state.py`
- `xhongc/ai_story` per-storyboard missing-item retries
- `mutonby/openshorts` retry asset cache reuse

## Validation Checklist

- Reused artifacts are still compatible with the current script or
  brief.
- Only missing or failed items are regenerated.
- Downstream invalidation is explicit.
- The rerun state explains what was skipped and why.
