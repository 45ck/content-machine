# VLD-006 / CCD2 — Caption Conflict Detector

## Reference label

VLD-006 / CCD2 — Caption Conflict Detector

## Classification

| Field | Value |
|---|---|
| Category | Visual Load / Clutter |
| Family | Visual Load and Clutter |
| Class | Load-Control Method |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

Detect when too many text layers exist simultaneously.

## Mechanism

Prevents split attention and crowding.

## Expected direction

Higher clarity.

## Failure mode

May suppress useful labels.

## Minimum viable experiment

Conflict detector on/off.

## Primary metrics

Text count; effort; recall

## Source IDs

S10; S15

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
