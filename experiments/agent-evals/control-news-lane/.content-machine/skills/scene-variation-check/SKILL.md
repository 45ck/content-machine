---
name: scene-variation-check
description: Review a scene plan before generation or render to catch slideshow risk, repetitive shots, weak movement, generic prompts, and missing visual peaks that make short-form videos feel flat.
---

# Scene Variation Check

## Use When

- A short has a scene plan, beat list, or storyboard but has not been
  rendered yet.
- The output feels like repeating text cards, repeating b-roll, or
  generic AI-image scenes.
- You want to reject weak visual plans before spending generation or
  render budget.

## What This Skill Checks

- overused shot sizes
- too many consecutive scenes with the same framing
- static movement overuse
- no visual hero moment
- vague scene language
- missing texture or shot-intent cues
- weak lighting or mood variation across the sequence

## Inputs

- scene list, storyboard, or visuals plan
- optional per-scene fields:
  `shot_size`, `camera_movement`, `description`, `texture_keywords`,
  `shot_intent`, `hero_moment`, `lighting_key`

## Outputs

- verdict:
  `strong`, `acceptable`, `revise`, or `fail`
- specific violations
- concrete rewrite suggestions for the weak scenes

## Review Rules

1. Count repetition, do not hand-wave it.
2. Treat missing movement metadata as static unless proven otherwise.
3. Require at least one visual peak in a non-trivial short.
4. Penalize generic filler language like
   `beautiful`, `stunning`, `modern`, `futuristic`, or `dynamic`
   when that is all the scene says.
5. If several scenes could be swapped without changing the edit, the
   plan is too weak.

## Common Failure Modes

- every scene is medium shot plus slow zoom
- every prompt is `cinematic`, `beautiful`, `high quality`
- all scenes have the same lighting and palette
- there is no payoff beat visually larger than the rest
- text cards are doing the narrative work because the visuals are not

## Pair With

- Run before [`animation-explainer-short`](../animation-explainer-short/SKILL.md)
  and [`faceless-mixed-short`](../faceless-mixed-short/SKILL.md).
- Combine with
  [`slideshow-risk-review`](../slideshow-risk-review/SKILL.md) for
  pre-render plus post-render checks.

## Aggregated From

- `calesthio/OpenMontage` `variation_checker.py`
- `calesthio/OpenMontage` `slideshow_risk.py`

## Validation Checklist

- Repetition is measured across the whole plan, not judged from one
  example frame.
- At least one scene is clearly the visual peak.
- Weak scenes have actionable rewrite notes.
- A failed plan is revised before generation proceeds.
