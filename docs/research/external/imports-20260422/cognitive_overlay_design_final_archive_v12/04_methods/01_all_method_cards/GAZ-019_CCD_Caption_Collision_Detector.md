# GAZ-019 / CCD — Caption Collision Detector

## Reference label

GAZ-019 / CCD — Caption Collision Detector

## Classification

| Field | Value |
|---|---|
| Category | Placement / Gaze |
| Family | Placement and Gaze |
| Class | Placement Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

Detect overlap with native captions, stickers, captions, and UI.

## Mechanism

Prevents clutter stacking.

## Expected direction

Higher readability.

## Failure mode

False positives could restrict layout.

## Minimum viable experiment

Manual vs auto collision check.

## Primary metrics

Collision count; readability

## Source IDs

S15; S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
