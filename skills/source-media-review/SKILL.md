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

## Analyzer Ownership

- Prefer `@45ck/video-evaluator` for reusable media facts, frame
  sampling, contact sheets, layout safety, source text/OCR evidence, and
  generic video gates when that package is installed or available as a
  built sibling checkout.
- Keep content-machine decisions local: whether the footage fits the
  chosen archetype, whether black gutters are acceptable for a lane, and
  whether the clip should be rejected, cropped, or used as reference.
- Do not remove the existing `source-media-analyze` v1 compatibility
  path until the evaluator emits equivalent source-media signals.

## Review Workflow

Use [`source-media-analyze`](../source-media-analyze/SKILL.md) instead
when you only need duration, orientation, codec, scene changes, silence,
or audio-energy metadata. Use this full review when visual fitness,
caption cleanliness, provenance, or reuse risk affects the plan.

1. Probe the file technically with `ffprobe` or equivalent.
2. Sample representative frames. Do not trust just frame 1.
3. Check for burned-in text, existing captions, watermarks, UI chrome,
   and framing constraints.
4. If audio matters, inspect transcript availability, clarity, and
   whether speech overlaps music or effects.
5. Write a short implication note:
   `use directly`, `use with crop`, `reference only`, or `reject`.

## External Source Intake

For downloaded stock, gameplay, audio, fonts, icons, models, textures,
or generated media, review provenance before visual quality:

- Use
  [`provenance-and-license-gates.md`](../creative-source-scout/references/provenance-and-license-gates.md)
  for copied, downloaded, generated, packaged, or public assets.
- Use
  [`audio-source-policy.md`](../creative-source-scout/references/audio-source-policy.md)
  for music, SFX, ambience, extracted audio, or YouTube-origin audio.
- If provenance fails, stop before frame sampling or render planning.
- source URL and provider are known
- creator/author and license URL are recorded
- license allows the planned public/demo/commercial use
- attribution text is present when required or useful
- file hash and retrieval date are recorded
- audio sources include Content ID risk, certificate or permission
  evidence, and whether the asset is music, SFX, ambience, or extracted
  audio
- YouTube-origin media is direct-use only when ownership, explicit
  permission, official download/export, or compatible license plus
  permitted access is documented; otherwise it is reference-only
- editorial-only, non-commercial, no-derivatives, watermarked, or
  sample-preview assets are rejected for public demos
- recognizable people, brands, copyrighted characters, UI, artwork, or
  property have explicit rights notes or are rejected

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
