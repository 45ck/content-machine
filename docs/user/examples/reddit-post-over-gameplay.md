# Reddit Post Over Gameplay

Status: `golden showcase`

This is the default Reddit story mode for generic "Reddit story",
"AITA video", or "Subway Surfers Reddit" requests.

Use this as the default Reddit/story visual lane. The tracked demo is
promoted because the current render passes publish-prep, including OCR
caption-sync on the boxed phrase-caption treatment.

Tracked preview clip:

- [demo-9-reddit-post-over-gameplay.mp4](../../demo/demo-9-reddit-post-over-gameplay.mp4)

<p align="center">
  <video src="../../demo/demo-9-reddit-post-over-gameplay.mp4" controls muted playsinline loop width="280"></video>
</p>

## Runnable Request

Ask an installed agent:

```text
Use Content Machine from .content-machine to make a
reddit-post-over-gameplay short from this story. Keep gameplay
full-screen, show a Reddit opener card for 3-5 seconds, continue
captions directly over gameplay, write artifacts under
runs/reddit-story-demo, and only call it ready if publish-prep passes.
```

Command form:

```bash
cat <<'JSON' | npx --no-install cm-agent run-flow
{
  "flowsDir": ".content-machine/flows",
  "flow": "generate-short",
  "runId": "reddit-story-demo",
  "input": {
    "topic": "AITA-style story about a roommate hiding a fake job offer",
    "laneId": "reddit-post-over-gameplay",
    "publishPrep": { "enabled": true, "platform": "tiktok" }
  }
}
JSON
```

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
- [`motion-design-coder`](../../../skills/motion-design-coder/SKILL.md)
- [`short-form-captions`](../../../skills/short-form-captions/SKILL.md)
- [`publish-prep-review`](../../../skills/publish-prep-review/SKILL.md)

Use `motion-design-coder` for the Reddit opener card animation only:
card entrance, slight scale/settle, award/upvote emphasis, and clean
exit back to gameplay. Do not add random motion layers or stock clips.

## Current Proving Run

- Embedded demo MP4:
  `docs/demo/demo-9-reddit-post-over-gameplay.mp4`
- Local full-quality proving MP4:
  `experiments/proving-wave-3/reddit-post-over-gameplay/outputs/final/video.mp4`

Review status:

- passed: resolution, duration, format, cadence, audio signal,
  OCR caption-sync

The visual mode is correct: the render contains only gameplay, a Reddit
opener card, boxed phrase captions, and audio. This is the default
story/gameplay example to copy first.

## Reject Rules

- reject any random B-roll, stock clip, receipt lane, or generated scene
- reject black gutters or boxed gameplay
- reject a buggy fake Reddit card
- reject silent or music-only output when narration is expected
- reject captions outside social safe zones
