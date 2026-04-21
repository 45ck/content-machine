# VLD-010 / BPD — Background Pattern Detector

## Reference label

VLD-010 / BPD — Background Pattern Detector

## Classification

| Field | Value |
|---|---|
| Category | Visual Load / Clutter |
| Family | Visual Load and Clutter |
| Class | Load-Control Method |
| Phase | Explore later |
| Priority | P2 |
| Evidence grade | Moderate adjacent |
| Status | Backlog |

## Definition

Flag stripes, grids, leaves, and high-frequency textures behind text.

## Mechanism

Crowding and contrast risk is high on patterned backgrounds.

## Expected direction

Better readability after repositioning.

## Failure mode

Detector may overflag.

## Minimum viable experiment

Pattern-aware vs fixed placement.

## Primary metrics

Readability; failure rate

## Source IDs

S15; S28

## Proof target

This method should only be promoted if it beats the relevant baseline on the metrics its mechanism predicts. If it improves watch time but reduces comprehension, visual recall, or accessibility, it should be demoted or restricted to a narrower segment.

## Production note

When used in production, document the exact clip context, viewer mode assumption, placement zone, timing strategy, and whether full captions remain available.
