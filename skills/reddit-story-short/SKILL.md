---
name: reddit-story-short
description: Turn a Reddit-style post, confession, text thread, or comment story into a strong faceless short with narration, on-screen text rhythm, captions, visual support, and payoff.
---

# Reddit Story Short

## Use When

- The source is a Reddit post, confession, AITA-style story, text
  thread, or comment chain.
- The short should be driven by narration and staged reveals rather than
  informational explanation.
- The visual layer supports the story instead of carrying the full
  meaning.

## Core Approach

1. Choose the exact Reddit-story archetype before rendering:
   `reddit-post-over-gameplay` or `reddit-story-split-screen`.
2. Open with the conflict fast, but still use a recognizable Reddit
   thread card in the first beat.
3. Compress the story into setup, escalation, twist, and payoff.
4. Use on-screen text selectively for high-drama phrases and receipts,
   not for every sentence.
5. Pair the narration with the selected visual mode. For
   `reddit-post-over-gameplay`, that means gameplay, Reddit/card
   overlays, and captions only. For `reddit-story-split-screen`, support
   footage, UI mockups, receipts, or generated scenes may appear in the
   top lane when they are story-relevant.
6. End on judgment, reveal, or unresolved tension that invites comment.

## Archetype Names

- `reddit-post-over-gameplay`: the classic pattern. Full-screen
  gameplay starts immediately, a Reddit post card/SVG sits over it for
  the first `3s` to `5s`, then captions continue over the gameplay.
  This mode has no random clips, no stock B-roll, and no top lane.
- `reddit-story-split-screen`: hybrid story-support pattern. Reddit
  card opens the short, then story-related footage/receipts run on the
  top half while gameplay runs on the bottom half.
- `gameplay-confession-split`: non-Reddit storytime pattern. No Reddit
  card unless the source is actually Reddit-native; use support footage
  or receipts on top and gameplay below.

## Inputs

- post, thread, or story text
- optional subreddit/context
- desired tone:
  `dramatic`, `deadpan`, `funny`, `sympathetic`, `chaotic`

## Outputs

- story-shaped `script.json`
- voiceover + captions
- visual plan and final short

## Optional Runtime Surface

- Build on [`faceless-mixed-short`](../faceless-mixed-short/SKILL.md)
  for execution.
- Use [`short-form-captions`](../short-form-captions/SKILL.md) for
  aggressive story caption styling.
- Use
  [`references/split-screen-reference-lane.md`](references/split-screen-reference-lane.md)
  when you need the exact opener/top-lane/gameplay/caption recipe.
- Use
  [`../reddit-post-over-gameplay-short/SKILL.md`](../reddit-post-over-gameplay-short/SKILL.md)
  when the desired output is the classic Reddit card over full-screen
  gameplay format.

## Example Request

- [`examples/request.json`](examples/request.json)

## Technical Notes

- Story shorts need stronger pacing control than explainers because the
  viewer is waiting for the turn.
- Default visual shape for generic "Reddit story" requests should be
  `reddit-post-over-gameplay` unless the user asks for story footage,
  stock footage, receipts, or a split-screen lane.
- In `reddit-post-over-gameplay`, do not add unrelated support clips to
  "make it more dynamic." The dynamism comes from gameplay motion,
  active captions, the opener card, and optional comment/verdict
  overlays.
- Use `reddit-story-split-screen` when the story needs support footage
  after the opener:
  title/post card first with upvotes/awards, then story-related support
  footage on top with moving gameplay below.
- The opener Reddit card should be a controlled template asset, not a
  fake HTML sketch. Use fixed slots for title, author, counts, awards,
  and footer so the card reads like a screenshot instead of a mockup.
- Preferred split-screen layout is true `50/50` vertical stacking:
  top lane `960px`, bottom lane `960px` in a `1080x1920` render.
- In split-screen Reddit lanes, both top and bottom media should be fit
  into their half with containment or padded framing when needed. Do not
  crop-fill them so aggressively that core visual content is cut off.
- Captions should overlay at the midpoint between the two lanes instead
  of requiring a dedicated black caption band. Use strong stroke,
  shadow, and active-word highlighting so the seam overlay stays
  readable.
- Receipts, text messages, Reddit cards, and post fragments work better
  than generic themed illustrations.
- Do not fall back to generic AI story illustrations when a Reddit card
  or comment card would carry the beat more honestly.
- Background gameplay can help, but only if it does not trivialize the
  story tone.

## Mode Selection

- User says "Reddit story", "AITA video", "Subway Surfers Reddit", or
  "like the ones on TikTok":
  choose `reddit-post-over-gameplay`.
- User says "with footage", "with receipts", "stock footage", "top and
  bottom", or "split screen":
  choose `reddit-story-split-screen`.
- User gives a confession/storytime but not a Reddit post:
  choose `gameplay-confession-split`.
- If in doubt, choose the simpler mode. Do not add extra video layers
  without a reason.

## Aggregated From

- `raga70/FullyAutomatedRedditVideoMakerBot`
- `RayVentura/ShortGPT` reddit/story patterns
- this repo's faceless short, gameplay, and caption stack

## Validation Checklist

- The first line exposes the conflict fast.
- The middle does not wander or repeat setup.
- The payoff lands clearly.
- Visual support matches the tone and does not look accidental.
- Pure gameplay mode contains only gameplay, Reddit/card overlays, and
  captions.
- The short invites reaction without relying on bait-only wording.
