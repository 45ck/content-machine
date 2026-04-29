---
name: draft-embedded-pipeline-state
description: Keep short-production resume state directly inside the working draft artifact so each stage can mark done or failed status, record artifact paths, and safely skip completed work on rerun.
---

# Draft Embedded Pipeline State

## Use When

- A short pipeline needs safe resume behavior.
- The agent reruns the same draft multiple times across stages.
- Stage state should travel with the working artifact rather than live
  in scattered side files.

## Core Rule

- Put pipeline state inside the draft artifact itself.
- The artifact that defines the work should also record what has already
  completed.

## Inputs

- draft artifact:
  JSON or equivalent structured working file
- ordered stage list
- per-stage artifacts or errors

## Outputs

- updated draft with embedded pipeline state
- per-stage records:
  status, timestamp, artifact paths, and failure notes
- resume-safe stage summary

## Workflow

1. Initialize an internal pipeline-state object on first run.
2. After each successful stage, record `done`, timestamp, and artifact
   references.
3. After each failed stage, record `failed` and the failure reason.
4. On rerun, skip stages already marked done unless forced.
5. Keep the summary human-readable enough that an agent can inspect the
   artifact and know where to resume.

## Good Pattern

- one durable working artifact carries both plan and stage state
- reruns skip cleanly completed stages
- artifacts are discoverable from the state record
- failure state is explicit instead of implied by missing files

## Bad Pattern

- separate hidden state files with no clear relation to the draft
- rerunning everything because the pipeline cannot tell what succeeded
- missing artifact paths after a stage is marked done
- state reset without explicit force behavior

## Pair With

- Use with [`partial-regeneration`](../partial-regeneration/SKILL.md)
  and [`retry-with-cache`](../retry-with-cache/SKILL.md) for resume and
  rerun behavior.
- Pair with [`executive-producer-sendback`](../executive-producer-sendback/SKILL.md)
  when stage state needs richer gate decisions.

## Aggregated From

- `rushindrasinha/youtube-shorts-pipeline` `verticals/state.py`
- embedded draft-state patterns from short-form pipelines

## Validation Checklist

- Stage state lives inside the working draft artifact.
- Completed stages can be skipped safely on rerun.
- Failed stages retain the error reason.
- Artifact references are recorded where downstream stages can find
  them.
