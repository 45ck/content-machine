---
name: saas-problem-solution-short
description: Turn a product or SaaS into a short ad or creator-style pitch using hook, problem, solution, proof/demo, and CTA beats with avatar, b-roll, or mixed support visuals.
---

# SaaS Problem Solution Short

## Use When

- The input is a product page, SaaS URL, app, or service that needs a
  short-form promo lane.
- The best structure is creator-adjacent:
  `hook -> pain -> solution -> demo/proof -> CTA`.
- You need a reusable ad archetype that can work with avatar, talking
  head, or faceless support footage.

## Core Approach

1. Lead with the pain or impossible-sounding benefit.
2. Make the problem concrete before naming the product.
3. Show the product as the answer, not the premise.
4. Use proof, demo beats, or receipts instead of empty praise.
5. End with one CTA:
   `try it`, `comment`, `save this`, `link in bio`.

## Inputs

- product URL or product summary
- target customer or use case
- optional voice mode:
  `avatar`, `ugc`, `faceless`
- optional visual sources:
  screenshots, dashboard clips, b-roll, generated images

## Outputs

- ad-shaped script
- scene plan with product beats and proof beats
- optional hook card or opener asset
- final promo short plus review bundle

## Optional Runtime Surface

- Pair with [`ugc-avatar-short`](../ugc-avatar-short/SKILL.md) when the
  lane should include an AI actor or spokesperson.
- Pair with [`hook-overlay`](../hook-overlay/SKILL.md) for the opener.
- Use [`shot-prompt-builder`](../shot-prompt-builder/SKILL.md) for
  visual prompt shaping.
- Use [`publish-prep-review`](../publish-prep-review/SKILL.md) to fail
  weak demos or low-information product pitches.

## Technical Notes

- A SaaS short should usually carry five explicit beats:
  hook, problem, solution, proof/demo, CTA.
- Product visuals matter. If you have screenshots, UI clips, or
  dashboards, use them; do not hide a software product behind generic
  city timelapses.
- Avatar or UGC lanes still need b-roll and proof beats. One talking
  head the whole time is weak.
- Packaging should match the angle:
  founder pain, workflow speed, money saved, or result unlocked.
- If the lane falls back to FFmpeg assembly, export caption sidecars
  from the final narration timings and review the actual shipped MP4
  before calling the archetype proven.
- Long static dashboard holds will fail cadence/freeze review even if
  the copy is good. Keep proof beats moving with zooms, cursor motion,
  or explicit step changes.

## Aggregated From

- `mutonby/openshorts`
- `PipeDionisio/ad_tiktok_generator`
- this repo's `ugc-avatar-short` and hook/caption stack

## Validation Checklist

- The first beat makes the problem or promise obvious.
- The product appears as the answer to a real pain point.
- There is at least one proof or demo moment.
- The short feels like a native creator ad, not a brochure read aloud.
- CTA is singular and matches the lane.
- The final MP4 keeps real audio signal, visible proof beats, and
  caption timing that survives OCR review.
- The demo/proof lane changes often enough that the final short does not
  read like one static product slide.
