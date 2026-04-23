# Generate Short Flow

## Purpose

Default harness-oriented path for turning a topic into the artifact chain
required for a short-form video run.

## Inputs

- `topic`
- `archetype` (optional)
- `targetDuration` (optional)
- `referenceVideo` (optional, used to seed blueprint or comparative work)

## Skills Called

1. `brief-to-script`
2. `reverse-engineer-winner` when a reference video is present
3. `script-to-audio`
4. `timestamps-to-visuals`
5. `video-render`
6. `publish-prep-review` as the closing review gate

## Current Status

Documentation-first. The flow is not executable yet, but the skill
contracts and harness scripts for script, ingest, audio, visuals,
render, and publish review now exist.

## Suggested Claude Code / Codex Path

1. If the user supplied a reference video, run `reverse-engineer-winner`.
2. Generate `script.json` with `brief-to-script`.
3. Generate `audio.wav` and `timestamps.json` with `script-to-audio`.
4. Generate `visuals.json` with `timestamps-to-visuals`.
5. Render `video.mp4` with `video-render`.
6. Run `publish-prep-review` before calling the job done.
