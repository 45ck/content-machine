---
name: reddit-card-overlay
description: Build Reddit-style post cards and similar social-thread overlays as reusable visual assets so story shorts can show the post, author, votes, and comments cleanly instead of faking everything directly in the timeline.
allowedTools:
  - shell
  - read
  - write
model: inherit
argumentHint: >-
  {"outputDir":"output/reddit-assets","theme":"reddit-light","title":"AITA
  for cancelling my sister's free wedding photos two days before the
  event?","author":"throwra_photographer","upvotes":"24.8k","commentCount":"3.6k","awards":["Gold","Wholesome"],"cards":[{"id":"opener","kind":"post","label":"Original
  Post","body":"My sister kept rewriting the deal and calling me
  selfish, so I backed out two days before the wedding."}]}
entrypoint: node --import tsx scripts/harness/reddit-story-assets.ts
inputs:
  - name: outputDir
    description: Directory that will receive the generated Reddit card assets.
    required: true
  - name: title
    description: The post title or hook shown on the Reddit card.
    required: true
  - name: cards
    description: One or more post/comment/update card payloads to render.
    required: true
  - name: theme
    description: Visual style for the rendered card, usually reddit-light or reddit-dark.
    required: false
  - name: upvotes
    description: Display score for the main card.
    required: false
  - name: commentCount
    description: Comment count shown in the footer.
    required: false
outputs:
  - name: opener.png
    description: Screenshot-style Reddit card PNG for timeline use.
  - name: opener.svg
    description: Editable SVG version of the Reddit card.
  - name: manifest.json
    description: Asset manifest with generated card paths.
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

## Optional Runtime Surface

- Repo-side runner:
  `node --import tsx scripts/harness/reddit-story-assets.ts`
- Packaged runner after install:
  `node ./node_modules/@45ck/content-machine/agent/run-tool.mjs reddit-story-assets`

## Example Request

- [`examples/request.json`](examples/request.json)

## Construction Rules

1. Build the card as its own asset first.
2. Prefer a fixed-slot screenshot/template layout over freehand fake
   platform chrome. A believable post card is usually one background
   template plus a few controlled text slots.
3. Keep hierarchy clear:
   title first, attribution second, counts third.
4. Match recognisable Reddit structure without copying platform chrome
   so literally that it becomes distracting.
5. Keep all footer/meta controls inside the visible card bounds; broken
   alignment reads instantly as fake.
6. Use the card as a short visual beat, not a full-screen reading wall.
7. Pair it with narration and later visual escalation; do not let the
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
- custom SVG/HTML chrome with drifting controls, overflowed text, or
  footer elements hanging outside the card

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
