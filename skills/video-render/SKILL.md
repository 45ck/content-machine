---
name: video-render
description: Render a final MP4 from visuals, timestamps, audio, and explicit render options so a harness can produce a deterministic video artifact.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"visualsPath":"output/visuals.json","timestampsPath":"output/timestamps.json","audioPath":"output/audio.wav","outputPath":"output/harness/render/video.mp4","orientation":"portrait","fps":30,"downloadAssets":true,"outputMetadataPath":"output/harness/render/render.json"}'
entrypoint: npx tsx scripts/harness/video-render.ts
inputs:
  - name: visualsPath
    description: Visuals artifact JSON from the visuals stage.
    required: true
  - name: timestampsPath
    description: Timestamps artifact JSON from the audio stage.
    required: true
  - name: audioPath
    description: Final voiceover WAV artifact.
    required: true
  - name: orientation
    description: Render orientation override such as portrait, landscape, or square.
    required: false
  - name: outputMetadataPath
    description: Optional output path for structured render metadata.
    required: false
outputs:
  - name: video.mp4
    description: Final rendered MP4 written to the requested output path.
  - name: render.json
    description: Structured render metadata written alongside the video unless overridden.
---

# Video Render

## Use When

- The user already has `visuals.json`, `timestamps.json`, and
  `audio.wav` and wants the deterministic render step only.
- A harness needs a stable JSON-in/JSON-out boundary for final video
  generation instead of invoking the legacy CLI directly.
- Claude Code or Codex should return a concrete `video.mp4` artifact and
  optionally capture render metadata for later review or publish prep.

## Invocation

```bash
cat skills/video-render/examples/request.json | \
  npx tsx scripts/harness/video-render.ts
```

## Artifact Contract

- Reads existing `visuals.json`, `timestamps.json`, and `audio.wav`
  artifacts without modifying them.
- Writes one rendered MP4 to the requested `outputPath`.
- Writes render metadata to `outputMetadataPath`, defaulting to a
  sibling `render.json`.
- If `audioMixPath` is supplied, it must already exist and be valid.
- Returns a JSON envelope with the final video path plus effective size,
  fps, and metadata path.

## Validation Checklist

- `outputPath` exists and points to a non-empty MP4.
- `outputMetadataPath` exists and reports duration, dimensions, fps, and
  file size.
- The render used the supplied visuals, timestamps, and audio artifacts.
