# Generate Short Flow

## Purpose

Default path for turning a topic into the file set
required for a short-form video run.

## Inputs

- `topic`
- `archetype` (optional)
- `laneId` (optional)
- `targetDuration` (optional)
- `referenceVideoPath` (optional, used to seed blueprint or comparative work)
- `audio`, `visuals`, `render`, and `publishPrep` stage settings
  (optional)

## Primary Skill

- `generate-short`

## Stage Skills Used Internally

1. `reverse-engineer-winner` when a reference video is present
2. `brief-to-script`
3. `script-to-audio`
4. `timestamps-to-visuals`
5. `video-render`
6. `publish-prep-review` as the closing review gate

## Current Status

Executable. `generate-short` now orchestrates the script, audio,
visuals, render, and publish-prep stages and returns the full file set
in one JSON envelope.

## Suggested Claude Code / Codex Path

1. Prefer `generate-short` for the normal end-to-end path.
2. Supply `referenceVideoPath` when the user wants winner analysis to
   shape the script before generation.
3. Drop to stage-level skills only when you need to inspect, replace, or
   rerun one file boundary in isolation.

## Failure And Retry Notes

- If provider keys are missing, run `doctor-report` first and use the
  no-key smoke path only for artifact-chain validation.
- If publish-prep fails, do not call the MP4 ready; inspect
  `runs/<run-id>/publish-prep/` and rerun only the failed stage when
  possible.
- If only captions, visuals, or render failed, prefer the stage-level
  skills instead of regenerating the whole short.
