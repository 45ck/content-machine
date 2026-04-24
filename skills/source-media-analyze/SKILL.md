---
name: source-media-analyze
description: Probe source media locally with ffprobe/ffmpeg and produce duration, orientation, stream, scene-change, silence, and audio-energy metadata.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"mediaPath":"input/source.mp4","outputPath":"output/content-machine/highlights/source-media-analysis.v1.json"}'
entrypoint: node --import tsx scripts/harness/source-media-analyze.ts
inputs:
  - name: mediaPath
    description: Source video or audio file to inspect.
    required: true
  - name: outputPath
    description: Path that will receive source-media-analysis.v1.json.
    required: false
  - name: ffmpegPath
    description: Optional explicit ffmpeg executable path for measured scene/audio signals.
    required: false
  - name: ffprobePath
    description: Optional explicit ffprobe executable path.
    required: false
outputs:
  - name: source-media-analysis.v1.json
    description: Local media probe metadata and measured signals for later highlight scoring.
---

# Source Media Analyze

## Use When

- A longform source file needs local metadata before selecting,
  clipping, or reframing highlights.
- You need duration, dimensions, orientation, fps, and stream presence
  without uploading the media anywhere.
- Highlight scoring should incorporate source-level audio energy,
  silence, or scene-change signals.

## Invocation

```bash
cat skills/source-media-analyze/examples/request.json | \
  node --import tsx scripts/harness/source-media-analyze.ts
```

## Output Contract

- Reads the local source media file.
- Writes `source-media-analysis.v1.json`.
- Uses local `ffprobe`/`ffmpeg` or bundled static binaries when
  available.
- Measures scene-change timestamps, silence gaps, audio RMS/peak, and
  compact normalized source scores on a best-effort basis.

## Validation Checklist

- `hasVideo`, `hasAudio`, dimensions, duration, fps, and orientation
  are present when ffprobe can read them.
- Missing streams are warnings, not silent defaults.
- Missing ffmpeg measurement support is a warning; ffprobe metadata
  should still be written when possible.
- No network calls are made.
