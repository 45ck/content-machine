---
name: generate-short
description: Run the default end-to-end short-video path so Claude Code or Codex can produce a full video, captions, and review files without manually stitching stages together.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"topic":"Redis vs PostgreSQL for caching","archetype":"versus","outputDir":"output/content-machine/generate-short","audio":{"voice":"af_heart"},"visuals":{"provider":"pexels","orientation":"portrait"},"render":{"fps":30,"downloadAssets":true},"publishPrep":{"enabled":true,"platform":"tiktok"}}'
entrypoint: node --import tsx scripts/harness/generate-short.ts
inputs:
  - name: topic
    description: Short brief or topic string to turn into a full video run.
    required: true
  - name: outputDir
    description: Root directory that will receive script, audio, visuals, render, and publish-prep outputs.
    required: false
  - name: referenceVideoPath
    description: Optional winner or competitor short to ingest before script generation.
    required: false
  - name: audio
    description: Optional audio-stage overrides such as voice, engines, speed, or mock mode.
    required: false
  - name: visuals
    description: Optional visuals-stage overrides such as provider, routing policy, local footage, or gameplay hints.
    required: false
  - name: render
    description: Optional render overrides such as fps, caption settings, mock mode, or explicit output paths.
    required: false
  - name: publishPrep
    description: Optional review-gate settings; enabled by default.
    required: false
outputs:
  - name: script/script.json
    description: Script file for the generated short.
  - name: audio/audio.wav
    description: Voiceover WAV file.
  - name: audio/timestamps.json
    description: Word-level timestamps aligned to the generated audio.
  - name: visuals/visuals.json
    description: Visual plan for rendering.
  - name: render/video.mp4
    description: Final rendered MP4.
  - name: publish-prep/
    description: Validation, score, and publish review bundle when publish prep is enabled.
---

# Generate Short

## Use When

- The user wants the default skills-first path from topic to video files
  in one call.
- Claude Code or Codex should hand back the full file set instead of
  manually coordinating stage-level wrappers.
- A reference winner should be ingested first so script generation can
  inherit blueprint and archetype hints.
- The run should use the pack's built-in audio, captions, visuals,
  Remotion render, and publish review steps.

## Invocation

```bash
cat skills/generate-short/examples/request.json | \
  node --import tsx scripts/harness/generate-short.ts
```

## Output Contract

- Writes a bounded output tree under `outputDir`.
- If `referenceVideoPath` is supplied, writes ingest files under
  `outputDir/ingest` unless `referenceOutputDir` is overridden.
- Always writes script, audio, timestamps, visuals, render metadata, and
  final video files.
- Runs `publish-prep` by default and writes its bundle unless
  `publishPrep.enabled` is `false`.
- Returns a JSON envelope with the main output paths plus publish
  readiness when the review gate runs.

## Validation Checklist

- `script/script.json` exists and has at least one scene.
- `audio/audio.wav` and `audio/timestamps.json` exist and agree on
  duration.
- `visuals/visuals.json` exists and matches the timestamps file.
- `render/video.mp4` and `render/render.json` exist.
- If `publishPrep.enabled` is true, `publish-prep/` exists and reports a
  deterministic pass/fail outcome.
