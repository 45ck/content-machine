---
name: text-selection-to-timestamps
description: Recover exact clip timestamps by matching model-selected transcript text back onto the source word timeline instead of asking the model to guess timestamps directly.
---

# Text Selection To Timestamps

## Use When

- An LLM has identified the best text span but should not be trusted to
  output precise timestamps.
- You need exact clip ranges from transcript text selections.
- The source transcript already has word-level timings.

## Core Approach

1. Let the model choose text, not timestamps.
2. Normalize source words and selected words consistently.
3. Search near the expected time first if any approximate location is
   known.
4. Match contiguous word sequences back to the transcript.
5. Convert the recovered span into one or more keep ranges.

## Inputs

- source transcript words with start/end times
- selected/refined words or text span
- optional approximate start time
- total duration for clamping

## Outputs

- exact keep ranges
- recovered duration
- confidence notes when matching is ambiguous

## Optional Runtime Surface

- Use under [`longform-to-shorts`](../longform-to-shorts/SKILL.md).
- Pair with [`boundary-snap`](../boundary-snap/SKILL.md) after recovery.

## Technical Notes

- Common words should not be matched globally without locality checks.
- Text normalization matters more than fuzzy prose reasoning.
- Multi-range recovery is acceptable if the selected text is not
  contiguous in the original transcript, but that should usually be a
  warning for clip quality.

## Aggregated From

- `imgly/videoclipper` `keepRanges.ts`
- `imgly/videoclipper` transcript normalization path
- this repo's transcript/timestamp artifacts

## Validation Checklist

- Recovered ranges map to real source words.
- The matched span is in the intended transcript neighborhood.
- Duration is plausible for the selected text.
- Ambiguous or fragmented matches are surfaced, not hidden.
