---
name: boundary-snap
description: Refine proposed clip boundaries to natural cut points by snapping to word edges, sentence ends, pauses, and silence so shorts never start or end in awkward places.
---

# Boundary Snap

## Use When

- A clip has already been selected, but the cut points still feel rough.
- The source came from transcript selection, AI clip selection, or human
  approval and now needs clean editorial trimming.
- The agent has proposed timestamps but should not trust them as final.

## Core Approach

1. Start from word-level timing, not frame guesses.
2. Snap starts to word boundaries and, when possible, sentence starts.
3. Snap ends to complete phrases or sentence endings, not abrupt stops.
4. Prefer nearby silence points when they improve the cut naturally.
5. Keep the snapped clip within the intended editorial window. Do not
   drift into a different idea just because the next sentence is cleaner.

## Inputs

- proposed clip start/end times
- word-level transcript or timestamp units
- optional audio/video path for silence detection
- optional target duration constraints

## Outputs

- adjusted clip start/end times
- rationale for any meaningful expansion or contraction

## Optional Runtime Surface

- Use after [`longform-to-shorts`](../longform-to-shorts/SKILL.md)
  candidate selection.
- Feed cleaned clip ranges into [`reframe-vertical`](../reframe-vertical/SKILL.md)
  and [`video-render`](../video-render/SKILL.md).

## Technical Notes

- Silence detection helps, but should not override obvious semantic
  boundaries.
- Sentence completion is usually worth a short extension if it stays
  within the desired clip range.
- Avoid mid-word and mid-breath cuts unless the style explicitly wants
  an interrupt effect.

## Aggregated From

- `AgriciDaniel/claude-shorts` `snap_boundaries.py`
- `iDoust/youtube-clip` subtitle/trim heuristics
- `mutonby/openshorts` clip-selection constraints

## Validation Checklist

- No cut starts or ends inside a word.
- The clip opens on a clean phrase and lands on a clean payoff.
- Silence usage improves the cut instead of making it feel delayed.
- Final timing still matches the selected idea, not a neighboring one.
