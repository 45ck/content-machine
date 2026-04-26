---
name: text-message-drama-short
description: Turn chat logs, DMs, iMessage-style arguments, or receipt-heavy reveal stories into a short that uses message bubbles, timestamps, and receipts as the main visual grammar instead of generic footage.
---

# Text Message Drama Short

## Use When

- The source is a text thread, DM exchange, breakup chat, scam message,
  or receipt-heavy reveal.
- The strongest visual grammar is chat UI, not Reddit cards or pure
  stock footage.
- The story depends on staged message reveals, not just narration over
  unrelated b-roll.

## Core Approach

1. Start with the most inflammatory or suspicious message, not with a
   generic intro.
2. Reduce the thread to the essential exchange beats.
3. Choose the reveal mode early:
   `thread-log` for a persistent app-like conversation stack or
   `floating-reveal` for one message/receipt beat at a time.
4. Use message cards, cropped receipts, typing pauses, and reaction
   beats as the top-lane structure.
5. Let narration explain what the messages imply, not just read every
   bubble verbatim.
6. Keep captions readable without competing with the message UI.

## Inputs

- chat transcript or manually selected message beats
- optional sender roles or visual identities
- optional screenshots or receipt crops
- optional gameplay or support-footage preference for the lower lane
- optional reveal mode:
  `thread-log`, `floating-reveal`

## Outputs

- message-shaped `script.json`
- ordered beat list for message reveals
- final short plan using chat UI as the main visual system

## Optional Runtime Surface

- Pair with [`hook-overlay`](../hook-overlay/SKILL.md) for the opener.
- Pair with [`short-form-captions`](../short-form-captions/SKILL.md)
  for caption treatment.
- Borrow lower-lane gameplay or mixed footage support from
  [`gameplay-confession-short`](../gameplay-confession-short/SKILL.md)
  when the lane needs extra motion.
- Use [`references/lane-shape.md`](references/lane-shape.md) for the
  exact receipt/message sequence rules.

## Example Request

- [`examples/request.json`](examples/request.json)

## Technical Notes

- The message UI is the visual asset. Do not replace it with generic
  AI-generated drama illustrations.
- `thread-log` is better when the viewer needs to understand the running
  conversation state.
- `floating-reveal` is better when one incriminating line at a time is
  the whole point.
- Use sender contrast, time jumps, and selective zooms to keep the chat
  lane moving.
- A message lane can still use bottom gameplay, but the chat beats have
  to remain the main identity.
- If the original screenshots are noisy, rebuild them as controlled
  assets rather than shipping unreadable crops.

## Aggregated From

- `receptron/mulmocast-claude-plugin`
- `dr34ming/shorts-project`
- `1Dengaroo/rshorts`
- `xhongc/ai_story`
- this repo's Reddit card, hook overlay, and caption stack

## Validation Checklist

- The first visible message creates immediate curiosity or tension.
- The message sequence is legible on mobile without pausing.
- Narration adds interpretation instead of duplicating every bubble.
- Captions and message UI do not fight for the same part of the frame.
- The reveal/payoff is visible in the message flow, not only in the
  voiceover.
