---
name: reddit-post-over-gameplay-short
description: Create the classic Reddit-story format where a Reddit post card appears over full-screen gameplay first, then the card leaves and narration captions continue directly over the gameplay.
---

# Reddit Post Over Gameplay Short

This is the default Reddit story mode.

## Use When

- The user asks for the familiar TikTok/Reels Reddit-story format.
- The story identity should come from the Reddit post card, not from
  stock footage or a separate top lane.
- You want one continuous full-screen gameplay background with a Reddit
  post opener and bold narration captions.

## Pattern Name

Use `reddit-post-over-gameplay` for this archetype.

Default variant: `full-gameplay-card`.

Do not confuse it with:

- `reddit-story-split-screen`: Reddit card opener, then story support
  footage on top and gameplay on bottom.
- `gameplay-confession-split`: non-Reddit storytime with support
  footage on top and gameplay on bottom.

## Core Shape

1. Use full-screen gameplay as the background from frame one.
2. Place the Reddit post card over the gameplay for the first `3s` to
   `5s`.
3. The opener card should show title, subreddit/author, upvotes,
   comments, and optional awards.
4. After the opener, remove or shrink the card.
5. Continue the narration with bold, two-line captions over gameplay.
6. End on judgment bait, comments prompt, or unresolved tension.

## Hard Boundary

No random stock clips, no story-support B-roll, no top-lane footage.

The only visual layers are:

- full-screen gameplay
- opening Reddit card/post overlay
- narration captions
- optional comments/verdict overlay near the end
- optional lightweight engagement stickers that do not change the
  underlying format

If the plan needs receipts, stock footage, screenshots, or generated
scenes, switch to `reddit-story-split-screen` or
`gameplay-confession-split`.

## Visual Rules

- Render `1080x1920`, `9:16`.
- Gameplay should be full-bleed. If the gameplay source has black
  gutters, crop the useful center or build a blurred gameplay fill. Do
  not leave plain side gutters.
- Keep the Reddit card inside the social safe box; do not cover the
  right-side platform action column or bottom caption area.
- The card is a hook asset, not a reading wall. Show the title and
  enough metadata to establish "this is a Reddit post"; narration
  carries the body.
- Captions can sit center-lower after the card leaves, but keep them
  above platform caption chrome.

## Pair With

- Use [`reddit-card-overlay`](../reddit-card-overlay/SKILL.md) to build
  the opener card asset.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) for
  karaoke or active-word caption styling.
- Use [`video-render`](../video-render/SKILL.md) or a lane-local FFmpeg
  assembly only if it exports caption sidecars and review artifacts.

## Proven Example

- User docs:
  [`docs/user/examples/reddit-post-over-gameplay.md`](../../docs/user/examples/reddit-post-over-gameplay.md)
- Embedded preview:
  [`docs/demo/demo-9-reddit-post-over-gameplay.mp4`](../../docs/demo/demo-9-reddit-post-over-gameplay.mp4)
- Proving run:
  [`experiments/proving-wave-3/reddit-post-over-gameplay`](../../experiments/proving-wave-3/reddit-post-over-gameplay)

## Reject Conditions

- Reddit card is buggy, HTML-looking, or has controls outside bounds.
- Full-screen gameplay has black gutters.
- Any unrelated stock, B-roll, support clip, or top-lane footage appears
  in this mode.
- The post body stays on screen too long and becomes unreadable.
- Captions collide with the opener card or platform UI safe zones.
- The video has no voiceover or no audible background/retention audio.

## Example Request

- [`examples/request.json`](examples/request.json)
