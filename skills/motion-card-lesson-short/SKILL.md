---
name: motion-card-lesson-short
description: Build a narrow educational short around motion cards, timed reveals, quiz beats, or vocabulary-style prompts where the primary visual system is designed cards rather than stock footage or freeform generated scenes.
---

# Motion Card Lesson Short

## Use When

- The short is educational, quiz-like, vocabulary-like, or term-reveal
  driven.
- The strongest visual system is timed cards, labels, counters, and
  reveal states.
- The lane should stay deterministic and readable rather than becoming
  a broad cinematic explainer.

## Core Approach

1. Reduce the lesson to one hook and `3` to `6` card beats.
2. Compute final duration from real narration before adding music or
   delayed reveal timing.
3. Treat each card as a state change:
   prompt, clue, countdown, answer, reinforcement, CTA.
4. Use motion for emphasis and progression, not decoration.
5. Keep the whole lane schema-first and repeatable.

## Inputs

- topic, term, or mini-lesson
- lane shape:
  `explainer-card`, `quiz-reveal`, `flashcard`
- optional brand palette, icon set, or typography

## Outputs

- card-driven `scene_plan.json`
- motion-led render plan
- final lesson short

## Optional Runtime Surface

- Use [`animation-explainer-short`](../animation-explainer-short/SKILL.md)
  when the lesson needs diagrams or generated metaphor scenes.
- Use [`shot-prompt-builder`](../shot-prompt-builder/SKILL.md) only if
  a beat truly needs a generated support scene.
- Use [`references/lane-shape.md`](references/lane-shape.md) for the
  exact card-state sequence and review expectations.

## Example Request

- [`examples/request.json`](examples/request.json)

## Technical Notes

- Card lanes should know the final narration duration before music and
  reinforcement timing are locked.
- Countdowns, answer flips, and term reveals are first-class scene
  events, not styling afterthoughts.
- This lane works best when every card has one job.

## Aggregated From

- `leke-adewa/short-video-maker`
- `calesthio/OpenMontage`
- `dr34ming/shorts-project`

## Validation Checklist

- The lesson can be followed on mute and on first watch.
- Card transitions map cleanly to narration beats.
- Typography and icons stay readable on mobile.
- Motion clarifies progression instead of muddying it.
- The lane feels deliberate and repeatable, not improvised.
