# AIA-004 / FMHO — Face/Mouth/Hand/Object Detector

## Reference label

AIA-004 / FMHO — Face/Mouth/Hand/Object Detector

## Classification

| Field | Value |
|---|---|
| Category | AI / Adaptive |
| Family | AI and Adaptive Systems |
| Class | System Module |
| Phase | Pilot first |
| Priority | P0 |
| Evidence grade | Strong practical / direct test needed |
| Status | Backlog |

## Definition

Detect visual regions that should not be covered.

## Mechanism

Automates safe zones.

## Expected direction

Fewer obstruction failures.

## Failure mode

Detection errors in motion/low light.

## Minimum viable experiment

Manual vs CV safe-zone detection.

## Primary metrics

Occlusion errors; readability

## Source IDs

S14; S18; S32

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
