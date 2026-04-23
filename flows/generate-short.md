# Generate Short Flow

## Purpose

Default path for turning a topic into the file set
required for a short-form video run.

## Inputs

- `topic`
- `archetype` (optional)
- `targetDuration` (optional)
- `referenceVideo` (optional, used to seed blueprint or comparative work)

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
   rerun one artifact boundary in isolation.
