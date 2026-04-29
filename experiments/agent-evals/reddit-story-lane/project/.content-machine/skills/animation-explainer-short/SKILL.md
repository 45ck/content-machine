---
name: animation-explainer-short
description: Make a faceless explainer short using diagrams, motion cards, generated scenes, typography, and light footage support instead of relying on talking heads or pure stock footage.
---

# Animation Explainer Short

## Use When

- The short should feel designed, diagrammatic, or motion-led.
- The idea is abstract, technical, or conceptual enough that plain
  stock footage will look weak.
- You need cards, labels, diagrams, generated scenes, or stylized
  transitions to explain the idea.

## Core Approach

1. Reduce the idea to 3 to 6 visual beats.
2. Decide what each beat wants:
   diagram, stat card, generated scene, motion typography, or support
   footage.
3. Use generated images or clips for scenes that cannot be found in
   stock.
4. Keep text hierarchy stronger than effect density.
5. Treat every transition as editorial meaning, not filler movement.

## Inputs

- concept or explanation target
- optional brand palette, typography, or visual language
- optional generated-image or generated-video preferences

## Outputs

- beat map
- visuals plan for motion-led scenes
- final explain-the-idea short

## Optional Runtime Surface

- Use [`faceless-mixed-short`](../faceless-mixed-short/SKILL.md) when
  you need more raw footage support.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) for
  caption family decisions.
- Use existing generated-media and Remotion render surfaces where
  helpful.

## Technical Notes

- Generated visuals are especially useful for impossible camera moves,
  systems diagrams, and metaphor scenes.
- Ken Burns, parallax, and simple motion cards are often enough; avoid
  overproduced transitions when the concept is already dense.
- Explainers need stronger information hierarchy than entertainment
  shorts.

## Aggregated From

- `calesthio/OpenMontage`
- `DojoCodingLabs/remotion-superpowers`
- this repo's NanoBanana, Ken Burns, Veo, and Remotion caption system

## Validation Checklist

- Each scene teaches or reinforces the spoken beat.
- The frame reads on mobile without pausing.
- Typography, captions, and diagrams are not competing for attention.
- Stock footage is only used where it genuinely helps.
- The result feels intentional, not like stock B-roll with text pasted
  on top.
