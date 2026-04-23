---
name: retry-with-cache
description: Retry failed short-generation runs while reusing valid generated assets such as voice, actor, b-roll, or scene outputs so reruns are faster, cheaper, and less destructive.
---

# Retry With Cache

## Use When

- A run failed late and most assets are still good.
- A user wants a rerun without paying to recreate everything.
- Generated assets are expensive enough that preserving them matters.

## Core Rule

- Reuse valid cached assets intentionally.
- Clear only the outputs that are broken, incomplete, or invalidated by
  the new revision.

## Inputs

- prior run directory
- asset inventory
- failure reason
- optional retry target:
  final render, captions, talking head, b-roll, etc.

## Outputs

- reused asset set
- deleted or invalidated asset set
- retry plan for the remaining stages

## Workflow

1. Locate the previous run directory.
2. Inventory cached outputs:
   image, voice, actor, head clip, b-roll, captions, final render.
3. Keep assets that are still valid for the unchanged brief.
4. Delete incomplete or zero-byte final outputs.
5. Restart the run from the lowest stage that actually needs work.

## Good Uses

- final MP4 failed, but voice and b-roll are fine
- actor portrait is good and should survive a caption or music retry
- a talking-head clip rendered, but final composition failed

## Bad Uses

- reusing cached assets after the script changed materially
- keeping stale captions after a new voiceover
- blindly trusting every file in an old run directory

## Pair With

- Use with [`partial-regeneration`](../partial-regeneration/SKILL.md)
  for stage-level reruns.
- Use with [`publish-prep-review`](../publish-prep-review/SKILL.md) to
  decide what the retry should actually fix.

## Aggregated From

- `mutonby/openshorts` retry-job asset reuse
- resumable run patterns from other staged short pipelines

## Validation Checklist

- Reused assets are enumerated explicitly.
- Broken outputs are cleared before retry.
- Cache reuse is blocked when upstream inputs changed materially.
- The retry starts from the right stage, not from zero by habit.
