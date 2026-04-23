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
3. existing CLI/runtime stage commands for audio and visuals
4. `video-render`
5. `publish-prep-review` as the closing review gate

## Current Status

Documentation-first. The flow is not executable yet, but the skill
contracts and harness scripts for script, ingest, render, and publish
review now exist.

## Suggested Claude Code / Codex Path

1. If the user supplied a reference video, run `reverse-engineer-winner`.
2. Generate `script.json` with `brief-to-script`.
3. Use the existing runtime/CLI stages to produce audio and visuals
   artifacts.
4. Render `video.mp4` with `video-render`.
5. Run `publish-prep-review` before calling the job done.
