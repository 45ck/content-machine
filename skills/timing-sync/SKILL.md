---
name: timing-sync
description: Measure actual audio durations and reconcile them with scene timing, script timing, or composition config so the edit matches the real voiceover instead of stale estimates.
---

# Timing Sync

## Use When

- TTS or recorded narration durations differ from planned scene lengths.
- The short has a scene config or timing plan that was estimated before
  audio existed.
- You need to update durations before render instead of discovering the
  mismatch in the final MP4.

## Core Rule

- Real audio duration wins.
- Do not keep stale estimated scene durations after voiceover is
  generated.

## Inputs

- one or more scene audio files or narration files
- current scene timing plan, config, or manifest
- optional padding rules

## Outputs

- measured durations
- timing diffs against the current plan
- either:
  updated scene durations
  or a revise/fail note when the drift is too large

## Workflow

1. Probe every audio file with `ffprobe` or equivalent.
2. Map each measured duration to its scene or beat.
3. Compare measured duration against planned duration.
4. Apply acceptable adjustments automatically when the scene still works.
5. If the drift breaks pacing, send the work back:
   script too long, scene too short, or both.

## Adjustment Rules

- Small drift:
  stretch scene timing and continue
- Moderate drift:
  rebalance adjacent scenes if the story still holds
- Large drift:
  revise script, scene plan, or asset timing before render

## Common Failures

- narration overruns visuals by several seconds
- later scenes inherit stale start times from earlier bad estimates
- asset generation was done for a 6-second scene that is actually 10
  seconds long
- final render technically passes but feels off because every beat lands
  late

## Pair With

- Run after [`script-to-audio`](../script-to-audio/SKILL.md).
- Pair with [`scene-pacing-verifier`](../scene-pacing-verifier/SKILL.md)
  for post-adjustment checks.

## Aggregated From

- `digitalsamba/claude-code-video-toolkit` `sync_timing.py`
- `calesthio/OpenMontage` explainer EP gate logic

## Validation Checklist

- Every scene duration is based on measured audio, not guesses.
- Drift is explained per scene.
- Large overruns trigger revision instead of silent acceptance.
- Updated timing is what downstream render uses.
