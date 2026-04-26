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
- Top lane should fit or pad story footage into its half. Do not
  silently crop away the only useful subject.
- The opener can be a text hook, receipt crop, or title card. It does
  not need a Reddit card unless the source is explicitly Reddit-native.
- If there are no receipts or UI assets, use real moving support clips
  instead of static themed illustrations.
- Gameplay should stay continuous enough to feel familiar, but the top
  lane still has to carry the editorial rhythm.

## Aggregated From

- `raga70/FullyAutomatedRedditVideoMakerBot`
- `dr34ming/shorts-project`
- `1Dengaroo/rshorts`
- this repo's Reddit split-screen lane and gameplay render path

## Validation Checklist

- The first beat exposes the conflict immediately.
- Top-lane cadence stays alive even if bottom gameplay is continuous.
- Captions read cleanly between the lanes.
- Gameplay supports retention without swallowing the actual story.
- The result feels like a native storytime short, not a Reddit clone
  with the card removed.
