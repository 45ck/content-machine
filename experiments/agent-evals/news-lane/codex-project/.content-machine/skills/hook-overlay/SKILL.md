---
name: hook-overlay
description: Turn a short's opening hook into its own styled visual asset or overlay card so the first beat lands as designed typography, not as an afterthought subtitle.
---

# Hook Overlay

## Use When

- The short opens with a strong claim, POV, quote, or challenge line.
- The opening words need more presence than normal captions can give.
- You want a reusable hook card or overlay that can be rendered,
  positioned, and revised independently from the subtitle track.

## Core Rule

- Treat the hook as a designed object.
- Do not dump the hook into the caption lane and pretend that solves the
  opening beat.

## Inputs

- hook text
- target video dimensions
- desired placement:
  `top`, `center`, or `bottom`
- optional style:
  `clean-box`, `serif-card`, `bold-banner`, `comment-card`

## Outputs

- one hook overlay asset:
  image, SVG, or composition fragment
- placement notes for the opening beat
- optional timing notes for when the hook enters and exits

## Construction Rules

1. Measure the hook for phone readability first.
2. Wrap by visual width, not just character count.
3. Give the hook its own padding, corner radius, shadow, and contrast.
4. Position it intentionally against safe zones and platform chrome.
5. Let the hook leave before the normal caption rhythm fully takes over.

## Good Pattern

- open with a dedicated hook card for the first beat
- let narration and captions continue underneath or after it
- use the hook to frame the story, not to replace the whole caption
  system

## Bad Pattern

- giant multiline subtitle pretending to be a hook
- center overlay with no padding or hierarchy
- hook card that blocks the subject's face or critical gameplay HUD
- using the same heavy hook treatment throughout the whole short

## Pair With

- Use with [`short-form-captions`](../short-form-captions/SKILL.md) so
  hook overlay and caption lane do not compete.
- Use with [`reddit-card-overlay`](../reddit-card-overlay/SKILL.md) when
  the opening beat is a social-post frame rather than a generic quote.

## Aggregated From

- `mutonby/openshorts` `hooks.py`
- `mutonby/openshorts` hook verification scripts
- common creator-style opening typography patterns

## Validation Checklist

- The hook reads instantly on a phone-sized viewport.
- Overlay position respects faces, UI, and platform chrome.
- The hook looks like a designed first beat, not a repurposed subtitle.
- The hook exits cleanly into the main caption/edit rhythm.
