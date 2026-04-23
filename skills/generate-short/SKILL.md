---
name: generate-short
description: Run the default end-to-end short-generation flow as one JSON-stdio skill so Claude Code or Codex can produce the full artifact chain without manually stitching stage wrappers together.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"topic":"Redis vs PostgreSQL for caching","archetype":"versus","outputDir":"output/harness/generate-short","audio":{"voice":"af_heart"},"visuals":{"provider":"pexels","orientation":"portrait"},"render":{"fps":30,"downloadAssets":true},"publishPrep":{"enabled":true,"platform":"tiktok"}}'
entrypoint: npx tsx scripts/harness/generate-short.ts
inputs:
  - name: topic
    description: Short brief or topic string to turn into a full artifact chain.
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
    description: Script artifact for the generated short.
  - name: audio/audio.wav
    description: Voiceover WAV artifact.
  - name: audio/timestamps.json
    description: Word-level timestamps aligned to the generated audio.
  - name: visuals/visuals.json
    description: Visual plan artifact for rendering.
  - name: render/video.mp4
    description: Final rendered MP4 artifact.
  - name: publish-prep/
    description: Validation, score, and publish metadata bundle when publish prep is enabled.
---

# Generate Short

## Use When

- The user wants the default skills-first path from topic to video
  artifacts in one call.
- Claude Code or Codex should hand back the full artifact chain instead
  of manually coordinating stage-level wrappers.
- A reference winner should be ingested first so script generation can
  inherit blueprint and archetype hints.

## Invocation

```bash
cat skills/generate-short/examples/request.json | \
  npx tsx scripts/harness/generate-short.ts
```

## Artifact Contract

- Writes a bounded artifact tree under `outputDir`.
- If `referenceVideoPath` is supplied, writes ingest artifacts under
  `outputDir/ingest` unless `referenceOutputDir` is overridden.
- Always writes script, audio, timestamps, visuals, render metadata, and
  final video artifacts.
- Runs `publish-prep` by default and writes its bundle unless
  `publishPrep.enabled` is `false`.
- Returns a JSON envelope with the main artifact paths plus publish
  readiness when the review gate runs.

## Validation Checklist

- `script/script.json` exists and has at least one scene.
- `audio/audio.wav` and `audio/timestamps.json` exist and agree on
  duration.
- `visuals/visuals.json` exists and matches the timestamps artifact.
- `render/video.mp4` and `render/render.json` exist.
- If `publishPrep.enabled` is true, `publish-prep/` exists and reports a
  deterministic pass/fail outcome.
