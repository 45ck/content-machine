---
name: source-media-review
description: Audit user-supplied video, audio, image, and gameplay inputs before planning or render so the agent knows what is actually in the media, what quality risks exist, and whether the input is fit for reuse.
---

# Source Media Review

## Use When

- A user provides raw media and wants it reused in a short.
- The plan depends on what is visually or technically present in a
  source file.
- You need to know whether a clip is caption-clean, long enough, sharp
  enough, or even relevant before building the edit around it.

## Core Rule

- Never claim source footage was reviewed unless a real probe ran.
- Do not infer clip quality, text cleanliness, or editorial usefulness
  from filenames or user descriptions alone.

## Inputs

- one or more local media paths
- optional target use:
  `b-roll`, `gameplay`, `talking-head`, `screen-recording`,
  `reaction`, `background`, `reference-only`

## Outputs

- per-file review notes
- technical probe summary:
  duration, resolution, fps, audio presence, codec
- quality risks:
  low resolution, mono audio, short duration, burned-in text, noisy
  audio, weak motion, etc.
- planning implications:
  whether the file is safe for direct use, crop-only use, analysis-only
  use, or rejection

## Review Workflow

1. Probe the file technically with `ffprobe` or equivalent.
2. Sample representative frames. Do not trust just frame 1.
3. Check for burned-in text, existing captions, watermarks, UI chrome,
   and framing constraints.
4. If audio matters, inspect transcript availability, clarity, and
   whether speech overlaps music or effects.
5. Write a short implication note:
   `use directly`, `use with crop`, `reference only`, or `reject`.

## What To Look For

- already-burned captions or persistent source text
- speaker framing that will break vertical crops
- black gutters or letterboxing that must be removed before final
  render
- shots where crop-fill would cut off the actual subject and therefore
  require contained-blur instead
- gameplay HUDs or screen UI that cannot survive heavy bottom captions
- footage that is too short to cover the script beat it is assigned to
- audio drift, clipping, low signal, or music-dominated audio
- visual repetition that will turn the final short into a slideshow

## Pair With

- Run before [`faceless-mixed-short`](../faceless-mixed-short/SKILL.md),
  [`longform-to-shorts`](../longform-to-shorts/SKILL.md), or
  [`reframe-vertical`](../reframe-vertical/SKILL.md).
- Feed rejected text-heavy footage into
  [`reverse-engineer-winner`](../reverse-engineer-winner/SKILL.md) as a
  reference input instead of a render input.

## Aggregated From

- `calesthio/OpenMontage` `source_media_review.py`
- `youtube-clip` source probing and crop assumptions
- this repo's own burned-in text guard and validate stack

## Validation Checklist

- Every source file has a real probe summary.
- Caption-clean vs reference-only is explicit.
- Files marked for direct use are technically compatible with the
  planned output.
- Any file with gutters has an explicit `crop-fill` or
  `contained-blur` plan.
- Rejected files include a concrete reason, not a vague dislike.
