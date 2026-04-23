---
name: scene-pacing-verifier
description: Verify that narration cues, visual landmarks, and scene durations align so a short does not freeze, rush, or leave the voiceover unsupported.
---

# Scene Pacing Verifier

## Use When

- A short has scenes or step sequences that may not line up with the
  spoken beats.
- The voiceover is dense and the visual rhythm needs proof, not instinct.
- The agent needs to know whether a scene underfills, overflows, or
  misses key narration cues.

## Core Approach

1. Trace visible events in video time.
2. Compare those landmarks against narration cues.
3. Fail when important cues have no nearby visual support.
4. Fail when a scene overflows or underfills badly enough to create
   freeze or rush.
5. Route fixes to the right place: shorter script, more visuals, or
   adjusted timing.

## Inputs

- step list, scene plan, or other visible landmark sequence
- scene start/end times
- narration cue times and labels
- tolerance threshold

## Outputs

- alignment report
- overflow/underfill detection
- actionable pacing failures

## Optional Runtime Surface

- Use during animation-heavy or text-sequence composition work.
- Pair with [`slideshow-risk-review`](../slideshow-risk-review/SKILL.md)
  and [`publish-prep-review`](../publish-prep-review/SKILL.md).

## Technical Notes

- A visually valid composition can still fail pacing if the narration
  has no matching landmark.
- Underfill matters: long frozen holds at the end of a scene are a real
  defect.
- Overflow matters: if the step sequence cannot fit the scene, the
  pacing is broken even before render.

## Aggregated From

- `calesthio/OpenMontage` `verify_scene_pacing.py`
- `AgriciDaniel/claude-shorts` pacing and cut discipline
- this repo's render/review direction

## Validation Checklist

- Each important narration cue has a nearby visual event.
- Scene duration fits the planned visual sequence.
- Freeze and rush are identified before final publish.
- Fix advice points at script, timing, or visual density correctly.
