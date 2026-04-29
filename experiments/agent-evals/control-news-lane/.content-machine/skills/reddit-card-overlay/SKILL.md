---
name: reddit-card-overlay
description: Build Reddit-style post cards and similar social-thread overlays as reusable visual assets so story shorts can show the post, author, votes, and comments cleanly instead of faking everything directly in the timeline.
---

# Reddit Card Overlay

## Use When

- A Reddit story, confession, or thread is part of the short.
- The post itself should appear on screen as a visual beat.
- You need a reusable post-card asset instead of hand-placing every
  text line in the final edit.

## Inputs

- post title or hook text
- username or attribution
- upvote count
- comment count
- optional theme:
  `light`, `dark`, `clean-remix`

## Outputs

- a rendered overlay card image or composition asset
- placement guidance for when it should appear in the short

## Construction Rules

1. Build the card as its own asset first.
2. Keep hierarchy clear:
   title first, attribution second, counts third.
3. Match recognisable Reddit structure without copying platform chrome
   so literally that it becomes distracting.
4. Use the card as a short visual beat, not a full-screen reading wall.
5. Pair it with narration and later visual escalation; do not let the
   whole short become a static screenshot.

## Good Pattern

- 1 opening beat:
  show the question/post card
- narration continues while the card exits
- later beats cut to gameplay, stock, diagrams, or generated scenes
- optional return:
  use comments, verdict, or reaction callouts as secondary overlays

## Bad Pattern

- full post body on screen for too long
- unreadably small counts and metadata
- card treated as the only visual for the entire short
- generic white rectangle with no platform-specific hierarchy

## Pair With

- Use with [`reddit-story-short`](../reddit-story-short/SKILL.md).
- Combine with [`short-form-captions`](../short-form-captions/SKILL.md)
  so narration captions do not collide with the post card.

## Aggregated From

- `RayVentura/ShortGPT` `reddit_short_engine.py`
- `RayVentura/ShortGPT` `build_reddit_image.json`

## Validation Checklist

- The card reads instantly on a phone viewport.
- The text hierarchy is obvious.
- The overlay appears as one planned beat, not filler.
- The rest of the short moves beyond the post screenshot quickly.
