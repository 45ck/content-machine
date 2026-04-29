---
name: storyboard-continuity-reference
description: Use the previous storyboard frame as a controlled reference input for the next storyboard or generated shot so adjacent scenes preserve color, composition, and scene continuity without copying the old frame blindly.
---

# Storyboard Continuity Reference

## Use When

- A short uses sequential storyboarded scenes or generated image beats.
- Scene-to-scene continuity matters:
  same location, same camera progression, same mood, same visual world.
- The next shot should evolve from the previous one without resetting
  style or composition.

## Core Rule

- The previous storyboard is a continuity reference, not the new
  prompt's replacement.

## Inputs

- ordered scene list
- current scene prompt
- previous storyboard image, if one exists
- optional break markers indicating a new visual sequence

## Outputs

- reference decision:
  use prior frame or start fresh
- continuity note describing why the reference applies

## Workflow

1. Identify whether the current scene follows directly from a previous
   one.
2. If there is a sequence break, do not pass the previous storyboard as
   a reference.
3. If continuity matters, attach the previous storyboard as a labeled
   reference image.
4. Make the prompt explicit that the previous frame is only for
   composition, palette, and scene continuity.
5. Keep the current scene prompt authoritative for the actual content.

## Good Uses

- camera continues through the same room
- same subject or location in adjacent beats
- image-to-video or storyboard chains that should feel cohesive

## Bad Uses

- using the previous frame when the story intentionally hard-cuts to a
  new setting
- letting the previous reference override the new beat's content
- carrying forward old wardrobe, props, or staging that the new prompt
  is supposed to change

## Pair With

- Use with [`continuity-chain`](../continuity-chain/SKILL.md) for
  generated clip sequences.
- Use with [`shot-prompt-builder`](../shot-prompt-builder/SKILL.md) so
  continuity reference and current prompt work together.

## Aggregated From

- `ArcReel/ArcReel` `storyboard_sequence.py`
- sequential storyboard generation practice from longer-form AI video
  systems

## Validation Checklist

- Reference is only attached when continuity actually matters.
- Sequence breaks stop the reference chain cleanly.
- The current scene prompt still controls the shot content.
- Adjacent scenes look connected without collapsing into duplicates.
