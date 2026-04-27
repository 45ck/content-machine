# Reddit Post Over Gameplay

Status: `golden showcase`

This is the default Reddit story mode for generic "Reddit story",
"AITA video", or "Subway Surfers Reddit" requests.

Tracked preview clip:

- [demo-9-reddit-post-over-gameplay.mp4](../../demo/demo-9-reddit-post-over-gameplay.mp4)

<p align="center">
  <video src="../../demo/demo-9-reddit-post-over-gameplay.mp4" controls muted playsinline loop width="280"></video>
</p>

## Shape

- full-screen gameplay from frame one
- Reddit post card over gameplay for the first `3s` to `5s`
- no top lane, no stock footage, no generated story-support clips
- narration captions continue over gameplay after the opener
- gameplay may jump-cut to keep cadence, but it stays the only video
  background

## Use These Skills

- [`reddit-post-over-gameplay-short`](../../../skills/reddit-post-over-gameplay-short/SKILL.md)
- [`reddit-card-overlay`](../../../skills/reddit-card-overlay/SKILL.md)
- [`short-form-captions`](../../../skills/short-form-captions/SKILL.md)
- [`publish-prep-review`](../../../skills/publish-prep-review/SKILL.md)

## Current Proving Run

- Embedded demo MP4:
  `docs/demo/demo-9-reddit-post-over-gameplay.mp4`
- Local full-quality proving MP4:
  `experiments/proving-wave-3/reddit-post-over-gameplay/outputs/final/video.mp4`

Review status:

- passed: resolution, duration, format, cadence, audio signal
- failed: OCR caption-sync gate still reports drift on active-word ASS
  captions

The visual mode is correct: the render contains only gameplay, a Reddit
opener card, captions, and audio. The remaining work is evaluator and
caption-render polish, not archetype routing.

## Reject Rules

- reject any random B-roll, stock clip, receipt lane, or generated scene
- reject black gutters or boxed gameplay
- reject a buggy fake Reddit card
- reject silent or music-only output when narration is expected
- reject captions outside social safe zones
