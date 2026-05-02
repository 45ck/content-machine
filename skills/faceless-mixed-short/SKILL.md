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

## Proven Example

- Local proving bundle:
  `experiments/proving-wave-3/faceless-mixed-short/outputs/final/video.mp4`
- Tracked preview:
  `docs/demo/demo-15-faceless-mixed-short.mp4`
- Pattern used: practical tech hook, cold-phone opener, simplified
  chemistry diagram, phone UI recovery card, three practical tip cards,
  recap card, CTA, burned-in captions, quiet synthesized music bed, and
  final loudness normalization.
- Publish-prep passed portrait resolution, duration, format, cadence,
  and audio-signal checks. OCR caption-sync still needs a proper caption
  export sidecar for FFmpeg fallback renders.

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
- Route music beds, SFX, ambience, and YouTube-origin audio through
  [`audio-source-policy`](../creative-source-scout/references/audio-source-policy.md)
  before direct use in public demos.
- Do not place secondary explanatory text behind captions. The main
  visual should carry context, and captions should occupy the clean
  caption zone without text collisions.
- Mixed-source does not mean random-source. Every source change should
  map to a beat change: hook, mechanism, consequence, proof, tip, recap.
- If using FFmpeg fallback assembly, still include a real voiceover,
  audible but quiet music bed, portrait duration, cadence flashes or
  real cuts, and publish-prep review on the final MP4.

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
- Contact-sheet review shows no source-text collisions, clipped UI,
  unreadable captions, or accidental blank/default backgrounds.
