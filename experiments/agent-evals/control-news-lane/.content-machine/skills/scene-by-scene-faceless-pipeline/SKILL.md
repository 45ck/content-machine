---
name: scene-by-scene-faceless-pipeline
description: Build a faceless short as a deterministic scene queue where each scene gets its own narration, caption timings, source clip, and final assembly step instead of treating the whole video as one undifferentiated blob.
---

# Scene-By-Scene Faceless Pipeline

## Use When

- A faceless short needs a clean stage contract per scene.
- You want a deterministic baseline pipeline before adding heavier
  editorial logic.
- The run benefits from queueing and per-scene artifact creation rather
  than giant whole-video mutation.

## Core Rule

- Build the short one scene at a time, then assemble it.
- Every scene should earn its own audio, caption timing, and visual
  selection.

## Inputs

- ordered scene list with narration text and visual search terms
- voice choice and music mood
- target orientation and caption style

## Outputs

- per-scene narration audio
- per-scene caption timing
- per-scene visual clip selection
- assembled short with optional music bed

## Workflow

1. Queue the job so only one full render mutates shared output state at
   a time.
2. For each scene:
   generate narration,
   normalize audio,
   transcribe for caption timing,
   select one fitting visual clip,
   and record the scene artifact bundle.
3. Exclude already-used source clips when selecting later visuals.
4. Sum the true scene durations before final render.
5. Choose music only after the total duration is known.
6. Render the final short from the scene bundles, then clean temporary
   files.

## Good Pattern

- each scene produces a small auditable artifact bundle
- audio timing drives scene duration
- source clip reuse is actively avoided
- the final render is assembly, not discovery

## Bad Pattern

- one giant prompt that decides script, timing, visuals, and music in a
  single opaque step
- picking music before total duration exists
- reusing the same stock clip across adjacent scenes by accident
- hiding per-scene failures inside one final render crash

## Pair With

- Use with [`token-level-caption-timestamps`](../token-level-caption-timestamps/SKILL.md)
  when the caption system needs word-level timing.
- Use with [`retry-with-cache`](../retry-with-cache/SKILL.md) or
  [`partial-regeneration`](../partial-regeneration/SKILL.md) when only
  some scenes need reruns.

## Aggregated From

- `gyoridavid/short-video-maker` `ShortCreator.ts`
- deterministic faceless pipeline patterns from short generators

## Validation Checklist

- Each scene has separate audio, timing, and visual artifacts.
- Real scene durations are summed before final assembly.
- Source clip reuse is controlled intentionally.
- Final render quality is inspectable scene by scene, not just at the
  very end.
