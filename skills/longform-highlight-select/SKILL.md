---
name: longform-highlight-select
description: Select candidate short-form moments from word-level timestamps by scoring hook strength, coherence, payoff, silence risk, filler risk, and boundary quality before clipping or reframing.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: '{"timestampsPath":"output/content-machine/audio/timestamps.json","outputPath":"output/content-machine/highlights/highlight-candidates.v1.json","sourceMediaPath":"input/source.mp4","sourceAnalysisPath":"output/content-machine/highlights/source-media-analysis.v1.json","minDuration":20,"targetDuration":35,"maxDuration":60,"maxCandidates":5,"minGapSeconds":3}'
entrypoint: node --import tsx scripts/harness/longform-highlight-select.ts
inputs:
  - name: timestampsPath
    description: Word-level timestamps from the source transcript or ASR pass.
    required: true
  - name: outputPath
    description: Path that will receive highlight-candidates.v1.json.
    required: false
  - name: sourceMediaPath
    description: Optional source video/audio path for provenance.
    required: false
  - name: sourceAnalysisPath
    description: Optional source-media-analysis.v1.json artifact for audio energy, silence, and scene-change scoring.
    required: false
  - name: minDuration
    description: Minimum candidate duration in seconds.
    required: false
  - name: targetDuration
    description: Preferred candidate duration in seconds.
    required: false
  - name: maxDuration
    description: Maximum candidate duration in seconds.
    required: false
  - name: minGapSeconds
    description: Minimum spacing between accepted candidate spans.
    required: false
  - name: sourceDuration
    description: Optional source duration when already known.
    required: false
outputs:
  - name: highlight-candidates.v1.json
    description: Ranked candidate clips with timing, text, score breakdown, signals, and approval status.
---

# Longform Highlight Select

## Use When

- The user has a podcast, talk, interview, screen recording, or long
  YouTube transcript and wants candidate shorts before clipping.
- The next step needs actual candidate timestamps instead of a vague
  list of interesting moments.
- You need to avoid polishing weak excerpts with captions and render
  effects.

## What This Skill Owns

- Transcript/timestamp-driven candidate selection.
- Hook, coherence, payoff, boundary, silence-risk, and filler-risk
  scoring.
- Optional media-signal scoring when paired with
  `source-media-analysis.v1.json`.
- The first deterministic artifact before approval, clipping,
  reframing, and final render.

## Invocation

```bash
cat skills/longform-highlight-select/examples/request.json | \
  node --import tsx scripts/harness/longform-highlight-select.ts
```

## Output Contract

- Reads an existing `timestamps.json` artifact.
- Optionally reads `source-media-analysis.v1.json` to fill candidate
  `audioEnergyScore`, `sceneChangeScore`, and measured silence overlap.
- Writes `highlight-candidates.v1.json`.
- Each candidate contains:
  `start`, `end`, `duration`, `text`, `wordStartIndex`,
  `wordEndIndex`, `scores`, `signals`, `sourceSignals`,
  `rejectionReasons`, `approval`, and `approvalNotes`.
- `approval` starts as `pending` so a later approval loop can accept,
  reject, or regenerate candidates without changing the scoring step.
- This version combines transcript timing with measured source-level
  audio/scene metadata when provided. It does not claim face tracking,
  crop confidence, or visual salience.

## Pair With

- Use before [`boundary-snap`](../boundary-snap/SKILL.md) when the
  candidate needs tighter cut points.
- Use after [`source-media-analyze`](../source-media-analyze/SKILL.md)
  when source audio energy, silence gaps, and scene-change density are
  available.
- Use before [`reframe-vertical`](../reframe-vertical/SKILL.md) and
  [`scene-aware-smart-crop`](../scene-aware-smart-crop/SKILL.md) when
  the source is not portrait-ready.
- Use before [`video-render`](../video-render/SKILL.md) once a clip is
  approved and converted into render inputs.

## Validation Checklist

- `highlight-candidates.v1.json` exists.
- At least one candidate is returned for a viable transcript.
- The top candidate starts on a plausible hook, not a filler lead-in.
- Candidate boundaries do not cut through obvious sentence endings when
  a cleaner boundary is available.
- Warnings are explicit when no candidate meets duration and word-count
  limits.
