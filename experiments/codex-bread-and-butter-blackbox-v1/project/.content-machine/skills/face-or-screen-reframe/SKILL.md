---
name: face-or-screen-reframe
description: Reframe horizontal footage for 9:16 by branching early between face-led video and screen-recording video, using stable face-centered crops for one case and smoothed motion-following crops for the other.
---

# Face Or Screen Reframe

## Use When

- The source footage is either a talking-head style clip or a screen
  recording.
- One generic portrait crop keeps failing because the subject type is
  different.
- You need a concrete branching rule before building a 9:16 crop.

## Core Rule

- Decide what kind of source you have first.
- Face video and screen video should not share the same crop logic.

## Inputs

- source video
- target portrait dimensions
- optional safe-zone or caption-lane constraints

## Outputs

- chosen source classification:
  `face-led` or `screen-led`
- crop strategy notes
- stable portrait crop or crop-keyframe plan

## Workflow

1. Sample the early part of the clip and check for a stable face.
2. If a face is found, choose one stable face-centered crop rather than
   hyperactive per-frame tracking.
3. If no face is found, treat the clip as screen-led footage and follow
   the moving area instead.
4. Smooth screen-led crop movement heavily and update it at a controlled
   interval.
5. Clamp the crop to source bounds and preserve room for captions.

## Face-Led Pattern

- detect faces in the opening sample window
- pick the strongest or largest face
- use a stable central crop with slight bias if needed
- prefer calm framing over twitchy precision

## Screen-Led Pattern

- resize if needed so the crop has room to move
- estimate the area of strongest motion or cursor activity
- update the crop slowly, not every frame
- fall back to a readable centered crop if motion confidence is weak

## Bad Pattern

- one portrait crop heuristic for every source type
- chasing every face box change in a talking-head clip
- following noisy motion every frame in a screen recording
- forgetting caption safe zones when choosing the crop window

## Pair With

- Use as a concrete sub-strategy under
  [`reframe-vertical`](../reframe-vertical/SKILL.md).
- Use with [`longform-to-shorts`](../longform-to-shorts/SKILL.md) when
  extracting portrait clips from wider source video.

## Aggregated From

- `SamurAIGPT/AI-Youtube-Shorts-Generator` `Components/FaceCrop.py`
- source-type-specific reframe patterns from clipper repos

## Validation Checklist

- The source is explicitly classified before crop logic is chosen.
- Face-led crops stay calm and readable.
- Screen-led crops follow the area of attention without jitter.
- Crop bounds and caption-safe areas are preserved throughout.
