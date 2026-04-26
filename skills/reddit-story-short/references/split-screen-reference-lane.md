# Reddit Story Split-Screen Reference Lane

Use this when the goal is a bread-and-butter Reddit story short that
looks native to TikTok/Reels/Shorts rather than like a generic faceless
explainer.

## Shape

1. Open with a Reddit post card for about `4s` to `5s`.
2. After the opener, switch the top half to story-related video footage.
3. Keep Subway Surfers or similar looping gameplay on the bottom half.
4. Overlay narration captions around the midpoint between the two lanes.
5. End on a judgment or comment-bait beat.

## Layout Rules

- Render target: `1080x1920`
- Split layout: true `50/50`
- Top lane: `1080x960`
- Bottom lane: `1080x960`
- Fit or pad into each lane when needed; do not blindly crop-fill both
  halves
- Captions should overlay between lanes rather than living inside a
  dedicated black band

## Reddit Opener Rules

- Use a screenshot-style post card asset, not hand-drawn fake HTML
- Show:
  - subreddit
  - author
  - age
  - score/upvotes
  - title
  - 1 to 3 awards if they help readability
- Keep footer controls inside the visible card bounds
- The opener should read instantly on a phone viewport

## Caption Rules

- Use the repo's social caption preset, not a generic fallback
- Keep groups short and readable
- Active-word highlighting should emphasize the spoken word without
  moving the whole line around
- If OCR review starts confusing the Reddit opener with captions, bias
  the caption placement slightly into the gameplay side after the opener

## Cut Rhythm

- Top-lane footage after the opener should usually turn over every
  `2s` to `4s`
- Do not let the story sit on one top-lane shot for `8s` to `12s`
- Even if the bottom gameplay is continuous, the top lane needs enough
  variation to avoid a dead-feeling edit

## Reject Conditions

- Silent or near-silent voiceover
- Static fallback background
- Buggy Reddit card layout
- Captions colliding with the opener card
- Cut cadence slow enough to feel like one static composition
