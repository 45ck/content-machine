---
name: reddit-story-short
description: Turn a Reddit-style post, confession, text thread, or comment story into a strong faceless short with narration, on-screen text rhythm, captions, visual support, and payoff.
---

# Reddit Story Short

## Use When

- The source is a Reddit post, confession, AITA-style story, text
  thread, or comment chain.
- The short should be driven by narration and staged reveals rather than
  informational explanation.
- The visual layer supports the story instead of carrying the full
  meaning.

## Core Approach

1. Open with the conflict, not the metadata.
2. Compress the story into setup, escalation, twist, and payoff.
3. Use on-screen text selectively for high-drama phrases and receipts,
   not for every sentence.
4. Pair the narration with visually supportive footage, gameplay, UI
   mockups, cards, or stylized generated scenes.
5. End on judgment, reveal, or unresolved tension that invites comment.

## Inputs

- post, thread, or story text
- optional subreddit/context
- desired tone:
  `dramatic`, `deadpan`, `funny`, `sympathetic`, `chaotic`

## Outputs

- story-shaped `script.json`
- voiceover + captions
- visual plan and final short

## Optional Runtime Surface

- Build on [`faceless-mixed-short`](../faceless-mixed-short/SKILL.md)
  for execution.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) for
  aggressive story caption styling.

## Technical Notes

- Story shorts need stronger pacing control than explainers because the
  viewer is waiting for the turn.
- Receipts, text messages, post fragments, and reaction cards work
  better than generic business stock footage.
- Background gameplay can help, but only if it does not trivialize the
  story tone.

## Aggregated From

- `raga70/FullyAutomatedRedditVideoMakerBot`
- `RayVentura/ShortGPT` reddit/story patterns
- this repo's faceless short, gameplay, and caption stack

## Validation Checklist

- The first line exposes the conflict fast.
- The middle does not wander or repeat setup.
- The payoff lands clearly.
- Visual support matches the tone and does not look accidental.
- The short invites reaction without relying on bait-only wording.
