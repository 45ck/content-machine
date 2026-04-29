---
name: script-to-audio
description: Generate a voiceover WAV plus timestamps from a script file so later steps can build captions and video from it.
---

# Script To Audio

## Use When

- The user already has a `script.json` file and wants the bounded audio
  step only.
- The agent needs `audio.wav` and `timestamps.json` before visuals or
  render work starts.
- Claude Code or Codex should produce reusable audio-stage files
  instead of freeform narration text.

## What This Skill Owns

- Voice choice that matches the script energy.
- Spoken pacing that helps the caption system rather than fighting it.
- Timestamp quality good enough for active-word highlighting.
- Audio output that is clean, non-clipped, and ready for render.

## Core Approach

1. Treat this as performance direction, not just file generation.
2. Pick a voice that matches the intended edit style.
3. Keep speaking speed within a range the caption system can support.
4. Prefer clean timing and intelligibility over squeezing more words per
   second.
5. If the timestamps are noisy, fix that before styling captions harder.

## Inputs

- `script.json`
- optional voice and speed preferences
- optional output and metadata paths

## Outputs

- `audio.wav`
- `timestamps.json`
- optional `audio.json`

## Output Contract

- Reads an existing `script.json` file from `scriptPath` without
  modifying it.
- Writes `audio.wav` and `timestamps.json` under the requested
  `outputDir`.
- Optionally writes `audio.json` when `outputMetadataPath` is supplied.
- The important result is usable timing and delivery, not just the
  existence of a WAV file.

## Optional Runtime Surface

- Repo-side runner:
  `node ./node_modules/@45ck/content-machine/agent/run-tool.mjs script-to-audio`
- Supporting code:
  `src/harness/script-to-audio.ts`,
  `src/audio/*`

## Validation Checklist

- `audio.wav` exists and is non-empty.
- `timestamps.json` exists and reports word timings plus total duration.
- Spoken pacing feels compatible with chunked short-form captions.
- The timing is clean enough that active-word highlighting will not feel
  sloppy.
- If `outputMetadataPath` was supplied, `audio.json` exists and matches
  the emitted audio file.
