# VLD-011 / FLCC — Frame-Level Contrast Correction

## Reference label

VLD-011 / FLCC — Frame-Level Contrast Correction

## Classification

| Field | Value |
|---|---|
| Category | Visual Load / Clutter |
| Family | Visual Load and Clutter |
| Class | Load-Control Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong adjacent |
| Status | Backlog |

## Definition

Auto adjust text/backplate contrast per frame.

## Mechanism

Keeps readability stable across video.

## Expected direction

Fewer unreadable moments.

## Failure mode

Style may shift too much.

## Minimum viable experiment

Static style vs auto-correct.

## Primary metrics

WCAG ratio; readability

## Source IDs

S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
