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

- Final composition decisions in collaboration with
  [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md).
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
2. If the edit still needs judgment on pacing, hook support, shot
   variation, or assembly choices, read
   [`short-form-production-playbook`](../short-form-production-playbook/SKILL.md)
   before touching render options.
3. Choose the closest caption family from
   [`short-form-captions`](../short-form-captions/SKILL.md).
4. Keep layout readable before adding more styling. Chunk size, line
   count, and placement matter more than decorative motion.
5. Use the repo caption presets as the baseline and then override only
   the specific fields the brief actually needs.
6. Render and inspect the actual MP4. Do not trust config alone.

## Split-Screen Rules

- For Reddit-story or gameplay-backed split-screen work, default to a
  true `50/50` vertical split unless the brief has a stronger reason not
  to.
- Treat each lane as its own frame. Fit media inside that lane first,
  then pad if necessary. Do not use crop-fill as the default in split
  lanes, because it silently chops off the actual subject.
- If captions belong on the seam between the two lanes, overlay them at
  the midpoint instead of inserting a dedicated caption band.
- Treat hook cards and opener assets as their own upper-band layer, not
  as ordinary subtitles.
- A thin divider, seam gradient, or center badge is a valid readability
  aid for split archetypes; use it as a reusable layout token, not ad
  hoc decoration.
- For OCR-reviewable exports, prefer full-line active-word highlighting
  over progressive reveal burns when you need stable rendered caption
  verification.

## Isolated Project Rule

- In fresh installed-pack projects, do not assume the renderer can fetch
  a browser on demand. If the environment already has a cached Remotion
  browser, pass `browserExecutable` and `chromeMode` explicitly in the
  render request.
- Treat that browser override as part of the portable render contract
  for offline or sandboxed harness runs.
- If the only path to success is a manual fallback render outside the
  shipped runtime, record that as a runtime gap instead of pretending
  the packaged path worked.

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
