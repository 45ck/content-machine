---
name: highlight-approval-loop
description: Add an explicit review loop to longform clip selection so candidate highlights can be approved, rejected, or regenerated before the rest of the short pipeline proceeds.
---

# Highlight Approval Loop

## Use When

- A longform-to-shorts pipeline selected a candidate clip.
- The selected segment still needs human or agent judgment before
  cropping, captioning, and render.
- The cost of building the rest of the short is high enough that bad
  highlight selection should be stopped early.

## Core Rule

- A candidate highlight is not final just because a model picked it.

## Inputs

- candidate start/end times
- clip transcript excerpt
- duration and hook notes
- optional alternative candidate list

## Outputs

- `approved`, `regenerate`, or `cancel`
- if regenerated:
  new candidate timings and reason

## Loop

1. Present the selected segment with timing and transcript context.
2. Evaluate:
   hook strength, payoff clarity, duration, and editability.
3. Approve if it is clearly usable.
4. Regenerate if the beat is weak, muddled, or cut badly.
5. Cancel if no viable candidate exists without a broader replan.

## What To Check

- Does the clip open cleanly into a strong idea?
- Is the payoff inside the selected window?
- Is the duration usable for the target platform?
- Would snapping, cropping, and captions improve it, or is the segment
  fundamentally weak?

## Pair With

- Use after [`text-selection-to-timestamps`](../text-selection-to-timestamps/SKILL.md)
  and [`boundary-snap`](../boundary-snap/SKILL.md).
- Feed approved clips into [`reframe-vertical`](../reframe-vertical/SKILL.md)
  and [`video-render`](../video-render/SKILL.md).

## Aggregated From

- `SamurAIGPT/AI-Youtube-Shorts-Generator` approval/regenerate loop
- stronger clip-factory review patterns from `OpenMontage`

## Validation Checklist

- Bad candidates can be rejected before downstream work starts.
- Approval criteria are editorial, not just technical.
- Regenerated candidates include a reason.
- Final approval is explicit.
