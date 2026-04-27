---
name: gameplay-confession-short
description: Turn a confession, AITA-style dilemma, roommate drama, or anonymous storytime into a fast mobile-native short with story footage or receipts on top, Subway Surfers or similar gameplay on bottom, and aggressive midpoint captions.
---

# Gameplay Confession Short

## Use When

- The source is a confession, anonymous drama, AITA-style dilemma, or
  storytime.
- The best format is narration-led with gameplay support rather than a
  Reddit card as the main identity.
- You want a bread-and-butter short that can reuse the same gameplay
  lane while changing the top-lane story support.

## Core Approach

1. Open on the visible stakes line fast.
2. Put the story payload in the narration, not in tiny on-screen prose.
3. Keep the top lane changing every `2s` to `4s` with support footage,
   receipts, screenshots, or light UI cards.
4. Use gameplay as a pacing rail, not as the main information carrier.
5. Keep captions centered between the lanes with active-word emphasis.

## Pattern Name

Use `gameplay-confession-split` for this archetype.

Default variant: `subject-safe-split`.

Fill variants:

- `crop-fill-split`: use when the useful subject survives the crop and
  the lane needs full-bleed native energy.
- `contained-blur-split`: use when crop-fill would destroy or soften the
  actual subject. This uses blurred/motion fill behind the contained
  source, not black gutters.

## Inputs

- confession, dilemma, or story text
- optional receipts, screenshots, or local support clips
- gameplay preference:
  `subway-surfers`, `minecraft-parkour`, `satisfying`
- tone:
  `dramatic`, `chaotic`, `deadpan`, `sympathetic`

## Outputs

- story-shaped `script.json`
- voiceover + word timings
- split-screen `visuals.json`
- final vertical MP4 plus review bundle

## Optional Runtime Surface

- Build on [`faceless-mixed-short`](../faceless-mixed-short/SKILL.md)
  for execution.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) for the
  caption family.
- Use [`hook-overlay`](../hook-overlay/SKILL.md) when the opener needs
  a designed stakes card.
- Use [`references/lane-shape.md`](references/lane-shape.md) for the
  exact gameplay-backed story lane rules.

## Example Request

- [`examples/request.json`](examples/request.json)

## Technical Notes

- Default render shape is true `50/50` vertical stacking in
  `1080x1920`.
- Each lane should feel intentional and native. If incoming clips
  contain black side gutters, remove them with either crop-fill or
  contained-blur; do not preserve the boxed intermediate.
- Do not over-scale blindly. If the useful center crop becomes too soft
  or cuts off the important subject, switch to `contained-blur-split`.
- The first `1s` to `3s` needs a native hook treatment: title sticker,
  receipt overlay, conflict card, or immediate proof frame. Do not open
  on anonymous B-roll without the stakes visible.
- Midpoint captions should sit near the lane boundary but still inside
  the social safe box: use centered placement around `x=540`,
  `y=900..1040`, two lines max, and explicit line wrapping. Do not
  let the caption grow past the left/right frame edge.
- Top lane should fit or pad story footage into its half. Do not
  silently crop away the only useful subject.
- The opener can be a text hook, receipt crop, or title card. It does
  not need a Reddit card unless the source is explicitly Reddit-native.
- If there are no receipts or UI assets, use real moving support clips
  instead of static themed illustrations.
- Gameplay should stay continuous enough to feel familiar, but the top
  lane still has to carry the editorial rhythm.
- Fallback assembly is allowed, but it still has to export caption
  sidecars and pass `publish-prep` against the actual final MP4 before
  the lane counts as proven.
- Small top-lane swaps that read as the same frame will still fail
  cadence review. Make the story-support changes visually obvious enough
  to register as new beats.

## Aggregated From

- `raga70/FullyAutomatedRedditVideoMakerBot`
- `dr34ming/shorts-project`
- `1Dengaroo/rshorts`
- this repo's Reddit split-screen lane and gameplay render path

## Validation Checklist

- The first beat exposes the conflict immediately.
- The first frame looks like a TikTok/Reels story hook, not a boxed
  technical render.
- Top-lane cadence stays alive even if bottom gameplay is continuous.
- Captions read cleanly between the lanes.
- Neither lane has black gutters unless the creative format explicitly
  calls for them.
- Captions stay inside the video frame on mobile safe-zone review.
- Gameplay supports retention without swallowing the actual story.
- The result feels like a native storytime short, not a Reddit clone
  with the card removed.
- The review bundle is attached to the final gameplay-backed MP4, not a
  pre-burn intermediate.
- Story-support changes are strong enough that the split-screen cadence
  detector sees them as real editorial beats.
