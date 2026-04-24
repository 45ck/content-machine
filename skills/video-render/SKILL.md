---
name: video-render
description: Assemble the final short from visuals, timestamps, audio, and caption treatment, using the repo's Remotion stack without losing short-form visual intent.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"visualsPath":"output/visuals.json","timestampsPath":"output/timestamps.json","audioPath":"output/audio.wav","outputPath":"output/content-machine/render/video.mp4","orientation":"portrait","fps":30,"downloadAssets":true}'
entrypoint: node --import tsx scripts/harness/video-render.ts
inputs:
  - name: visualsPath
    description: Path to visuals.json.
    required: true
  - name: timestampsPath
    description: Path to timestamps.json with word-level timing.
    required: true
  - name: audioPath
    description: Path to generated or source voiceover audio.
    required: true
  - name: outputPath
    description: Path that will receive the rendered MP4.
    required: false
  - name: captionPreset
    description: Optional caption preset override.
    required: false
outputs:
  - name: video.mp4
    description: Final rendered short.
  - name: render.json
    description: Render metadata.
  - name: captions.remotion.json
    description: Remotion-compatible caption export.
  - name: captions.srt
    description: Plain SRT caption sidecar.
  - name: captions.ass
    description: ASS karaoke-style caption sidecar.
---

# Video Render

## Use When

- The user already has `visuals.json`, `timestamps.json`, and
  `audio.wav` and wants the final video assembly step.
- The main question is no longer script or visual selection but how the
  final short should feel once motion, timing, and captions are
  combined.
- You need to render a real MP4 while preserving caption intent, safe
  zones, and short-form pacing.

## What This Skill Owns

- Final caption treatment selection in collaboration with
  [`short-form-captions`](../short-form-captions/SKILL.md).
- Composition choices such as orientation, pacing feel, overlays, and
  safe render defaults.
- Final MP4 quality hygiene: clean sources, readable captions, correct
  dimensions, and reviewable metadata.

## Inputs

- `visuals.json`
- `timestamps.json`
- `audio.wav`
- optional caption preset or caption overrides
- optional overlays, audio mix, browser override, or template override

## Render Approach

1. Confirm the visuals are caption-clean. Rendering is not the place to
   hide pre-existing text burned into source footage.
2. Choose the closest caption family from
   [`short-form-captions`](../short-form-captions/SKILL.md).
3. Keep layout readable before adding more styling. Chunk size, line
   count, and placement matter more than decorative motion.
4. Use the repo caption presets as the baseline and then override only
   the specific fields the brief actually needs.
5. Render and inspect the actual MP4. Do not trust config alone.

## Technical Surface

- Main implementation: `src/render/service.ts`
- Caption stack: `src/render/captions/*`
- Optional runtime entrypoint when you want repo-side execution from a
  coding-agent CLI:
  `node --import tsx scripts/harness/video-render.ts`

## Outputs

- one final `video.mp4`
- sibling render metadata, usually `render.json`
- caption sidecars when `exportCaptions` is enabled:
  `captions.remotion.json`, `captions.srt`, and `captions.ass`
- caption quality fields in the JSON result:
  `captionQualityPassed` and `captionQualityScore`
- optional review bundle if this skill is being used under a larger
  generate-and-review pass

## Validation Checklist

- The output is a real playable MP4 with the expected aspect ratio.
- Caption sidecars exist when `exportCaptions` is enabled.
- Captions remain readable on a phone-sized viewport.
- The active-word treatment feels synced, not merely mathematically
  aligned.
- No source-text collision was introduced by the footage choice.
- The final frame composition still leaves room for platform chrome.
