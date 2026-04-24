---
name: source-media-analyze
description: Probe source media locally with ffprobe and produce duration, orientation, stream, and coarse source-signal metadata.
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
  - name: ffprobePath
    description: Optional explicit ffprobe executable path.
    required: false
outputs:
  - name: source-media-analysis.v1.json
    description: Local media probe metadata and coarse signals for later highlight scoring.
---

# Source Media Analyze

## Use When

- A longform source file needs local metadata before selecting,
  clipping, or reframing highlights.
- You need duration, dimensions, orientation, fps, and stream presence
  without uploading the media anywhere.
- Highlight scoring should later incorporate source-level audio or scene
  signals.

## Invocation

```bash
cat skills/source-media-analyze/examples/request.json | \
  node --import tsx scripts/harness/source-media-analyze.ts
```

## Output Contract

- Reads the local source media file.
- Writes `source-media-analysis.v1.json`.
- Uses local `ffprobe` or the bundled static binary when available.

## Validation Checklist

- `hasVideo`, `hasAudio`, dimensions, duration, fps, and orientation
  are present when ffprobe can read them.
- Missing streams are warnings, not silent defaults.
- No network calls are made.
