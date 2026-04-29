---
name: slideshow-risk-review
description: Review a short or scene plan for repetition, decorative visuals, weak motion, text overreliance, and unsupported cinematic claims before it ships as a lifeless slideshow.
---

# Slideshow Risk Review

## Use When

- A faceless or animation-led short technically works but may still feel
  static or cheap.
- The visual plan is text-heavy, generated-image-heavy, or motion-light.
- The agent needs a pre-compose or post-render check beyond codec
  validity.

## Core Approach

1. Judge the edit as directed video, not as a set of individually valid
   scenes.
2. Score repetition across layout, scene type, and shot grammar.
3. Flag visuals that decorate instead of communicate.
4. Penalize motion with no narrative purpose.
5. Reject cinematic claims that are not backed by shot intent, hero
   moments, or varied scene language.

## Inputs

- scene plan or final render review context
- optional edit decisions and renderer family
- optional narrative/shot-intent metadata

## Outputs

- slideshow-risk score
- dimension-level reasons
- verdict: `strong`, `acceptable`, `revise`, or `fail`

## Optional Runtime Surface

- Use before [`video-render`](../video-render/SKILL.md) for scene-plan
  review.
- Use after render alongside
  [`publish-prep-review`](../publish-prep-review/SKILL.md).

## Technical Notes

- Text cards are not automatically bad; overuse is.
- Repetition across scene type, shot size, and description is a strong
  predictor of bad faceless output.
- A generated-video short can still be slideshow-like if the shot logic
  is weak.

## Aggregated From

- `calesthio/OpenMontage` `slideshow_risk.py`
- `DojoCodingLabs/remotion-superpowers` production review patterns
- this repo's short-form production and validation stack

## Validation Checklist

- The score reflects more than technical validity.
- Reasons clearly identify what to change: variety, intent, motion, or
  text load.
- A failed review blocks shipment rather than generating paperwork.
