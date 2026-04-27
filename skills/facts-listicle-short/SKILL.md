---
name: facts-listicle-short
description: Build a numbered or promise-driven fact short with one clear beat per fact, strong hook phrasing, timed support visuals, and listicle-native packaging.
---

# Facts Listicle Short

## Use When

- The content is strongest as a compact list, countdown, or “things you
  did not know” format.
- The lane needs very clear beat segmentation and fast retention
  markers.
- You want a simpler archetype than a full explainer, but stronger than
  dumping bullet points over B-roll.

## Core Approach

1. Open with the strongest or strangest fact, not a generic setup.
2. Keep each fact self-contained and easy to say in one breath.
3. Use explicit beat markers:
   `fact 1`, `next`, `here's the weird one`, `most people miss this`.
4. Change the visual intent every fact.
5. End with either the payoff fact or a question CTA, not a long wrap-up.

## Inputs

- list topic or promise
- optional target fact count
- optional niche/tone hints
- optional source notes or research links

## Outputs

- compact listicle `script.json`
- timed beat map
- support visuals plan per fact
- final MP4 plus review bundle

## Optional Runtime Surface

- Start with [`brief-to-script`](../brief-to-script/SKILL.md) or
  [`niche-profile-draft`](../niche-profile-draft/SKILL.md).
- Use [`stock-footage-edutainment-short`](../stock-footage-edutainment-short/SKILL.md)
  when the listicle needs a stock-first visual lane.
- Use [`motion-card-lesson-short`](../motion-card-lesson-short/SKILL.md)
  when the facts should be card-first instead of footage-first.

## Technical Notes

- Facts shorts usually want `3` to `7` beats, not `10+`.
- Keep each fact visually distinct. If two facts want the same image or
  clip, the script probably needs to be tightened.
- Numbering can be spoken, visual, or both, but it should be obvious
  where the viewer is in the sequence.
- Avoid padded intros like “today we're going to talk about.” Facts
  lanes should start on the payload.
- If the lane uses a lightweight render or FFmpeg fallback, it still
  needs caption sidecars and a real publish-prep pass on the final MP4.
- Mock or silent audio is not acceptable for a proven lane. Facts shorts
  need real voiceover signal even when the cut is intentionally short.

## Aggregated From

- `RayVentura/ShortGPT` `FactsShortEngine`
- `harry0703/MoneyPrinterTurbo`
- `SaarD00/AI-Youtube-Shorts-Generator`

## Validation Checklist

- The first fact is genuinely sticky enough to open the short.
- Every fact adds something new instead of rephrasing the same idea.
- Visuals reset cleanly between beats.
- Numbering, captions, and transitions reinforce the list structure.
- The short feels intentionally segmented, not like one script chopped
  into pieces.
- Audio presence and caption drift are checked on the final deliverable,
  not assumed from the script.
- If the lane is intentionally under `30s`, expect the portrait review
  profile to fail duration unless you use a shorter profile on purpose.
