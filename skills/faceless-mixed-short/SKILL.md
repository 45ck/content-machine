---
name: faceless-mixed-short
description: Build a faceless short that mixes voiceover, stock footage, local footage, gameplay, AI-generated images or clips, captions, and music into one coherent edit.
---

# Faceless Mixed Short

## Use When

- The user wants a net-new short without a human presenter on camera.
- The strongest output will come from mixing visual sources, not forcing
  one source for every beat.
- The short needs voiceover, captions, music, and pattern interrupts.

## Core Approach

1. Write for voiceover-first pacing.
2. Use the simplest source that sells each beat:
   stock, local footage, gameplay, generated image, generated clip, or
   graphic card.
3. Mix sources deliberately. Variety should create rhythm, not noise.
4. Use captions as part of the composition, not as an accessibility
   afterthought.
5. Reject outputs where the visual layer looks like keyword wallpaper.

## Inputs

- topic, angle, or packaging promise
- optional brand/niche hints
- optional local assets or gameplay
- provider preferences for stock or generated media

## Outputs

- `script.json`
- `audio.wav` and timestamps
- `visuals.json`
- final MP4 plus review bundle

## Optional Runtime Surface

- Compose this with [`brief-to-script`](../brief-to-script/SKILL.md),
  [`script-to-audio`](../script-to-audio/SKILL.md),
  [`timestamps-to-visuals`](../timestamps-to-visuals/SKILL.md),
  [`video-render`](../video-render/SKILL.md), and
  [`publish-prep-review`](../publish-prep-review/SKILL.md).
- Use [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md)
  as the editorial layer.

## Technical Notes

- Gameplay and stock are support footage, not excuses to avoid visual
  judgment.
- AI-generated visuals work best as emphasis beats, impossible shots,
  diagrams, or stylized transitions.
- Use music and motion changes to separate beats, not to hide weak
  writing.

## Aggregated From

- `RayVentura/ShortGPT`
- `rushindrasinha/youtube-shorts-pipeline`
- `mutonby/openshorts`
- this repo's stock, gameplay, NanoBanana, Ken Burns, and Veo paths

## Validation Checklist

- The hook lands immediately with sound on or off.
- Visual sources vary on purpose and do not feel randomly swapped.
- Captions remain readable across all source types.
- Music supports pace without masking narration.
- The render feels like one edit, not several pipelines stitched
  together.
