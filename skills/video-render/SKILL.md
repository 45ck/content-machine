---
name: video-render
description: Render a final MP4 from visuals, timestamps, audio, and render options using the repo's Remotion-based video stack.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"visualsPath":"output/visuals.json","timestampsPath":"output/timestamps.json","audioPath":"output/audio.wav","outputPath":"output/content-machine/render/video.mp4","orientation":"portrait","fps":30,"downloadAssets":true,"outputMetadataPath":"output/content-machine/render/render.json"}'
entrypoint: node --import tsx scripts/harness/video-render.ts
inputs:
  - name: visualsPath
    description: Visuals file from the visuals step.
    required: true
  - name: timestampsPath
    description: Timing file from the audio step.
    required: true
  - name: audioPath
    description: Final voiceover WAV file.
    required: true
  - name: orientation
    description: Render orientation override such as portrait, landscape, or square.
    required: false
  - name: outputMetadataPath
    description: Optional output path for render metadata.
    required: false
outputs:
  - name: video.mp4
    description: Final rendered MP4 written to the requested output path.
  - name: render.json
    description: Render metadata written alongside the video unless overridden.
---

# Video Render

## Use When

- The user already has `visuals.json`, `timestamps.json`, and
  `audio.wav` and wants the render step only.
- The agent needs a stable final-video step instead of invoking the
  legacy CLI directly.
- Claude Code or Codex should return a concrete `video.mp4` and capture
  render metadata for later review or publish prep.
- The visual plan already points at caption-clean source media. This
  step is for composition and caption burn-in, not for hiding text that
  was already present in the source clips.

## Invocation

```bash
cat skills/video-render/examples/request.json | \
  node --import tsx scripts/harness/video-render.ts
```

## Output Contract

- Reads existing `visuals.json`, `timestamps.json`, and `audio.wav`
  files without modifying them.
- Writes one rendered MP4 to the requested `outputPath`.
- Writes render metadata to `outputMetadataPath`, defaulting to a
  sibling `render.json`.
- If `audioMixPath` is supplied, it must already exist and be valid.
- Returns a JSON envelope with the final video path plus effective size,
  fps, and metadata path.
- Assumes source text control happened upstream in the visuals step.

## Validation Checklist

- `outputPath` exists and points to a non-empty MP4.
- `outputMetadataPath` exists and reports duration, dimensions, fps, and
  file size.
- The render used the supplied visuals, timestamps, and audio files.
