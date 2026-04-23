---
name: reframe-vertical
description: Convert wide or mixed-format source material into readable 9:16 video using speaker tracking, face tracking, cursor tracking, scene-aware cropping, and safe fallback strategies.
---

# Reframe Vertical

## Use When

- The source is not already composed for portrait.
- A long-form clip needs smart 9:16 crop behavior.
- The agent must choose between face tracking, speaker tracking, cursor
  tracking, or a general crop.

## Core Approach

1. Classify the source first:
   `talking-head`, `podcast`, `screen-recording`, `demo`, `general`.
2. Track the thing the viewer is actually following:
   face, active speaker, cursor, or a stable center region.
3. Prefer smooth crop motion over twitchy "always correct" movement.
4. If tracking confidence is weak, fall back to a safe general crop or
   blurred-fill composition instead of fake precision.
5. Validate on the actual clip, not just one sampled frame.

## Inputs

- source clip
- optional transcript or speaker turns
- optional face/cursor metadata
- platform target and caption lane constraints

## Outputs

- crop/reframe plan
- portrait-safe clip or render props
- notes on fallback strategy when tracking is weak

## Optional Runtime Surface

- Feed results into [`video-render`](../video-render/SKILL.md).
- Use with [`longform-to-shorts`](../longform-to-shorts/SKILL.md) for
  clip pipelines.

## Technical Notes

- Face/speaker/cursor tracking should stay subordinate to readability.
- Reserve room for the caption lane and platform chrome.
- Speaker-following and cursor-following are different problems; do not
  use one heuristic for both.

## Aggregated From

- `AgriciDaniel/claude-shorts`
- `imgly/videoclipper`
- `jipraks/yt-short-clipper`
- `hikg4593/vizard`

## Validation Checklist

- The subject of attention remains visible across the clip.
- Crop motion is stable and not nauseating.
- Screen demos keep the important UI region visible.
- Captions do not collide with the reframed content.
- Fallback behavior looks intentional when tracking confidence is poor.
