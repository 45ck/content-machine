---
name: scene-aware-smart-crop
description: Reframe wide video into portrait by detecting real scene boundaries first, then choosing a crop strategy per scene instead of forcing one tracking rule over the whole clip.
---

# Scene-Aware Smart Crop

## Use When

- A long clip has multiple shots or camera cuts.
- One global portrait crop fails because the source changes scene by
  scene.
- The source might alternate between one-person framing, two-person
  framing, or more general content.

## Core Rule

- Detect scenes first, then crop each scene.
- Real cut points are the right places to change crop strategy.

## Inputs

- source video
- scene detector or cut detector
- face or subject detector
- portrait target dimensions

## Outputs

- scene list with per-scene crop decision
- cropped portrait segments
- final concatenated portrait clip

## Workflow

1. Detect real scene boundaries rather than sampling the whole video at
   arbitrary intervals.
2. Sample each scene and classify the framing problem for that scene.
3. Use one-person face crop when the scene is face-led.
4. Use alternate scene logic when multiple speakers or split framing are
   present.
5. Crop scenes independently and stitch them back together at the true
   cut points.

## Good Pattern

- cut detection drives crop changes
- subject classification happens per scene
- fallback center crop exists for low-confidence scenes
- final concat lands on real edit boundaries

## Bad Pattern

- one crop box for a clip that clearly changes shots
- per-frame twitching when only scene-level adjustment is needed
- no fallback when face detection is uncertain
- ignoring audio and visual seam quality at recombine time

## Pair With

- Use under [`reframe-vertical`](../reframe-vertical/SKILL.md) when the
  source has multiple real cuts.
- Pair with [`face-or-screen-reframe`](../face-or-screen-reframe/SKILL.md)
  when source-type branching still matters inside scenes.

## Aggregated From

- `iDoust/youtube-clip` `src/visual/smart_crop.py`
- scene-detect-driven portrait clipping patterns

## Validation Checklist

- Scene boundaries are detected before crop logic is chosen.
- Crop strategy is allowed to change at real cuts.
- Low-confidence scenes have a readable fallback crop.
- Final concatenation does not introduce obvious seam artifacts.
