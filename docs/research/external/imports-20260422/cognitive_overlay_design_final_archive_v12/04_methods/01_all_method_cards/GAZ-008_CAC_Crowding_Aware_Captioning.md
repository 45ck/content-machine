# GAZ-008 / CAC — Crowding-Aware Captioning

## Reference label

GAZ-008 / CAC — Crowding-Aware Captioning

## Classification

| Field | Value |
|---|---|
| Category | Placement / Gaze |
| Family | Placement and Gaze |
| Class | Placement Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong adjacent |
| Status | Backlog |

## Definition

Avoid placing text near other text, UI, or high-frequency background.

## Mechanism

Reduces peripheral clutter interference.

## Expected direction

Better readability.

## Failure mode

May force bland layouts.

## Minimum viable experiment

Crowded vs uncrowded placement.

## Primary metrics

Readability; effort

## Source IDs

S15; S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
