# Reddit Story Split-Screen

Status: `tracked showcase`

This is the strongest current split-screen story-lane example in the
repo. It is a showcase for the hybrid split-screen mode, not the
default for every Reddit request.

This page is for the `reddit-story-split-screen` archetype:

- `5s` Reddit opener card with upvotes/awards
- story-related footage on the top half after the opener
- Subway Surfers gameplay on the bottom half
- captions overlaid near the midpoint between lanes

For the more common Reddit format where the Reddit post card appears
over full-screen gameplay and then captions continue over gameplay, use
`reddit-post-over-gameplay`:

- [`skills/reddit-post-over-gameplay-short/SKILL.md`](../../../skills/reddit-post-over-gameplay-short/SKILL.md)

Tracked preview clip:

- [demo-8-reddit-story-split-screen.mp4](../../demo/demo-8-reddit-story-split-screen.mp4)

<p align="center">
  <video src="../../demo/demo-8-reddit-story-split-screen.mp4" controls muted playsinline loop width="280"></video>
</p>

The isolated empty-project Codex evaluation scaffold is:

- [`experiments/codex-reddit-story-empty-project-v1/README.md`](../../../experiments/codex-reddit-story-empty-project-v1/README.md)

Quick ingredients:

- [`skills/reddit-story-short/SKILL.md`](../../../skills/reddit-story-short/SKILL.md)
- [`skills/reddit-post-over-gameplay-short/SKILL.md`](../../../skills/reddit-post-over-gameplay-short/SKILL.md)
- [`skills/reddit-card-overlay/SKILL.md`](../../../skills/reddit-card-overlay/SKILL.md)
- [`skills/short-form-captions/SKILL.md`](../../../skills/short-form-captions/SKILL.md)

## Runtime Pattern

1. Generate a Reddit opener asset.
2. Generate or write the story script.
3. Generate audio and timestamps.
4. Build a top-lane video plan from real motion clips.
5. Keep gameplay on the bottom half.
6. Render `1080x1920` with a true `50/50` split.
7. Export captions and run review.

## Reddit Opener Asset

```bash
cat skills/reddit-card-overlay/examples/request.json | \
  node --import tsx scripts/harness/reddit-story-assets.ts
```

The opener should be a screenshot-style card, not fake HTML chrome.

## Story Lane Rules

- opener lasts about `4s` to `5s`
- top-lane footage should turn over every `2s` to `4s`
- default to full-bleed lanes; if a source has black gutters, crop the
  useful center or use a blurred/motion fill
- use contained/padded framing only when crop-fill would cut off the
  Reddit card, receipt, face, or key subject
- captions should not need a dedicated black seam band

## Codex / Claude Project Shape

In an installed skill pack, the same lane should be described to the
agent in roughly this form:

- lane: `reddit-story-split-screen`
- render: `1080x1920`
- opener: Reddit card first
- top lane: story-related moving footage
- bottom lane: Subway Surfers gameplay
- captions: midpoint overlay with active-word highlighting
- reject static backgrounds, silent audio, and buggy Reddit cards

See also:

- [`skills/reddit-story-short/examples/split-screen-request.json`](../../../skills/reddit-story-short/examples/split-screen-request.json)
- [`skills/reddit-post-over-gameplay-short/examples/request.json`](../../../skills/reddit-post-over-gameplay-short/examples/request.json)
- [`skills/reddit-story-short/references/split-screen-reference-lane.md`](../../../skills/reddit-story-short/references/split-screen-reference-lane.md)
